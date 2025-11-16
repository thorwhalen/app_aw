"""Storage facade using Mapping/MutableMapping interfaces.

This module provides a clean abstraction over different storage backends
(local filesystem, S3) using Python's Mapping protocol, following the dol
(Data Object Layer) philosophy.

The facade pattern allows business logic to interact with storage through
a simple dict-like interface, making it easy to swap backends without
changing application code.
"""

from abc import ABC, abstractmethod
from collections.abc import MutableMapping
from pathlib import Path
from typing import BinaryIO, Iterator
import asyncio
from functools import wraps

from app.config import get_settings

settings = get_settings()


def async_mapping_method(func):
    """Decorator to make mapping methods async-compatible."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # If already in async context, run directly
        # Otherwise, run in thread pool
        if asyncio.iscoroutinefunction(func):
            return await func(*args, **kwargs)
        else:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, lambda: func(*args, **kwargs))
    return wrapper


class StorageMapping(MutableMapping, ABC):
    """Abstract base class for storage backends using Mapping protocol.

    This provides a dict-like interface for storage operations:
    - storage[key] = data  # Save
    - data = storage[key]  # Load
    - del storage[key]     # Delete
    - key in storage       # Check existence
    - len(storage)         # Count items
    - for key in storage   # Iterate keys
    """

    @abstractmethod
    def __getitem__(self, key: str) -> bytes:
        """Get data by key."""
        pass

    @abstractmethod
    def __setitem__(self, key: str, value: bytes) -> None:
        """Set data for key."""
        pass

    @abstractmethod
    def __delitem__(self, key: str) -> None:
        """Delete data by key."""
        pass

    @abstractmethod
    def __iter__(self) -> Iterator[str]:
        """Iterate over keys."""
        pass

    @abstractmethod
    def __len__(self) -> int:
        """Return number of stored items."""
        pass

    def __contains__(self, key: str) -> bool:
        """Check if key exists."""
        try:
            self[key]
            return True
        except KeyError:
            return False

    @abstractmethod
    def get_size(self, key: str) -> int:
        """Get size of stored data in bytes."""
        pass

    @abstractmethod
    def get_url(self, key: str) -> str:
        """Get URL/path for stored data."""
        pass


class LocalFilesystemMapping(StorageMapping):
    """Local filesystem storage using Mapping interface.

    Example:
        storage = LocalFilesystemMapping('/path/to/data')
        storage['file1.txt'] = b'Hello, world!'
        data = storage['file1.txt']
        del storage['file1.txt']
    """

    def __init__(self, base_path: str | Path):
        """Initialize local filesystem storage.

        Args:
            base_path: Base directory for storage
        """
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _get_path(self, key: str) -> Path:
        """Convert key to file path."""
        return self.base_path / key

    def __getitem__(self, key: str) -> bytes:
        """Load data from filesystem."""
        file_path = self._get_path(key)
        if not file_path.exists():
            raise KeyError(f"File not found: {key}")
        return file_path.read_bytes()

    def __setitem__(self, key: str, value: bytes) -> None:
        """Save data to filesystem."""
        file_path = self._get_path(key)
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(value)

    def __delitem__(self, key: str) -> None:
        """Delete file from filesystem."""
        file_path = self._get_path(key)
        if not file_path.exists():
            raise KeyError(f"File not found: {key}")
        file_path.unlink()

    def __iter__(self) -> Iterator[str]:
        """Iterate over all files."""
        for path in self.base_path.rglob('*'):
            if path.is_file():
                yield str(path.relative_to(self.base_path))

    def __len__(self) -> int:
        """Count total files."""
        return sum(1 for _ in self)

    def get_size(self, key: str) -> int:
        """Get file size in bytes."""
        file_path = self._get_path(key)
        if not file_path.exists():
            raise KeyError(f"File not found: {key}")
        return file_path.stat().st_size

    def get_url(self, key: str) -> str:
        """Get file path as URL."""
        return str(self._get_path(key))


class S3Mapping(StorageMapping):
    """AWS S3 storage using Mapping interface.

    Example:
        storage = S3Mapping('my-bucket', 'us-east-1')
        storage['data/file1.txt'] = b'Hello, S3!'
        data = storage['data/file1.txt']
        del storage['data/file1.txt']
    """

    def __init__(self, bucket: str, region: str, prefix: str = ''):
        """Initialize S3 storage.

        Args:
            bucket: S3 bucket name
            region: AWS region
            prefix: Optional key prefix for namespacing
        """
        try:
            import boto3
            from botocore.exceptions import ClientError
        except ImportError:
            raise ImportError(
                "boto3 is required for S3 storage. Install with: pip install boto3"
            )

        self.bucket = bucket
        self.region = region
        self.prefix = prefix.rstrip('/') + '/' if prefix else ''
        self.s3_client = boto3.client('s3', region_name=region)
        self.ClientError = ClientError

    def _get_key(self, key: str) -> str:
        """Add prefix to key."""
        return self.prefix + key

    def _strip_prefix(self, key: str) -> str:
        """Remove prefix from key."""
        if self.prefix and key.startswith(self.prefix):
            return key[len(self.prefix):]
        return key

    def __getitem__(self, key: str) -> bytes:
        """Load data from S3."""
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket,
                Key=self._get_key(key)
            )
            return response['Body'].read()
        except self.ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise KeyError(f"Object not found: {key}")
            raise

    def __setitem__(self, key: str, value: bytes) -> None:
        """Save data to S3."""
        self.s3_client.put_object(
            Bucket=self.bucket,
            Key=self._get_key(key),
            Body=value
        )

    def __delitem__(self, key: str) -> None:
        """Delete object from S3."""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket,
                Key=self._get_key(key)
            )
        except self.ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise KeyError(f"Object not found: {key}")
            raise

    def __iter__(self) -> Iterator[str]:
        """Iterate over all objects in bucket."""
        paginator = self.s3_client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(
            Bucket=self.bucket,
            Prefix=self.prefix
        )

        for page in page_iterator:
            if 'Contents' in page:
                for obj in page['Contents']:
                    yield self._strip_prefix(obj['Key'])

    def __len__(self) -> int:
        """Count total objects."""
        return sum(1 for _ in self)

    def get_size(self, key: str) -> int:
        """Get object size in bytes."""
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket,
                Key=self._get_key(key)
            )
            return response['ContentLength']
        except self.ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise KeyError(f"Object not found: {key}")
            raise

    def get_url(self, key: str) -> str:
        """Get S3 URL for object."""
        return f"s3://{self.bucket}/{self._get_key(key)}"


class StorageFacade:
    """High-level storage controller that wraps mapping-based backends.

    This facade provides async methods and additional utilities on top of
    the basic Mapping interface, making it convenient for FastAPI async handlers.

    Example:
        storage = StorageFacade(mapping=LocalFilesystemMapping('./data'))

        # Async operations
        await storage.save('file.txt', data_stream)
        data = await storage.load('file.txt')
        await storage.delete('file.txt')

        # Convenient methods
        exists = await storage.exists('file.txt')
        size = await storage.get_size('file.txt')
        url = await storage.get_url('file.txt')
    """

    def __init__(self, mapping: StorageMapping):
        """Initialize facade with a storage mapping.

        Args:
            mapping: Storage backend implementing StorageMapping
        """
        self.mapping = mapping

    async def save(self, key: str, data: BinaryIO | bytes) -> str:
        """Save data to storage (async).

        Args:
            key: Storage key/path
            data: Binary data stream or bytes

        Returns:
            Storage URL/path
        """
        content = data.read() if hasattr(data, 'read') else data

        # Run in executor to avoid blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self.mapping.__setitem__, key, content)

        return await self.get_url(key)

    async def load(self, key: str) -> bytes:
        """Load data from storage (async).

        Args:
            key: Storage key/path

        Returns:
            Binary data
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.mapping.__getitem__, key)

    async def delete(self, key: str) -> None:
        """Delete data from storage (async).

        Args:
            key: Storage key/path
        """
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self.mapping.__delitem__, key)

    async def exists(self, key: str) -> bool:
        """Check if key exists in storage (async).

        Args:
            key: Storage key/path

        Returns:
            True if exists, False otherwise
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.mapping.__contains__, key)

    async def get_size(self, key: str) -> int:
        """Get size of stored data (async).

        Args:
            key: Storage key/path

        Returns:
            Size in bytes
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.mapping.get_size, key)

    async def get_url(self, key: str) -> str:
        """Get URL/path for stored data (async).

        Args:
            key: Storage key/path

        Returns:
            Storage URL/path
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.mapping.get_url, key)

    async def list_keys(self, prefix: str = '') -> list[str]:
        """List all keys matching prefix (async).

        Args:
            prefix: Optional key prefix filter

        Returns:
            List of matching keys
        """
        loop = asyncio.get_event_loop()
        all_keys = await loop.run_in_executor(None, list, self.mapping)

        if prefix:
            return [k for k in all_keys if k.startswith(prefix)]
        return all_keys


def get_storage_facade() -> StorageFacade:
    """Factory function to get configured storage facade.

    Returns:
        Configured storage facade with appropriate backend

    Example:
        # In FastAPI dependency
        storage = get_storage_facade()
        await storage.save('file.txt', data)
    """
    if settings.storage_backend == 's3':
        if not settings.s3_bucket or not settings.s3_region:
            raise ValueError(
                "S3 bucket and region must be configured for S3 storage"
            )
        mapping = S3Mapping(
            bucket=settings.s3_bucket,
            region=settings.s3_region,
            prefix='aw-app/'  # Namespace for this app
        )
    else:
        mapping = LocalFilesystemMapping(settings.storage_path)

    return StorageFacade(mapping=mapping)
