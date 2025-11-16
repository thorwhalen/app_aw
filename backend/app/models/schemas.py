"""Pydantic schemas for request/response validation."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class WorkflowStepType(str, Enum):
    """Workflow step types."""

    LOADING = "loading"
    PREPARING = "preparing"
    VALIDATION = "validation"


class WorkflowStep(BaseModel):
    """Workflow step configuration."""

    type: WorkflowStepType
    config: dict[str, Any] = Field(default_factory=dict)
    require_approval: bool = False


class WorkflowCreate(BaseModel):
    """Schema for creating a workflow."""

    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    steps: list[WorkflowStep] = Field(..., min_length=1)
    global_config: dict[str, Any] | None = None


class WorkflowUpdate(BaseModel):
    """Schema for updating a workflow."""

    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    steps: list[WorkflowStep] | None = None
    global_config: dict[str, Any] | None = None


class WorkflowResponse(BaseModel):
    """Schema for workflow response."""

    id: str
    name: str
    description: str | None
    steps: list[WorkflowStep]
    global_config: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobStatus(str, Enum):
    """Job status enum."""

    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobCreate(BaseModel):
    """Schema for creating a job."""

    workflow_id: str | None = None
    input_data_id: str | None = None
    parameters: dict[str, Any] | None = None


class JobResponse(BaseModel):
    """Schema for job response."""

    id: str
    workflow_id: str | None
    status: JobStatus
    input_data_id: str | None
    result_data_id: str | None
    metadata: dict[str, Any] | None = Field(alias="job_metadata")
    error: str | None
    progress: int
    logs: list[str] | None
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None

    model_config = {"from_attributes": True, "populate_by_name": True}


class DataArtifactCreate(BaseModel):
    """Schema for creating a data artifact."""

    filename: str
    content_type: str | None = None


class DataArtifactResponse(BaseModel):
    """Schema for data artifact response."""

    id: str
    filename: str
    storage_path: str
    size_bytes: int | None
    content_type: str | None
    metadata: dict[str, Any] | None = Field(alias="file_metadata")
    created_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class DataSampleResponse(BaseModel):
    """Schema for data sample response."""

    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int
    sample_size: int


class ErrorResponse(BaseModel):
    """Schema for error responses."""

    detail: str
    error_code: str | None = None


class HealthResponse(BaseModel):
    """Schema for health check response."""

    status: str
    version: str
    database: str
    redis: str | None = None
