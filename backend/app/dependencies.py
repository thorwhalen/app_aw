"""FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.aw_wrapper import AWWrapper, create_aw_wrapper
from app.core.database import get_db
from app.services.storage_service import StorageBackend, get_storage_backend

# Type aliases for common dependencies
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


def get_aw_wrapper(settings: AppSettings) -> AWWrapper:
    """Get AW wrapper with current settings.

    Args:
        settings: Application settings

    Returns:
        Configured AWWrapper instance
    """
    config = {
        "llm": settings.default_llm,
        "max_retries": settings.max_retries,
        "openai_api_key": settings.openai_api_key,
    }
    return create_aw_wrapper(config)


def get_storage() -> StorageBackend:
    """Get storage backend.

    Returns:
        Configured storage backend
    """
    return get_storage_backend()


# Type aliases for service dependencies
AWService = Annotated[AWWrapper, Depends(get_aw_wrapper)]
StorageService = Annotated[StorageBackend, Depends(get_storage)]
