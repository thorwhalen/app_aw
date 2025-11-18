"""Workflow execution service."""

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.task_queue import execute_workflow_task
from app.models.database import Job, Workflow
from app.models.schemas import JobCreate, JobResponse


class WorkflowService:
    """Service for workflow execution and job management."""

    def __init__(self, db: AsyncSession):
        """Initialize service.

        Args:
            db: Database session
        """
        self.db = db

    async def create_job(self, job_data: JobCreate) -> JobResponse:
        """Create a new job.

        Args:
            job_data: Job creation data

        Returns:
            Created job
        """
        job = Job(
            workflow_id=job_data.workflow_id,
            input_data_id=job_data.input_data_id,
            status="queued",
            job_metadata=job_data.parameters or {},
            progress=0,
        )

        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)

        return JobResponse.model_validate(job)

    async def execute_job(self, job_id: str) -> JobResponse:
        """Execute a job asynchronously.

        Args:
            job_id: Job ID to execute

        Returns:
            Updated job

        Raises:
            ValueError: If job not found or already running
        """
        result = await self.db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()

        if not job:
            raise ValueError(f"Job {job_id} not found")

        if job.status == "running":
            raise ValueError(f"Job {job_id} is already running")

        # Queue the task
        execute_workflow_task.delay(job_id)

        # Update job status
        job.status = "queued"
        await self.db.commit()
        await self.db.refresh(job)

        return JobResponse.model_validate(job)

    async def get_job(self, job_id: str) -> JobResponse:
        """Get job by ID.

        Args:
            job_id: Job ID

        Returns:
            Job details

        Raises:
            ValueError: If job not found
        """
        result = await self.db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()

        if not job:
            raise ValueError(f"Job {job_id} not found")

        return JobResponse.model_validate(job)

    async def list_jobs(
        self,
        workflow_id: str | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[JobResponse]:
        """List jobs with optional filters.

        Args:
            workflow_id: Filter by workflow ID
            status: Filter by status
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of jobs
        """
        query = select(Job).offset(skip).limit(limit).order_by(Job.created_at.desc())

        if workflow_id:
            query = query.where(Job.workflow_id == workflow_id)

        if status:
            query = query.where(Job.status == status)

        result = await self.db.execute(query)
        jobs = result.scalars().all()

        return [JobResponse.model_validate(job) for job in jobs]

    async def cancel_job(self, job_id: str) -> JobResponse:
        """Cancel a running job.

        Args:
            job_id: Job ID to cancel

        Returns:
            Updated job

        Raises:
            ValueError: If job not found or not cancellable
        """
        result = await self.db.execute(select(Job).where(Job.id == job_id))
        job = result.scalar_one_or_none()

        if not job:
            raise ValueError(f"Job {job_id} not found")

        if job.status not in ["queued", "running"]:
            raise ValueError(f"Job {job_id} cannot be cancelled (status: {job.status})")

        # TODO: Actually cancel the Celery task
        # from celery.result import AsyncResult
        # AsyncResult(job_id).revoke(terminate=True)

        job.status = "cancelled"
        job.completed_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(job)

        return JobResponse.model_validate(job)

    async def execute_workflow(
        self, workflow_id: str, input_data_id: str | None = None
    ) -> JobResponse:
        """Execute a workflow.

        Args:
            workflow_id: Workflow ID to execute
            input_data_id: Optional input data artifact ID

        Returns:
            Created and queued job

        Raises:
            ValueError: If workflow not found
        """
        # Verify workflow exists
        result = await self.db.execute(
            select(Workflow).where(Workflow.id == workflow_id)
        )
        workflow = result.scalar_one_or_none()

        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Create job
        job_data = JobCreate(
            workflow_id=workflow_id,
            input_data_id=input_data_id,
            parameters={},
        )
        job = await self.create_job(job_data)

        # Execute job
        return await self.execute_job(job.id)
