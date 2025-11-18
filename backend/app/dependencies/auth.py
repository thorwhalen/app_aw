"""Authentication dependencies for FastAPI."""

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import JWTManager
from app.dependencies import get_db
from app.models.auth import User
from app.services.user_service import UserService

settings = get_settings()
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Get current authenticated user from JWT token.

    Args:
        credentials: Bearer token credentials
        db: Database session

    Returns:
        Current user

    Raises:
        HTTPException: If authentication fails
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        # Verify token
        token_data = JWTManager.verify_token(credentials.credentials)

        # Get user from database
        service = UserService(db)
        user = await service.get_user_by_id(token_data.user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is inactive",
            )

        return user

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    """Get current user if authenticated, None otherwise.

    This is useful for endpoints that work differently based on auth status.

    Args:
        credentials: Bearer token credentials (optional)
        db: Database session

    Returns:
        Current user if authenticated, None otherwise
    """
    if not credentials:
        return None

    try:
        token_data = JWTManager.verify_token(credentials.credentials)
        service = UserService(db)
        user = await service.get_user_by_id(token_data.user_id)

        if user and user.is_active:
            return user

    except ValueError:
        pass

    return None


async def get_current_active_superuser(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Get current user and verify they are a superuser.

    Args:
        current_user: Current authenticated user

    Returns:
        Current user (verified as superuser)

    Raises:
        HTTPException: If user is not a superuser
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return current_user


async def get_current_user_dev_mode(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    """Get current user with dev mode bypass.

    In development mode (DEBUG=true), this returns None (no auth required).
    In production, this requires authentication.

    This allows endpoints to be protected in production but open in development.

    Args:
        credentials: Bearer token credentials
        db: Database session

    Returns:
        User in production, None in development
    """
    # In development, bypass authentication
    if settings.debug:
        return None

    # In production, require authentication
    return await get_current_user(credentials, db)


def require_scope(required_scope: str):
    """Create dependency that checks for specific scope.

    Args:
        required_scope: Required scope (e.g., 'admin', 'write')

    Returns:
        Dependency function

    Example:
        @router.delete("/workflows/{id}", dependencies=[Depends(require_scope("admin"))])
        async def delete_workflow(id: str):
            ...
    """
    async def check_scope(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if required_scope not in current_user.scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required scope: {required_scope}",
            )
        return current_user

    return check_scope


# Convenient type annotations
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentUserOptional = Annotated[User | None, Depends(get_current_user_optional)]
CurrentUserDevMode = Annotated[User | None, Depends(get_current_user_dev_mode)]
CurrentSuperuser = Annotated[User, Depends(get_current_active_superuser)]
