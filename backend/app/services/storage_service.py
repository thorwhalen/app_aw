"""Storage service for handling file uploads and downloads.

Provides abstraction over local filesystem and cloud storage (S3).
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO

from app.config import get_settings

settings = get_settings()


class StorageBackend(ABC):
    """Abstract base class for storage backends."""

    @abstractmethod
    async def save(self, key: str, data: BinaryIO) -> str:
        """Save data to storage.

        Args:
            key: Storage key/path
            data: Binary data stream

        Returns:
            Storage path/URL
        """
        pass

    @abstractmethod
    async def load(self, key: str) -> bytes:
        """Load data from storage.

        Args:
            key: Storage key/path

        Returns:
            Binary data
        """
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete data from storage.

        Args:
            key: Storage key/path
        """
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists in storage.

        Args:
            key: Storage key/path

        Returns:
            True if exists, False otherwise
        """
        pass

    @abstractmethod
    async def get_size(self, key: str) -> int:
        """Get size of stored data.

        Args:
            key: Storage key/path

        Returns:
            Size in bytes
        """
        pass


class LocalStorage(StorageBackend):
    """Local filesystem storage backend."""

    def __init__(self, base_path: str):
        """Initialize local storage.

        Args:
            base_path: Base directory for storage
        """
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def save(self, key: str, data: BinaryIO) -> str:
        """Save data to local filesystem."""
        file_path = self.base_path / key
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(file_path, "wb") as f:
            content = data.read()
            f.write(content)

        return str(file_path)

    async def load(self, key: str) -> bytes:
        """Load data from local filesystem."""
        file_path = self.base_path / key
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {key}")

        with open(file_path, "rb") as f:
            return f.read()

    async def delete(self, key: str) -> None:
        """Delete file from local filesystem."""
        file_path = self.base_path / key
        if file_path.exists():
            file_path.unlink()

    async def exists(self, key: str) -> bool:
        """Check if file exists."""
        file_path = self.base_path / key
        return file_path.exists()

    async def get_size(self, key: str) -> int:
        """Get file size."""
        file_path = self.base_path / key
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {key}")
        return file_path.stat().st_size


class S3Storage(StorageBackend):
    """AWS S3 storage backend."""

    def __init__(self, bucket: str, region: str):
        """Initialize S3 storage.

        Args:
            bucket: S3 bucket name
            region: AWS region
        """
        try:
            import boto3
        except ImportError:
            raise ImportError("boto3 is required for S3 storage. Install with: pip install boto3")

        self.bucket = bucket
        self.region = region
        self.s3_client = boto3.client("s3", region_name=region)

    async def save(self, key: str, data: BinaryIO) -> str:
        """Save data to S3."""
        self.s3_client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data.read(),
        )
        return f"s3://{self.bucket}/{key}"

    async def load(self, key: str) -> bytes:
        """Load data from S3."""
        response = self.s3_client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    async def delete(self, key: str) -> None:
        """Delete object from S3."""
        self.s3_client.delete_object(Bucket=self.bucket, Key=key)

    async def exists(self, key: str) -> bool:
        """Check if object exists in S3."""
        try:
            self.s3_client.head_object(Bucket=self.bucket, Key=key)
            return True
        except self.s3_client.exceptions.NoSuchKey:
            return False

    async def get_size(self, key: str) -> int:
        """Get object size from S3."""
        response = self.s3_client.head_object(Bucket=self.bucket, Key=key)
        return response["ContentLength"]


def get_storage_backend() -> StorageBackend:
    """Factory function to get configured storage backend.

    Returns:
        Configured storage backend instance
    """
    if settings.storage_backend == "s3":
        if not settings.s3_bucket or not settings.s3_region:
            raise ValueError("S3 bucket and region must be configured for S3 storage")
        return S3Storage(settings.s3_bucket, settings.s3_region)

    return LocalStorage(settings.storage_path)
