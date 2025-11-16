"""Data management endpoints."""

import io
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import DatabaseSession, StorageService
from app.models.database import DataArtifact
from app.models.schemas import DataArtifactResponse, DataSampleResponse

router = APIRouter()


@router.post(
    "/upload",
    response_model=DataArtifactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload data file",
)
async def upload_data(
    file: UploadFile = File(...),
    db: DatabaseSession = None,
    storage: StorageService = None,
) -> DataArtifactResponse:
    """Upload a data file.

    Args:
        file: File to upload
        db: Database session
        storage: Storage backend

    Returns:
        Created data artifact
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Generate storage key (use artifact ID as prefix)
    import uuid

    artifact_id = str(uuid.uuid4())
    storage_key = f"artifacts/{artifact_id}/{file.filename}"

    # Save to storage
    storage_path = await storage.save(storage_key, io.BytesIO(content))

    # Create database record
    artifact = DataArtifact(
        id=artifact_id,
        filename=file.filename,
        storage_path=storage_key,
        size_bytes=file_size,
        content_type=file.content_type,
        file_metadata={},  # TODO: Extract metadata based on file type
    )

    db.add(artifact)
    await db.commit()
    await db.refresh(artifact)

    return DataArtifactResponse.model_validate(artifact)


@router.get(
    "",
    response_model=list[DataArtifactResponse],
    summary="List all data artifacts",
)
async def list_data_artifacts(
    db: DatabaseSession,
    skip: int = 0,
    limit: int = 100,
) -> list[DataArtifactResponse]:
    """Get list of all data artifacts.

    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        List of data artifacts
    """
    result = await db.execute(
        select(DataArtifact)
        .offset(skip)
        .limit(limit)
        .order_by(DataArtifact.created_at.desc())
    )
    artifacts = result.scalars().all()
    return [DataArtifactResponse.model_validate(artifact) for artifact in artifacts]


@router.get(
    "/{artifact_id}",
    response_model=DataArtifactResponse,
    summary="Get data artifact details",
)
async def get_data_artifact(
    artifact_id: str,
    db: DatabaseSession,
) -> DataArtifactResponse:
    """Get data artifact details by ID.

    Args:
        artifact_id: Data artifact ID
        db: Database session

    Returns:
        Data artifact details

    Raises:
        HTTPException: If artifact not found
    """
    result = await db.execute(
        select(DataArtifact).where(DataArtifact.id == artifact_id)
    )
    artifact = result.scalar_one_or_none()

    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data artifact {artifact_id} not found",
        )

    return DataArtifactResponse.model_validate(artifact)


@router.get(
    "/{artifact_id}/download",
    summary="Download data file",
)
async def download_data(
    artifact_id: str,
    db: DatabaseSession,
    storage: StorageService,
) -> StreamingResponse:
    """Download a data file.

    Args:
        artifact_id: Data artifact ID
        db: Database session
        storage: Storage backend

    Returns:
        File content as streaming response

    Raises:
        HTTPException: If artifact not found
    """
    result = await db.execute(
        select(DataArtifact).where(DataArtifact.id == artifact_id)
    )
    artifact = result.scalar_one_or_none()

    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data artifact {artifact_id} not found",
        )

    # Load from storage
    try:
        content = await storage.load(artifact.storage_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found in storage: {artifact.storage_path}",
        )

    return StreamingResponse(
        io.BytesIO(content),
        media_type=artifact.content_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{artifact.filename}"',
        },
    )


@router.get(
    "/{artifact_id}/sample",
    response_model=DataSampleResponse,
    summary="Get data sample",
)
async def get_data_sample(
    artifact_id: str,
    db: DatabaseSession,
    storage: StorageService,
    limit: int = 10,
) -> DataSampleResponse:
    """Get a sample of data rows.

    Args:
        artifact_id: Data artifact ID
        db: Database session
        storage: Storage backend
        limit: Number of rows to return

    Returns:
        Sample data

    Raises:
        HTTPException: If artifact not found or not supported
    """
    result = await db.execute(
        select(DataArtifact).where(DataArtifact.id == artifact_id)
    )
    artifact = result.scalar_one_or_none()

    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data artifact {artifact_id} not found",
        )

    # Load from storage
    try:
        content = await storage.load(artifact.storage_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found in storage: {artifact.storage_path}",
        )

    # TODO: Parse based on file type (CSV, JSON, etc.)
    # For now, return a mock response
    return DataSampleResponse(
        columns=["column1", "column2"],
        rows=[
            {"column1": "value1", "column2": "value2"},
            {"column1": "value3", "column2": "value4"},
        ],
        total_rows=2,
        sample_size=2,
    )


@router.delete(
    "/{artifact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete data artifact",
)
async def delete_data_artifact(
    artifact_id: str,
    db: DatabaseSession,
    storage: StorageService,
) -> None:
    """Delete a data artifact.

    Args:
        artifact_id: Data artifact ID
        db: Database session
        storage: Storage backend

    Raises:
        HTTPException: If artifact not found
    """
    result = await db.execute(
        select(DataArtifact).where(DataArtifact.id == artifact_id)
    )
    artifact = result.scalar_one_or_none()

    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data artifact {artifact_id} not found",
        )

    # Delete from storage
    try:
        await storage.delete(artifact.storage_path)
    except Exception:
        # Log error but continue with database deletion
        pass

    # Delete from database
    await db.delete(artifact)
    await db.commit()
