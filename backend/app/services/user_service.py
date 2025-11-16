"""User authentication service."""

from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import PasswordHash, JWTManager
from app.models.auth import User
from app.models.schemas import UserCreate, UserResponse, TokenResponse


class UserService:
    """Service for user authentication and management."""

    def __init__(self, db: AsyncSession):
        """Initialize user service.

        Args:
            db: Database session
        """
        self.db = db

    async def create_user(
        self,
        user_data: UserCreate,
        is_superuser: bool = False,
        scopes: list[str] | None = None
    ) -> User:
        """Create a new user.

        Args:
            user_data: User creation data
            is_superuser: Whether user is superuser
            scopes: Permission scopes

        Returns:
            Created user

        Raises:
            ValueError: If username or email already exists
        """
        # Check if username exists
        result = await self.db.execute(
            select(User).where(User.username == user_data.username)
        )
        if result.scalar_one_or_none():
            raise ValueError(f"Username '{user_data.username}' already exists")

        # Check if email exists
        result = await self.db.execute(
            select(User).where(User.email == user_data.email)
        )
        if result.scalar_one_or_none():
            raise ValueError(f"Email '{user_data.email}' already exists")

        # Create user
        user = User(
            id=str(uuid.uuid4()),
            username=user_data.username,
            email=user_data.email,
            hashed_password=PasswordHash.hash(user_data.password),
            full_name=user_data.full_name,
            is_active=True,
            is_superuser=is_superuser,
            scopes=scopes or ["read", "write"],
            created_at=datetime.utcnow(),
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def authenticate_user(
        self,
        username: str,
        password: str
    ) -> Optional[User]:
        """Authenticate user with username and password.

        Args:
            username: Username or email
            password: Plain text password

        Returns:
            User if authenticated, None otherwise
        """
        # Try username first, then email
        result = await self.db.execute(
            select(User).where(
                (User.username == username) | (User.email == username)
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            return None

        if not user.is_active:
            return None

        if not PasswordHash.verify(password, user.hashed_password):
            return None

        # Update last login
        user.last_login = datetime.utcnow()
        await self.db.commit()

        return user

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID.

        Args:
            user_id: User ID

        Returns:
            User if found, None otherwise
        """
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username.

        Args:
            username: Username

        Returns:
            User if found, None otherwise
        """
        result = await self.db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

    def create_tokens(self, user: User) -> TokenResponse:
        """Create access and refresh tokens for user.

        Args:
            user: User to create tokens for

        Returns:
            Token response with access and refresh tokens
        """
        access_token = JWTManager.create_access_token(
            data={
                "sub": user.id,
                "username": user.username,
                "scopes": user.scopes,
            }
        )

        refresh_token = JWTManager.create_refresh_token(
            data={
                "sub": user.id,
                "username": user.username,
            }
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=30 * 60,  # 30 minutes
            refresh_token=refresh_token,
        )

    async def create_dev_user(self) -> User:
        """Create or get development user for easy testing.

        Returns:
            Dev user instance
        """
        # Check if dev user exists
        user = await self.get_user_by_username("dev")
        if user:
            return user

        # Create dev user
        dev_user_data = UserCreate(
            username="dev",
            email="dev@example.com",
            password="dev",
            full_name="Development User",
        )

        return await self.create_user(
            dev_user_data,
            is_superuser=True,
            scopes=["read", "write", "admin"],
        )
