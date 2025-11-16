"""Authentication endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import JWTManager
from app.dependencies import DatabaseSession
from app.models.schemas import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    TokenRefresh,
)
from app.services.user_service import UserService

router = APIRouter()
security = HTTPBearer(auto_error=False)


def get_user_service(db: DatabaseSession) -> UserService:
    """Get user service instance.

    Args:
        db: Database session

    Returns:
        UserService instance
    """
    return UserService(db)


UserServiceDep = Annotated[UserService, Depends(get_user_service)]


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    user_data: UserCreate,
    service: UserServiceDep,
) -> UserResponse:
    """Register a new user.

    Args:
        user_data: User registration data
        service: User service

    Returns:
        Created user (without password)

    Raises:
        HTTPException: If username or email already exists
    """
    try:
        user = await service.create_user(user_data)
        return UserResponse.model_validate(user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login to get access token",
)
async def login(
    credentials: UserLogin,
    service: UserServiceDep,
) -> TokenResponse:
    """Login with username/email and password.

    Args:
        credentials: Login credentials
        service: User service

    Returns:
        Access and refresh tokens

    Raises:
        HTTPException: If credentials are invalid
    """
    user = await service.authenticate_user(
        credentials.username,
        credentials.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return service.create_tokens(user)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
)
async def refresh_token(
    refresh_data: TokenRefresh,
    service: UserServiceDep,
) -> TokenResponse:
    """Refresh access token using refresh token.

    Args:
        refresh_data: Refresh token
        service: User service

    Returns:
        New access and refresh tokens

    Raises:
        HTTPException: If refresh token is invalid
    """
    try:
        # Verify refresh token
        token_data = JWTManager.verify_token(
            refresh_data.refresh_token,
            token_type="refresh"
        )

        # Get user
        user = await service.get_user_by_id(token_data.user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        # Create new tokens
        return service.create_tokens(user)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user info",
)
async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    service: UserServiceDep,
) -> UserResponse:
    """Get current authenticated user.

    Args:
        credentials: Bearer token
        service: User service

    Returns:
        Current user info

    Raises:
        HTTPException: If token is invalid
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

        # Get user
        user = await service.get_user_by_id(token_data.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        return UserResponse.model_validate(user)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post(
    "/dev-login",
    response_model=TokenResponse,
    summary="Development login (dev mode only)",
    include_in_schema=True,  # Show in docs for convenience
)
async def dev_login(
    service: UserServiceDep,
) -> TokenResponse:
    """Quick login for development (creates/uses dev user).

    This endpoint automatically creates a dev user with credentials:
    - Username: dev
    - Password: dev
    - Email: dev@example.com

    **WARNING**: Only use in development! Disable in production.

    Args:
        service: User service

    Returns:
        Access and refresh tokens for dev user
    """
    # Create or get dev user
    dev_user = await service.create_dev_user()

    # Return tokens
    return service.create_tokens(dev_user)
