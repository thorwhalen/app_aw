"""Authentication and user models."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, JSON
from sqlalchemy.orm import declarative_base

from app.models.database import Base


class User(Base):
    """User model for authentication and authorization."""

    __tablename__ = "users"

    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    scopes = Column(JSON, default=list, nullable=False)  # Permission scopes
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<User(username='{self.username}', email='{self.email}')>"


class APIKey(Base):
    """API key model for service-to-service authentication."""

    __tablename__ = "api_keys"

    id = Column(String, primary_key=True)
    key_hash = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    user_id = Column(String, nullable=True)  # Optional: link to user
    scopes = Column(JSON, default=list, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<APIKey(name='{self.name}', active={self.is_active})>"
