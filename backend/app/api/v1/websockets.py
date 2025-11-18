"""WebSocket endpoints for real-time updates."""

import asyncio
import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.database import Job

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections."""

    def __init__(self):
        """Initialize connection manager."""
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: str):
        """Accept a new WebSocket connection.

        Args:
            websocket: WebSocket connection
            job_id: Job ID to monitor
        """
        await websocket.accept()

        if job_id not in self.active_connections:
            self.active_connections[job_id] = []

        self.active_connections[job_id].append(websocket)

    def disconnect(self, websocket: WebSocket, job_id: str):
        """Remove a WebSocket connection.

        Args:
            websocket: WebSocket connection
            job_id: Job ID
        """
        if job_id in self.active_connections:
            self.active_connections[job_id].remove(websocket)

            if not self.active_connections[job_id]:
                del self.active_connections[job_id]

    async def send_update(self, job_id: str, message: dict[str, Any]):
        """Send update to all connections for a job.

        Args:
            job_id: Job ID
            message: Message to send
        """
        if job_id not in self.active_connections:
            return

        disconnected = []

        for connection in self.active_connections[job_id]:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection, job_id)


manager = ConnectionManager()


@router.websocket("/jobs/{job_id}")
async def job_updates_websocket(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time job updates.

    Args:
        websocket: WebSocket connection
        job_id: Job ID to monitor
    """
    await manager.connect(websocket, job_id)

    try:
        # Send initial job status
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()

            if not job:
                await websocket.send_json({"error": "Job not found"})
                await websocket.close()
                return

            # Send initial state
            await websocket.send_json({
                "type": "status",
                "job_id": job.id,
                "status": job.status,
                "progress": job.progress,
                "created_at": job.created_at.isoformat() if job.created_at else None,
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            })

        # Poll for updates
        while True:
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Job).where(Job.id == job_id))
                job = result.scalar_one_or_none()

                if not job:
                    break

                # Send update
                await websocket.send_json({
                    "type": "status",
                    "job_id": job.id,
                    "status": job.status,
                    "progress": job.progress,
                    "error": job.error,
                    "metadata": job.job_metadata,
                })

                # If job is complete, send final message and close
                if job.status in ["completed", "failed", "cancelled"]:
                    await websocket.send_json({
                        "type": "complete",
                        "job_id": job.id,
                        "status": job.status,
                        "result_data_id": job.result_data_id,
                    })
                    break

            # Wait before next poll
            await asyncio.sleep(1)

    except WebSocketDisconnect:
        manager.disconnect(websocket, job_id)
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
    finally:
        manager.disconnect(websocket, job_id)
