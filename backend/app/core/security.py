"""Security utilities for authentication and authorization.

This module provides JWT-based authentication, password hashing, and user
session management. It follows FastAPI best practices for security.
"""

from datetime import datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.config import get_settings

settings = get_settings()

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = "your-secret-key-change-this-in-production"  # TODO: Move to env var
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


class Token(BaseModel):
    """JWT token response model."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenData(BaseModel):
    """Data extracted from JWT token."""
    username: str | None = None
    user_id: str | None = None
    scopes: list[str] = []


class PasswordHash:
    """Password hashing utilities using bcrypt."""

    @staticmethod
    def hash(password: str) -> str:
        """Hash a password for storing.

        Args:
            password: Plain text password

        Returns:
            Hashed password
        """
        return pwd_context.hash(password)

    @staticmethod
    def verify(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against a hash.

        Args:
            plain_password: Plain text password to verify
            hashed_password: Stored password hash

        Returns:
            True if password matches, False otherwise
        """
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def needs_update(hashed_password: str) -> bool:
        """Check if password hash needs updating.

        Args:
            hashed_password: Stored password hash

        Returns:
            True if hash should be updated
        """
        return pwd_context.needs_update(hashed_password)


class JWTManager:
    """JWT token management."""

    @staticmethod
    def create_access_token(
        data: dict[str, Any],
        expires_delta: timedelta | None = None
    ) -> str:
        """Create a new JWT access token.

        Args:
            data: Payload data to encode in token
            expires_delta: Optional custom expiration time

        Returns:
            Encoded JWT token string

        Example:
            token = JWTManager.create_access_token(
                data={"sub": user.id, "username": user.username}
            )
        """
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        })

        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def create_refresh_token(
        data: dict[str, Any],
        expires_delta: timedelta | None = None
    ) -> str:
        """Create a new JWT refresh token.

        Args:
            data: Payload data to encode in token
            expires_delta: Optional custom expiration time

        Returns:
            Encoded JWT token string
        """
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        })

        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> dict[str, Any]:
        """Decode and verify a JWT token.

        Args:
            token: JWT token string

        Returns:
            Decoded token payload

        Raises:
            JWTError: If token is invalid or expired
        """
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError as e:
            raise ValueError(f"Invalid token: {str(e)}")

    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> TokenData:
        """Verify token and extract user data.

        Args:
            token: JWT token string
            token_type: Expected token type ('access' or 'refresh')

        Returns:
            TokenData with extracted user information

        Raises:
            ValueError: If token is invalid or wrong type

        Example:
            token_data = JWTManager.verify_token(token)
            user_id = token_data.user_id
        """
        try:
            payload = JWTManager.decode_token(token)

            # Verify token type
            if payload.get("type") != token_type:
                raise ValueError(f"Invalid token type. Expected {token_type}")

            # Extract data
            username: str | None = payload.get("username")
            user_id: str | None = payload.get("sub")
            scopes: list[str] = payload.get("scopes", [])

            if user_id is None:
                raise ValueError("Token missing user ID")

            return TokenData(
                username=username,
                user_id=user_id,
                scopes=scopes
            )

        except JWTError as e:
            raise ValueError(f"Could not validate credentials: {str(e)}")


# API Key management (for service-to-service authentication)
class APIKeyManager:
    """Simple API key management for service authentication.

    In production, store API keys in a database with proper encryption.
    """

    # TODO: Move to database
    _api_keys: dict[str, dict[str, Any]] = {
        # Example API key (for development only)
        "dev_key_123": {
            "name": "Development Key",
            "scopes": ["read", "write"],
            "created_at": "2025-01-01T00:00:00Z"
        }
    }

    @classmethod
    def verify_api_key(cls, api_key: str) -> bool:
        """Verify an API key is valid.

        Args:
            api_key: API key string

        Returns:
            True if valid, False otherwise
        """
        return api_key in cls._api_keys

    @classmethod
    def get_api_key_info(cls, api_key: str) -> dict[str, Any] | None:
        """Get information about an API key.

        Args:
            api_key: API key string

        Returns:
            API key info dict or None if not found
        """
        return cls._api_keys.get(api_key)

    @classmethod
    def create_api_key(cls, name: str, scopes: list[str] | None = None) -> str:
        """Create a new API key.

        Args:
            name: Descriptive name for the key
            scopes: List of permission scopes

        Returns:
            Generated API key string
        """
        import secrets

        # Generate secure random API key
        api_key = f"ak_{secrets.token_urlsafe(32)}"

        cls._api_keys[api_key] = {
            "name": name,
            "scopes": scopes or ["read"],
            "created_at": datetime.utcnow().isoformat()
        }

        return api_key


# Rate limiting (simple in-memory implementation)
class RateLimiter:
    """Simple rate limiter for API endpoints.

    In production, use Redis for distributed rate limiting.
    """

    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        """Initialize rate limiter.

        Args:
            max_requests: Maximum requests per window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[datetime]] = {}

    def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed for identifier.

        Args:
            identifier: Unique identifier (e.g., IP address, user ID)

        Returns:
            True if allowed, False if rate limit exceeded
        """
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=self.window_seconds)

        # Clean old requests
        if identifier in self._requests:
            self._requests[identifier] = [
                req_time for req_time in self._requests[identifier]
                if req_time > window_start
            ]
        else:
            self._requests[identifier] = []

        # Check limit
        if len(self._requests[identifier]) >= self.max_requests:
            return False

        # Record request
        self._requests[identifier].append(now)
        return True

    def get_remaining(self, identifier: str) -> int:
        """Get remaining requests for identifier.

        Args:
            identifier: Unique identifier

        Returns:
            Number of remaining requests in current window
        """
        if identifier not in self._requests:
            return self.max_requests

        now = datetime.utcnow()
        window_start = now - timedelta(seconds=self.window_seconds)

        recent_requests = [
            req_time for req_time in self._requests[identifier]
            if req_time > window_start
        ]

        return max(0, self.max_requests - len(recent_requests))


# Global rate limiter instance
rate_limiter = RateLimiter(max_requests=100, window_seconds=60)
