"""Integration tests for API endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Test root endpoint."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert "version" in data


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_create_workflow(client: AsyncClient):
    """Test creating a workflow."""
    workflow_data = {
        "name": "Test Workflow",
        "description": "A test workflow",
        "steps": [
            {"type": "loading", "config": {}},
            {"type": "preparing", "config": {"target": "cosmo-ready"}},
        ],
    }

    response = await client.post("/api/v1/workflows", json=workflow_data)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Workflow"
    assert len(data["steps"]) == 2
    assert "id" in data


@pytest.mark.asyncio
async def test_list_workflows(client: AsyncClient):
    """Test listing workflows."""
    # Create a workflow first
    workflow_data = {
        "name": "Test Workflow",
        "steps": [{"type": "loading", "config": {}}],
    }
    await client.post("/api/v1/workflows", json=workflow_data)

    # List workflows
    response = await client.get("/api/v1/workflows")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


@pytest.mark.asyncio
async def test_get_workflow(client: AsyncClient):
    """Test getting a specific workflow."""
    # Create a workflow
    workflow_data = {
        "name": "Test Workflow",
        "steps": [{"type": "loading", "config": {}}],
    }
    create_response = await client.post("/api/v1/workflows", json=workflow_data)
    workflow_id = create_response.json()["id"]

    # Get the workflow
    response = await client.get(f"/api/v1/workflows/{workflow_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == workflow_id
    assert data["name"] == "Test Workflow"


@pytest.mark.asyncio
async def test_delete_workflow(client: AsyncClient):
    """Test deleting a workflow."""
    # Create a workflow
    workflow_data = {
        "name": "Test Workflow",
        "steps": [{"type": "loading", "config": {}}],
    }
    create_response = await client.post("/api/v1/workflows", json=workflow_data)
    workflow_id = create_response.json()["id"]

    # Delete the workflow
    response = await client.delete(f"/api/v1/workflows/{workflow_id}")
    assert response.status_code == 204

    # Verify it's gone
    get_response = await client.get(f"/api/v1/workflows/{workflow_id}")
    assert get_response.status_code == 404
