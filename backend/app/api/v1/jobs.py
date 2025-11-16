"""Job execution and management endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import DatabaseSession
from app.models.schemas import JobCreate, JobResponse
from app.services.workflow_service import WorkflowService

router = APIRouter()


def get_workflow_service(db: DatabaseSession) -> WorkflowService:
    """Get workflow service instance.

    Args:
        db: Database session

    Returns:
        WorkflowService instance
    """
    return WorkflowService(db)


WorkflowServiceDep = Annotated[WorkflowService, Depends(get_workflow_service)]


@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new job",
)
async def create_job(
    job_data: JobCreate,
    service: WorkflowServiceDep,
) -> JobResponse:
    """Create a new job (without executing).

    Args:
        job_data: Job creation data
        service: Workflow service

    Returns:
        Created job
    """
    return await service.create_job(job_data)


@router.post(
    "/{job_id}/execute",
    response_model=JobResponse,
    summary="Execute a job",
)
async def execute_job(
    job_id: str,
    service: WorkflowServiceDep,
) -> JobResponse:
    """Execute a job asynchronously.

    Args:
        job_id: Job ID to execute
        service: Workflow service

    Returns:
        Updated job

    Raises:
        HTTPException: If job not found or already running
    """
    try:
        return await service.execute_job(job_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "",
    response_model=list[JobResponse],
    summary="List jobs",
)
async def list_jobs(
    service: WorkflowServiceDep,
    workflow_id: str | None = None,
    status_filter: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[JobResponse]:
    """List jobs with optional filters.

    Args:
        service: Workflow service
        workflow_id: Filter by workflow ID
        status_filter: Filter by status
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        List of jobs
    """
    return await service.list_jobs(
        workflow_id=workflow_id,
        status=status_filter,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get job details",
)
async def get_job(
    job_id: str,
    service: WorkflowServiceDep,
) -> JobResponse:
    """Get job details by ID.

    Args:
        job_id: Job ID
        service: Workflow service

    Returns:
        Job details

    Raises:
        HTTPException: If job not found
    """
    try:
        return await service.get_job(job_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.post(
    "/{job_id}/cancel",
    response_model=JobResponse,
    summary="Cancel a job",
)
async def cancel_job(
    job_id: str,
    service: WorkflowServiceDep,
) -> JobResponse:
    """Cancel a running job.

    Args:
        job_id: Job ID to cancel
        service: Workflow service

    Returns:
        Updated job

    Raises:
        HTTPException: If job not found or cannot be cancelled
    """
    try:
        return await service.cancel_job(job_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/{job_id}/result",
    summary="Get job result",
)
async def get_job_result(
    job_id: str,
    service: WorkflowServiceDep,
) -> dict:
    """Get job execution result.

    Args:
        job_id: Job ID
        service: Workflow service

    Returns:
        Job result data

    Raises:
        HTTPException: If job not found or not completed
    """
    try:
        job = await service.get_job(job_id)

        if job.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Job is not completed (status: {job.status})",
            )

        return {
            "job_id": job.id,
            "result_data_id": job.result_data_id,
            "metadata": job.metadata,
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
