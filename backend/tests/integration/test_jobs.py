"""Integration tests for job endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_job(client: AsyncClient):
    """Test creating a job."""
    # First create a workflow
    workflow_data = {
        "name": "Test Workflow",
        "steps": [
            {"type": "loading", "config": {}},
            {"type": "preparing", "config": {"target": "cosmo-ready"}},
        ],
    }
    workflow_response = await client.post("/api/v1/workflows", json=workflow_data)
    workflow_id = workflow_response.json()["id"]

    # Create a job
    job_data = {
        "workflow_id": workflow_id,
        "parameters": {"test": "data"},
    }

    response = await client.post("/api/v1/jobs", json=job_data)
    assert response.status_code == 201
    data = response.json()
    assert data["workflow_id"] == workflow_id
    assert data["status"] == "queued"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_job(client: AsyncClient):
    """Test getting a job."""
    # Create a workflow and job
    workflow_data = {
        "name": "Test Workflow",
        "steps": [{"type": "loading", "config": {}}],
    }
    workflow_response = await client.post("/api/v1/workflows", json=workflow_data)
    workflow_id = workflow_response.json()["id"]

    job_data = {"workflow_id": workflow_id}
    job_response = await client.post("/api/v1/jobs", json=job_data)
    job_id = job_response.json()["id"]

    # Get the job
    response = await client.get(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == job_id
    assert data["workflow_id"] == workflow_id


@pytest.mark.asyncio
async def test_list_jobs(client: AsyncClient):
    """Test listing jobs."""
    # Create a workflow and job
    workflow_data = {
        "name": "Test Workflow",
        "steps": [{"type": "loading", "config": {}}],
    }
    workflow_response = await client.post("/api/v1/workflows", json=workflow_data)
    workflow_id = workflow_response.json()["id"]

    job_data = {"workflow_id": workflow_id}
    await client.post("/api/v1/jobs", json=job_data)

    # List jobs
    response = await client.get("/api/v1/jobs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


@pytest.mark.asyncio
async def test_list_jobs_with_filter(client: AsyncClient):
    """Test listing jobs with workflow filter."""
    # Create workflow and job
    workflow_data = {
        "name": "Test Workflow",
        "steps": [{"type": "loading", "config": {}}],
    }
    workflow_response = await client.post("/api/v1/workflows", json=workflow_data)
    workflow_id = workflow_response.json()["id"]

    job_data = {"workflow_id": workflow_id}
    await client.post("/api/v1/jobs", json=job_data)

    # List jobs filtered by workflow
    response = await client.get(f"/api/v1/jobs?workflow_id={workflow_id}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert all(job["workflow_id"] == workflow_id for job in data)


@pytest.mark.asyncio
async def test_workflow_execute_endpoint(client: AsyncClient):
    """Test executing a workflow."""
    # Create a workflow
    workflow_data = {
        "name": "Test Workflow",
        "steps": [
            {"type": "loading", "config": {}},
            {"type": "preparing", "config": {"target": "cosmo-ready"}},
        ],
    }
    workflow_response = await client.post("/api/v1/workflows", json=workflow_data)
    workflow_id = workflow_response.json()["id"]

    # Execute the workflow
    response = await client.post(f"/api/v1/workflows/{workflow_id}/execute")
    assert response.status_code == 201
    data = response.json()
    assert data["workflow_id"] == workflow_id
    assert data["status"] == "queued"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_job_result_not_completed(client: AsyncClient):
    """Test getting result of uncompleted job."""
    # Create workflow and job
    workflow_data = {
        "name": "Test Workflow",
        "steps": [{"type": "loading", "config": {}}],
    }
    workflow_response = await client.post("/api/v1/workflows", json=workflow_data)
    workflow_id = workflow_response.json()["id"]

    job_data = {"workflow_id": workflow_id}
    job_response = await client.post("/api/v1/jobs", json=job_data)
    job_id = job_response.json()["id"]

    # Try to get result (should fail since not completed)
    response = await client.get(f"/api/v1/jobs/{job_id}/result")
    assert response.status_code == 400
