"""Workflow management endpoints."""

from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import DatabaseSession
from app.models.database import Workflow
from app.models.schemas import JobResponse, WorkflowCreate, WorkflowResponse, WorkflowUpdate
from app.services.workflow_service import WorkflowService

router = APIRouter()


@router.post(
    "",
    response_model=WorkflowResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workflow",
)
async def create_workflow(
    workflow_data: WorkflowCreate,
    db: DatabaseSession,
) -> WorkflowResponse:
    """Create a new workflow configuration.

    Args:
        workflow_data: Workflow creation data
        db: Database session

    Returns:
        Created workflow
    """
    # Convert Pydantic models to dicts for JSON storage
    steps_data = [step.model_dump() for step in workflow_data.steps]

    workflow = Workflow(
        name=workflow_data.name,
        description=workflow_data.description,
        steps=steps_data,
        global_config=workflow_data.global_config,
    )

    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)

    # Convert back to Pydantic model
    return WorkflowResponse.model_validate(workflow)


@router.get(
    "",
    response_model=list[WorkflowResponse],
    summary="List all workflows",
)
async def list_workflows(
    db: DatabaseSession,
    skip: int = 0,
    limit: int = 100,
) -> list[WorkflowResponse]:
    """Get list of all workflows.

    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        List of workflows
    """
    result = await db.execute(
        select(Workflow).offset(skip).limit(limit).order_by(Workflow.created_at.desc())
    )
    workflows = result.scalars().all()
    return [WorkflowResponse.model_validate(wf) for wf in workflows]


@router.get(
    "/{workflow_id}",
    response_model=WorkflowResponse,
    summary="Get workflow by ID",
)
async def get_workflow(
    workflow_id: str,
    db: DatabaseSession,
) -> WorkflowResponse:
    """Get a specific workflow by ID.

    Args:
        workflow_id: Workflow ID
        db: Database session

    Returns:
        Workflow details

    Raises:
        HTTPException: If workflow not found
    """
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found",
        )

    return WorkflowResponse.model_validate(workflow)


@router.put(
    "/{workflow_id}",
    response_model=WorkflowResponse,
    summary="Update workflow",
)
async def update_workflow(
    workflow_id: str,
    workflow_data: WorkflowUpdate,
    db: DatabaseSession,
) -> WorkflowResponse:
    """Update an existing workflow.

    Args:
        workflow_id: Workflow ID
        workflow_data: Workflow update data
        db: Database session

    Returns:
        Updated workflow

    Raises:
        HTTPException: If workflow not found
    """
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found",
        )

    # Update fields if provided
    update_data = workflow_data.model_dump(exclude_unset=True)

    if "steps" in update_data and update_data["steps"]:
        # Convert Pydantic models to dicts
        update_data["steps"] = [step.model_dump() for step in workflow_data.steps]

    for field, value in update_data.items():
        setattr(workflow, field, value)

    await db.commit()
    await db.refresh(workflow)

    return WorkflowResponse.model_validate(workflow)


@router.delete(
    "/{workflow_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete workflow",
)
async def delete_workflow(
    workflow_id: str,
    db: DatabaseSession,
) -> None:
    """Delete a workflow.

    Args:
        workflow_id: Workflow ID
        db: Database session

    Raises:
        HTTPException: If workflow not found
    """
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found",
        )

    await db.delete(workflow)
    await db.commit()


@router.post(
    "/{workflow_id}/execute",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Execute workflow",
)
async def execute_workflow(
    workflow_id: str,
    db: DatabaseSession,
    input_data_id: str | None = None,
) -> JobResponse:
    """Execute a workflow asynchronously.

    Args:
        workflow_id: Workflow ID to execute
        db: Database session
        input_data_id: Optional input data artifact ID

    Returns:
        Created and queued job

    Raises:
        HTTPException: If workflow not found
    """
    service = WorkflowService(db)

    try:
        return await service.execute_workflow(workflow_id, input_data_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
