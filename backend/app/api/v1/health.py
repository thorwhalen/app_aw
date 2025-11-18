"""Health check endpoints."""

from fastapi import APIRouter, status

from app.config import get_settings
from app.models.schemas import HealthResponse

router = APIRouter()
settings = get_settings()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check",
)
async def health_check() -> HealthResponse:
    """Check API health status."""
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        database="connected",  # TODO: Add actual DB health check
        redis=None,  # TODO: Add Redis health check if available
    )
