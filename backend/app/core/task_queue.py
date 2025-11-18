"""Celery task queue configuration and tasks."""

import asyncio
from datetime import datetime
from typing import Any

from celery import Celery, Task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.core.aw_wrapper import create_aw_wrapper
from app.models.database import DataArtifact, Job
from app.services.storage_service import get_storage_backend

settings = get_settings()

# Create Celery app
celery_app = Celery(
    "aw_tasks",
    broker=settings.celery_broker,
    backend=settings.celery_backend,
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.max_job_runtime,
    task_soft_time_limit=settings.max_job_runtime - 60,
)


# Create async database session for tasks
engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db_session() -> AsyncSession:
    """Get database session for tasks."""
    return AsyncSessionLocal()


class AsyncTask(Task):
    """Base task class with async support."""

    def __call__(self, *args, **kwargs):
        """Run the task in an async context."""
        return asyncio.run(self.run_async(*args, **kwargs))

    async def run_async(self, *args, **kwargs):
        """Override this method in subclasses."""
        raise NotImplementedError


@celery_app.task(bind=True, base=AsyncTask, name="execute_workflow")
async def execute_workflow_task(self, job_id: str) -> dict[str, Any]:
    """Execute a workflow asynchronously.

    Args:
        self: Celery task instance
        job_id: Job ID to execute

    Returns:
        dict with execution results
    """
    async with AsyncSessionLocal() as db:
        try:
            # Get job from database
            result = await db.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()

            if not job:
                raise ValueError(f"Job {job_id} not found")

            # Update job status to running
            job.status = "running"
            job.started_at = datetime.utcnow()
            job.progress = 0
            await db.commit()

            # Get input data if specified
            input_data = None
            if job.input_data_id:
                artifact_result = await db.execute(
                    select(DataArtifact).where(DataArtifact.id == job.input_data_id)
                )
                artifact = artifact_result.scalar_one_or_none()

                if artifact:
                    storage = get_storage_backend()
                    input_data = await storage.load(artifact.storage_path)

            # Get workflow configuration
            from app.models.database import Workflow

            if job.workflow_id:
                workflow_result = await db.execute(
                    select(Workflow).where(Workflow.id == job.workflow_id)
                )
                workflow = workflow_result.scalar_one_or_none()

                if not workflow:
                    raise ValueError(f"Workflow {job.workflow_id} not found")

                steps = workflow.steps
                global_config = workflow.global_config or {}
            else:
                # Direct execution without workflow
                steps = job.job_metadata.get("steps", []) if job.job_metadata else []
                global_config = {}

            if not steps:
                raise ValueError("No steps defined for workflow execution")

            # Update progress
            job.progress = 10
            await db.commit()

            # Create AW wrapper and execute workflow
            aw_wrapper = create_aw_wrapper(config=global_config)

            try:
                result_data, step_metadata = await aw_wrapper.execute_workflow(
                    steps, input_data
                )

                # Update progress
                job.progress = 80
                await db.commit()

                # Save result data if available
                result_data_id = None
                if result_data:
                    storage = get_storage_backend()
                    import io
                    import json
                    import uuid

                    # Convert result to bytes
                    if isinstance(result_data, bytes):
                        result_bytes = result_data
                        filename = f"result_{job_id}.bin"
                    else:
                        # Try to serialize as JSON
                        result_bytes = json.dumps(result_data).encode()
                        filename = f"result_{job_id}.json"

                    # Save to storage
                    result_id = str(uuid.uuid4())
                    storage_key = f"results/{result_id}/{filename}"
                    await storage.save(storage_key, io.BytesIO(result_bytes))

                    # Create artifact record
                    result_artifact = DataArtifact(
                        id=result_id,
                        filename=filename,
                        storage_path=storage_key,
                        size_bytes=len(result_bytes),
                        content_type="application/json",
                        file_metadata={"type": "workflow_result", "job_id": job_id},
                    )
                    db.add(result_artifact)
                    result_data_id = result_id

                # Update job as completed
                job.status = "completed"
                job.result_data_id = result_data_id
                job.job_metadata = {
                    "step_metadata": step_metadata,
                    "context": aw_wrapper.get_context(),
                }
                job.progress = 100
                job.completed_at = datetime.utcnow()
                await db.commit()

                return {
                    "status": "completed",
                    "job_id": job_id,
                    "result_data_id": result_data_id,
                }

            except Exception as e:
                # Update job as failed
                job.status = "failed"
                job.error = str(e)
                job.completed_at = datetime.utcnow()
                await db.commit()

                raise

        except Exception as e:
            # Ensure job is marked as failed
            if job:
                job.status = "failed"
                job.error = str(e)
                job.completed_at = datetime.utcnow()
                await db.commit()

            raise


@celery_app.task(name="cleanup_old_jobs")
def cleanup_old_jobs_task() -> dict[str, Any]:
    """Clean up old completed/failed jobs.

    Returns:
        dict with cleanup results
    """
    # TODO: Implement job cleanup based on settings.job_cleanup_days
    return {"status": "success", "deleted_count": 0}
