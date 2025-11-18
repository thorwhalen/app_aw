"""SQLAlchemy database models."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Column, DateTime, Enum, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


class Workflow(Base):
    """Workflow database model."""

    __tablename__ = "workflows"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    steps = Column(JSON, nullable=False)  # List of workflow steps
    global_config = Column(JSON, nullable=True)  # Global configuration
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "steps": self.steps,
            "global_config": self.global_config,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Job(Base):
    """Job execution database model."""

    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, nullable=True, index=True)
    status = Column(
        Enum("queued", "running", "completed", "failed", "cancelled", name="job_status"),
        nullable=False,
        default="queued",
        index=True,
    )
    input_data_id = Column(String, nullable=True)
    result_data_id = Column(String, nullable=True)
    job_metadata = Column(JSON, nullable=True)  # Execution metadata
    error = Column(Text, nullable=True)  # Error message if failed
    progress = Column(Integer, default=0)  # Progress percentage (0-100)
    logs = Column(JSON, nullable=True)  # Execution logs
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "workflow_id": self.workflow_id,
            "status": self.status,
            "input_data_id": self.input_data_id,
            "result_data_id": self.result_data_id,
            "metadata": self.job_metadata,
            "error": self.error,
            "progress": self.progress,
            "logs": self.logs,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class DataArtifact(Base):
    """Data artifact database model."""

    __tablename__ = "data_artifacts"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)  # Path in storage backend
    size_bytes = Column(Integer, nullable=True)
    content_type = Column(String, nullable=True)
    file_metadata = Column(JSON, nullable=True)  # File metadata (rows, columns, etc.)
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "filename": self.filename,
            "storage_path": self.storage_path,
            "size_bytes": self.size_bytes,
            "content_type": self.content_type,
            "metadata": self.file_metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
