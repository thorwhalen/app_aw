"""API v1 routers."""

from fastapi import APIRouter

from app.api.v1 import auth, data, health, jobs, workflows

api_router = APIRouter()

# Include sub-routers
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
api_router.include_router(data.router, prefix="/data", tags=["data"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
