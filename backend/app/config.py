"""Application configuration management."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "AW App Backend"
    app_version: str = "0.1.0"
    debug: bool = Field(default=False, description="Enable debug mode")
    environment: Literal["development", "production", "test"] = "development"

    # API
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="Allowed CORS origins",
    )

    # Database
    database_url: str = Field(
        default="sqlite+aiosqlite:///./aw_app.db",
        description="Database connection URL",
    )

    # Storage
    storage_backend: Literal["local", "s3"] = Field(
        default="local", description="Storage backend to use"
    )
    storage_path: str = Field(
        default="./data", description="Local storage path for artifacts"
    )
    s3_bucket: str | None = Field(default=None, description="S3 bucket name")
    s3_region: str | None = Field(default=None, description="S3 region")
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    # Redis/Celery
    redis_url: str = Field(
        default="redis://localhost:6379/0", description="Redis connection URL"
    )
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None

    # LLM Configuration
    openai_api_key: str | None = Field(default=None, description="OpenAI API key")
    default_llm: str = Field(default="gpt-4", description="Default LLM model")
    max_retries: int = Field(default=3, description="Default max retries for agents")

    # Job Configuration
    max_job_runtime: int = Field(
        default=3600, description="Max job runtime in seconds (1 hour)"
    )
    job_cleanup_days: int = Field(
        default=7, description="Days to keep completed jobs"
    )

    # Authentication
    jwt_secret_key: str = Field(
        default="dev-secret-key-change-in-production-please",
        description="JWT secret key for token signing"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(
        default=30, description="Access token expiration in minutes"
    )
    refresh_token_expire_days: int = Field(
        default=7, description="Refresh token expiration in days"
    )

    @property
    def celery_broker(self) -> str:
        """Get Celery broker URL, defaulting to Redis URL."""
        return self.celery_broker_url or self.redis_url

    @property
    def celery_backend(self) -> str:
        """Get Celery result backend URL, defaulting to Redis URL."""
        return self.celery_result_backend or self.redis_url


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
