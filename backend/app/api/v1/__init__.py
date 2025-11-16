"""API v1 routers."""

from fastapi import APIRouter

from app.api.v1 import data, health, workflows

api_router = APIRouter()

# Include sub-routers
api_router.include_router(health.router, tags=["health"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
api_router.include_router(data.router, prefix="/data", tags=["data"])
