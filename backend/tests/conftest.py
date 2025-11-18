"""Pytest configuration and fixtures."""

import asyncio
from collections.abc import AsyncGenerator, Generator
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import Settings, get_settings
from app.core.database import get_db
from app.main import app
from app.models.database import Base


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_settings() -> Settings:
    """Get test settings."""
    return Settings(
        database_url="sqlite+aiosqlite:///:memory:",
        storage_backend="local",
        storage_path="./test_data",
        debug=True,
        environment="test",
    )


@pytest.fixture
async def test_db(test_settings: Settings) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    engine = create_async_engine(test_settings.database_url, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with AsyncSessionLocal() as session:
        yield session

    await engine.dispose()


@pytest.fixture
async def client(test_db: AsyncSession, test_settings: Settings) -> AsyncGenerator[AsyncClient, None]:
    """Create test client."""

    async def override_get_db():
        yield test_db

    def override_get_settings():
        return test_settings

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_settings] = override_get_settings

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
