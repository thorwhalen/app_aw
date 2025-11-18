# AW App Interface - Implementation Plan

## Executive Summary

This document outlines the plan to build a web application interface for the `aw` (Agentic Workflows) library. The application will consist of:
- **Backend**: FastAPI-based HTTP service exposing aw's functionalities
- **Frontend**: Modern web UI for interacting with the workflows
- **Testing**: End-to-end tests covering user flows with Playwright
- **Deployment**: Local-first design with cloud-ready architecture

---

## 1. Understanding the AW Library

### Core Functionalities
The `aw` library provides an AI agent framework for data preparation workflows with:

1. **Data Loading** - LoadingAgent for ingesting various data formats
2. **Data Preparation** - PreparationAgent for transforming data
3. **Validation** - Three approaches (schema, info-dict, functional)
4. **Code Execution** - Safe code interpreter with extensible backends
5. **Workflow Orchestration** - Compose agents with retry logic and human-in-loop
6. **Cosmograph Integration** - Specialized validators for visualization

### Key API Patterns
```python
# Simple facade
load_for_cosmo('data.csv') → (dataframe, metadata)

# Agent-based
LoadingAgent().execute(input, context) → (artifact, metadata)
PreparationAgent(target='cosmo-ready').execute(df, context) → (result, metadata)

# Workflow composition
create_cosmo_prep_workflow().run(input) → (result, metadata)
```

---

## 2. Architecture Design

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  - Workflow Builder UI                                   │
│  - Data Upload Interface                                 │
│  - Results Visualization                                 │
│  - Configuration Management                              │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP/REST + WebSocket
┌────────────────▼────────────────────────────────────────┐
│              FastAPI Backend                             │
│  - REST Endpoints                                        │
│  - WebSocket for real-time updates                      │
│  - Background task management (Celery/Redis)            │
│  - Session/context management                           │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                  AW Library Layer                        │
│  - LoadingAgent, PreparationAgent                       │
│  - Validators, Tools                                    │
│  - Workflow orchestration                               │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Design Principles for Cloud-Ready Architecture

**Local-First Features:**
- SQLite for local development
- File-based storage for artifacts
- In-memory caching
- Single-instance design

**Cloud-Ready Features:**
- Database abstraction layer (SQLAlchemy)
- Object storage interface (S3-compatible)
- Stateless API design
- Environment-based configuration
- Container-ready (Docker)
- Horizontal scaling support via background workers

---

## 3. Project Structure

```
app_aw/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application
│   │   ├── config.py               # Configuration management
│   │   ├── dependencies.py         # Dependency injection
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── workflows.py    # Workflow endpoints
│   │   │   │   ├── data.py         # Data upload/download
│   │   │   │   ├── agents.py       # Agent configuration
│   │   │   │   ├── validation.py   # Validation endpoints
│   │   │   │   └── jobs.py         # Background job status
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── database.py         # SQLAlchemy models
│   │   │   └── schemas.py          # Pydantic schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── workflow_service.py
│   │   │   ├── data_service.py
│   │   │   ├── agent_service.py
│   │   │   └── storage_service.py  # Abstraction for file/object storage
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── aw_wrapper.py       # Wrapper around aw library
│   │   │   ├── context_manager.py  # Context/session management
│   │   │   └── task_queue.py       # Background task handling
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── helpers.py
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── conftest.py
│   ├── alembic/                    # Database migrations
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── Dockerfile
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── DataUpload.tsx
│   │   │   ├── WorkflowBuilder.tsx
│   │   │   ├── AgentConfig.tsx
│   │   │   ├── ResultsViewer.tsx
│   │   │   └── ValidationPanel.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Workflows.tsx
│   │   │   ├── DataManager.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/
│   │   │   ├── api.ts              # API client
│   │   │   └── websocket.ts        # WebSocket client
│   │   ├── store/                  # State management (Zustand/Redux)
│   │   ├── hooks/
│   │   └── types/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── tests/
│   └── e2e/
│       ├── playwright.config.ts
│       ├── fixtures/                # Test data
│       ├── page-objects/            # Page object models
│       └── scenarios/
│           ├── data-loading.spec.ts
│           ├── workflow-creation.spec.ts
│           ├── validation-flow.spec.ts
│           └── end-to-end-cosmo.spec.ts
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── nginx.conf
│
├── scripts/
│   ├── setup.sh
│   ├── dev.sh
│   └── test.sh
│
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── USER_GUIDE.md
│
├── .env.example
├── .gitignore
├── README.md
└── IMPLEMENTATION_PLAN.md
```

---

## 4. Backend Implementation (FastAPI)

### 4.1 Core Endpoints

#### Workflow Management
```python
POST   /api/v1/workflows              # Create a new workflow
GET    /api/v1/workflows              # List all workflows
GET    /api/v1/workflows/{id}         # Get workflow details
PUT    /api/v1/workflows/{id}         # Update workflow
DELETE /api/v1/workflows/{id}         # Delete workflow
POST   /api/v1/workflows/{id}/execute # Execute workflow
GET    /api/v1/workflows/{id}/status  # Get execution status
```

#### Data Management
```python
POST   /api/v1/data/upload            # Upload data file
GET    /api/v1/data/{id}              # Download/preview data
DELETE /api/v1/data/{id}              # Delete data
GET    /api/v1/data/{id}/sample       # Get data sample
GET    /api/v1/data/{id}/info         # Get data info/metadata
```

#### Agent Operations
```python
GET    /api/v1/agents                 # List available agents
POST   /api/v1/agents/loading/execute # Execute LoadingAgent
POST   /api/v1/agents/preparing/execute # Execute PreparationAgent
POST   /api/v1/agents/validate        # Validate data
```

#### Job Management
```python
GET    /api/v1/jobs                   # List all jobs
GET    /api/v1/jobs/{id}              # Get job status
POST   /api/v1/jobs/{id}/cancel       # Cancel running job
GET    /api/v1/jobs/{id}/result       # Get job result
```

#### Configuration
```python
GET    /api/v1/config                 # Get current configuration
PUT    /api/v1/config                 # Update configuration
GET    /api/v1/config/llm-models      # List available LLM models
```

### 4.2 WebSocket Endpoints

```python
WS     /ws/jobs/{job_id}              # Real-time job progress updates
WS     /ws/workflows/{workflow_id}    # Real-time workflow execution
```

### 4.3 Request/Response Schemas

#### Workflow Creation
```json
// POST /api/v1/workflows
{
  "name": "Data Prep for Visualization",
  "description": "Load CSV and prepare for Cosmograph",
  "steps": [
    {
      "type": "loading",
      "config": {
        "max_retries": 3
      }
    },
    {
      "type": "preparing",
      "config": {
        "target": "cosmo-ready",
        "max_retries": 5
      }
    }
  ],
  "global_config": {
    "llm": "gpt-4",
    "max_retries": 3
  }
}

// Response
{
  "id": "wf-123",
  "name": "Data Prep for Visualization",
  "created_at": "2025-11-16T10:00:00Z",
  "updated_at": "2025-11-16T10:00:00Z",
  "status": "ready"
}
```

#### Workflow Execution
```json
// POST /api/v1/workflows/{id}/execute
{
  "input_data_id": "data-456",  // or
  "input_file": "<uploaded-file>",
  "parameters": {
    "require_approval": false
  }
}

// Response
{
  "job_id": "job-789",
  "workflow_id": "wf-123",
  "status": "queued",
  "created_at": "2025-11-16T10:05:00Z"
}
```

### 4.4 Background Job Processing

Use **Celery** with **Redis** for background task management:

```python
# app/core/task_queue.py
from celery import Celery

celery_app = Celery(
    'aw_tasks',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

@celery_app.task
def execute_workflow_task(workflow_id: str, input_data: Any):
    # Execute aw workflow
    # Update job status
    # Store results
    pass
```

### 4.5 Database Models

```python
# app/models/database.py
from sqlalchemy import Column, String, JSON, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    steps = Column(JSON, nullable=False)
    global_config = Column(JSON)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True)
    workflow_id = Column(String)
    status = Column(Enum('queued', 'running', 'completed', 'failed'))
    input_data_id = Column(String)
    result_data_id = Column(String)
    metadata = Column(JSON)
    error = Column(String)
    created_at = Column(DateTime)
    completed_at = Column(DateTime)

class DataArtifact(Base):
    __tablename__ = "data_artifacts"

    id = Column(String, primary_key=True)
    filename = Column(String)
    storage_path = Column(String)
    size_bytes = Column(Integer)
    content_type = Column(String)
    metadata = Column(JSON)
    created_at = Column(DateTime)
```

---

## 5. Frontend Implementation

### 5.1 Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand (lightweight) or Redux Toolkit
- **UI Components**: shadcn/ui or Material-UI
- **Data Fetching**: TanStack Query (React Query)
- **WebSocket**: native WebSocket API or socket.io-client
- **Data Visualization**: Recharts or D3.js for results
- **Forms**: React Hook Form with Zod validation

### 5.2 Key Features/Pages

#### 1. Dashboard/Home
- Overview of recent workflows
- Quick actions (upload data, create workflow)
- System status

#### 2. Data Manager
- Upload files (drag & drop)
- View uploaded datasets
- Preview data (first N rows)
- View data info/metadata
- Delete datasets

#### 3. Workflow Builder
- Visual workflow builder (drag & drop steps)
- Configure agents (LoadingAgent, PreparationAgent)
- Set validation rules
- Configure LLM settings
- Save and name workflows

#### 4. Workflow Execution
- Select input data
- Execute workflow
- Real-time progress updates (WebSocket)
- Approve steps (human-in-loop)
- View logs and intermediate results

#### 5. Results Viewer
- Display processed data
- Download results (CSV, JSON, etc.)
- View metadata and execution logs
- Visualize data (if applicable)

#### 6. Settings
- Configure global LLM models
- Set default retry policies
- Manage API keys (encrypted)
- Storage settings

### 5.3 Component Examples

#### DataUpload Component
```tsx
// src/components/DataUpload.tsx
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { uploadData } from '../services/api';

export function DataUpload() {
  const uploadMutation = useMutation({
    mutationFn: uploadData,
    onSuccess: (data) => {
      // Handle success
    }
  });

  const onDrop = useCallback((files: File[]) => {
    const formData = new FormData();
    formData.append('file', files[0]);
    uploadMutation.mutate(formData);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()} className="dropzone">
      <input {...getInputProps()} />
      <p>Drag & drop a file here, or click to select</p>
    </div>
  );
}
```

#### WorkflowBuilder Component
```tsx
// src/components/WorkflowBuilder.tsx
import { useState } from 'react';
import { WorkflowStep } from '../types';

export function WorkflowBuilder() {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);

  const addStep = (type: 'loading' | 'preparing' | 'validation') => {
    setSteps([...steps, { type, config: {} }]);
  };

  return (
    <div className="workflow-builder">
      <div className="steps-container">
        {steps.map((step, idx) => (
          <StepCard key={idx} step={step} />
        ))}
      </div>
      <div className="add-step-buttons">
        <button onClick={() => addStep('loading')}>Add Loading Step</button>
        <button onClick={() => addStep('preparing')}>Add Preparing Step</button>
        <button onClick={() => addStep('validation')}>Add Validation Step</button>
      </div>
    </div>
  );
}
```

#### Real-time Execution Monitor
```tsx
// src/components/ExecutionMonitor.tsx
import { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export function ExecutionMonitor({ jobId }: { jobId: string }) {
  const [progress, setProgress] = useState<any>(null);

  const { message } = useWebSocket(`/ws/jobs/${jobId}`);

  useEffect(() => {
    if (message) {
      setProgress(message);
    }
  }, [message]);

  return (
    <div className="execution-monitor">
      <h3>Job Status: {progress?.status}</h3>
      <ProgressBar value={progress?.percentage} />
      <LogViewer logs={progress?.logs} />
    </div>
  );
}
```

---

## 6. End-to-End Testing Strategy

### 6.1 Testing Framework

- **Tool**: Playwright (preferred for modern features, multi-browser support)
- **Alternative**: Selenium (if team is more familiar)
- **Language**: TypeScript
- **Test Runner**: Playwright Test

### 6.2 User Story Test Scenarios

#### Scenario 1: Basic Data Loading and Preparation
```typescript
// tests/e2e/scenarios/data-loading.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Data Loading User Flow', () => {
  test('User uploads CSV and loads it through LoadingAgent', async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Upload data
    await page.click('[data-testid="upload-button"]');
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/sample.csv');
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();

    // Verify data appears in data manager
    await page.click('[data-testid="data-manager-link"]');
    await expect(page.locator('text=sample.csv')).toBeVisible();

    // Preview data
    await page.click('[data-testid="preview-button"]');
    await expect(page.locator('[data-testid="data-table"]')).toBeVisible();

    // Check metadata
    const rowCount = await page.locator('[data-testid="row-count"]').textContent();
    expect(parseInt(rowCount!)).toBeGreaterThan(0);
  });
});
```

#### Scenario 2: Complete Workflow Creation and Execution
```typescript
// tests/e2e/scenarios/workflow-creation.spec.ts
test.describe('Workflow Creation and Execution', () => {
  test('User creates and executes a cosmo preparation workflow', async ({ page }) => {
    // Navigate to workflow builder
    await page.goto('/workflows/new');

    // Set workflow name
    await page.fill('[data-testid="workflow-name"]', 'Test Cosmo Workflow');

    // Add loading step
    await page.click('[data-testid="add-loading-step"]');
    await page.selectOption('[data-testid="agent-type"]', 'loading');

    // Add preparation step
    await page.click('[data-testid="add-step"]');
    await page.selectOption('[data-testid="agent-type"]', 'preparing');
    await page.selectOption('[data-testid="target-type"]', 'cosmo-ready');

    // Save workflow
    await page.click('[data-testid="save-workflow"]');
    await expect(page.locator('text=Workflow saved')).toBeVisible();

    // Execute workflow
    const workflowId = await page.getAttribute('[data-testid="workflow-id"]', 'data-id');
    await page.click('[data-testid="execute-workflow"]');

    // Select input data
    await page.selectOption('[data-testid="input-data"]', 'sample.csv');
    await page.click('[data-testid="start-execution"]');

    // Wait for completion
    await expect(page.locator('[data-testid="job-status"]')).toContainText('completed', {
      timeout: 60000
    });

    // Verify results
    await page.click('[data-testid="view-results"]');
    await expect(page.locator('[data-testid="result-data"]')).toBeVisible();

    // Download results
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-results"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});
```

#### Scenario 3: Validation Flow
```typescript
// tests/e2e/scenarios/validation-flow.spec.ts
test.describe('Data Validation Flow', () => {
  test('User validates data with schema validator', async ({ page }) => {
    await page.goto('/validation');

    // Select data
    await page.selectOption('[data-testid="data-select"]', 'sample.csv');

    // Choose validation type
    await page.click('[data-testid="validation-type-schema"]');

    // Configure schema (simplified)
    await page.fill('[data-testid="schema-config"]', JSON.stringify({
      columns: ['id', 'name', 'value']
    }));

    // Run validation
    await page.click('[data-testid="run-validation"]');

    // Check results
    await expect(page.locator('[data-testid="validation-result"]')).toContainText('valid');

    // View validation details
    await page.click('[data-testid="validation-details"]');
    await expect(page.locator('[data-testid="validation-report"]')).toBeVisible();
  });
});
```

#### Scenario 4: Human-in-Loop Workflow
```typescript
// tests/e2e/scenarios/human-in-loop.spec.ts
test.describe('Human-in-Loop Workflow', () => {
  test('User approves intermediate steps in workflow', async ({ page }) => {
    await page.goto('/workflows/new');

    // Create workflow with approval required
    await page.fill('[data-testid="workflow-name"]', 'Approval Required Workflow');
    await page.click('[data-testid="add-loading-step"]');
    await page.check('[data-testid="require-approval"]');
    await page.click('[data-testid="save-workflow"]');

    // Execute
    await page.click('[data-testid="execute-workflow"]');
    await page.selectOption('[data-testid="input-data"]', 'sample.csv');
    await page.click('[data-testid="start-execution"]');

    // Wait for approval request
    await expect(page.locator('[data-testid="approval-modal"]')).toBeVisible({
      timeout: 30000
    });

    // Review intermediate result
    await expect(page.locator('[data-testid="intermediate-result"]')).toBeVisible();

    // Approve
    await page.click('[data-testid="approve-button"]');

    // Wait for completion
    await expect(page.locator('[data-testid="job-status"]')).toContainText('completed', {
      timeout: 60000
    });
  });
});
```

#### Scenario 5: Error Handling and Retry
```typescript
// tests/e2e/scenarios/error-handling.spec.ts
test.describe('Error Handling', () => {
  test('Workflow fails gracefully and shows error details', async ({ page }) => {
    // Upload invalid data
    await page.goto('/data');
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/invalid.txt');

    // Try to execute workflow
    await page.goto('/workflows');
    await page.click('[data-testid="workflow-item"]:first-child');
    await page.click('[data-testid="execute-workflow"]');
    await page.selectOption('[data-testid="input-data"]', 'invalid.txt');
    await page.click('[data-testid="start-execution"]');

    // Wait for failure
    await expect(page.locator('[data-testid="job-status"]')).toContainText('failed', {
      timeout: 60000
    });

    // Check error message
    await page.click('[data-testid="view-error"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    // Verify retry count was attempted
    const retryCount = await page.locator('[data-testid="retry-count"]').textContent();
    expect(parseInt(retryCount!)).toBeGreaterThan(0);
  });
});
```

### 6.3 Test Infrastructure

```typescript
// tests/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './scenarios',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: [
    {
      command: 'cd backend && uvicorn app.main:app --port 8000',
      port: 8000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd frontend && npm run dev',
      port: 3000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

### 6.4 Page Object Models

```typescript
// tests/e2e/page-objects/WorkflowPage.ts
import { Page, Locator } from '@playwright/test';

export class WorkflowPage {
  readonly page: Page;
  readonly workflowNameInput: Locator;
  readonly addStepButton: Locator;
  readonly saveButton: Locator;
  readonly executeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.workflowNameInput = page.locator('[data-testid="workflow-name"]');
    this.addStepButton = page.locator('[data-testid="add-step"]');
    this.saveButton = page.locator('[data-testid="save-workflow"]');
    this.executeButton = page.locator('[data-testid="execute-workflow"]');
  }

  async goto() {
    await this.page.goto('/workflows/new');
  }

  async createWorkflow(name: string, steps: any[]) {
    await this.workflowNameInput.fill(name);

    for (const step of steps) {
      await this.addStepButton.click();
      // Configure step...
    }

    await this.saveButton.click();
  }

  async executeWorkflow(inputDataId: string) {
    await this.executeButton.click();
    await this.page.selectOption('[data-testid="input-data"]', inputDataId);
    await this.page.click('[data-testid="start-execution"]');
  }
}
```

---

## 7. Cloud-Ready Design Considerations

### 7.1 Configuration Management

Use environment-based configuration:

```python
# backend/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./aw_app.db"  # Local default

    # Storage
    storage_backend: str = "local"  # "local" or "s3"
    storage_path: str = "./data"
    s3_bucket: str | None = None
    s3_region: str | None = None

    # Redis/Celery
    redis_url: str = "redis://localhost:6379/0"

    # LLM
    openai_api_key: str | None = None
    default_llm: str = "gpt-4"

    # App
    debug: bool = True
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

settings = Settings()
```

### 7.2 Storage Abstraction

```python
# backend/app/services/storage_service.py
from abc import ABC, abstractmethod

class StorageBackend(ABC):
    @abstractmethod
    def save(self, key: str, data: bytes) -> str:
        pass

    @abstractmethod
    def load(self, key: str) -> bytes:
        pass

    @abstractmethod
    def delete(self, key: str) -> None:
        pass

class LocalStorage(StorageBackend):
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(exist_ok=True)

    def save(self, key: str, data: bytes) -> str:
        path = self.base_path / key
        path.write_bytes(data)
        return str(path)

class S3Storage(StorageBackend):
    def __init__(self, bucket: str, region: str):
        self.s3 = boto3.client('s3', region_name=region)
        self.bucket = bucket

    def save(self, key: str, data: bytes) -> str:
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=data)
        return f"s3://{self.bucket}/{key}"

def get_storage_backend() -> StorageBackend:
    if settings.storage_backend == "s3":
        return S3Storage(settings.s3_bucket, settings.s3_region)
    return LocalStorage(settings.storage_path)
```

### 7.3 Database Migration Strategy

Use Alembic for schema migrations:

```bash
# Initialize
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Add workflows table"

# Apply migrations
alembic upgrade head
```

### 7.4 Containerization

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  backend:
    build: ../backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/awapp
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - ./data:/app/data

  frontend:
    build: ../frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: awapp
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  celery_worker:
    build: ../backend
    command: celery -A app.core.task_queue worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/awapp
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
```

### 7.5 Horizontal Scaling Considerations

- **Stateless API**: No session state in API servers
- **Shared Storage**: Use S3 or shared file system for artifacts
- **Task Queue**: Celery workers can be scaled independently
- **Database Connection Pooling**: Use SQLAlchemy pooling
- **Caching**: Add Redis for caching (beyond task queue)
- **Load Balancer**: NGINX or cloud load balancer

---

## 8. Development Workflow & Iteration Plan

### Phase 1: Foundation (Week 1-2)
**Goal**: Set up project structure and basic backend

**Tasks**:
1. Initialize project structure
2. Set up FastAPI with basic endpoints
3. Implement database models and migrations
4. Create AW library wrapper/integration
5. Set up development environment (Docker Compose)

**Deliverables**:
- Working backend with basic CRUD for workflows
- Database schema
- Docker setup for local development

### Phase 2: Core Backend Features (Week 3-4)
**Goal**: Implement core workflow execution

**Tasks**:
1. Implement workflow execution engine
2. Set up Celery for background tasks
3. Add WebSocket support for real-time updates
4. Implement storage abstraction layer
5. Add comprehensive error handling

**Deliverables**:
- Workflow execution API
- Background job processing
- Real-time status updates

### Phase 3: Frontend Foundation (Week 5-6)
**Goal**: Build basic UI

**Tasks**:
1. Set up React + TypeScript project
2. Implement data upload functionality
3. Create workflow builder UI
4. Build execution monitor
5. Add results viewer

**Deliverables**:
- Working frontend with core features
- Integration with backend API

### Phase 4: Advanced Features (Week 7-8)
**Goal**: Add advanced functionality

**Tasks**:
1. Implement human-in-loop approval flow
2. Add validation UI and flows
3. Create configuration management
4. Add data visualization
5. Implement error recovery

**Deliverables**:
- Complete feature set
- Polished UI/UX

### Phase 5: Testing (Week 9-10)
**Goal**: Comprehensive testing

**Tasks**:
1. Set up Playwright testing framework
2. Write E2E tests for all user stories
3. Add integration tests for backend
4. Performance testing
5. Fix bugs and issues

**Deliverables**:
- Full E2E test suite
- Test coverage reports
- Bug fixes

### Phase 6: Cloud Preparation (Week 11-12)
**Goal**: Prepare for cloud deployment

**Tasks**:
1. Implement cloud storage backend (S3)
2. Database migration to PostgreSQL
3. Add authentication/authorization
4. Performance optimization
5. Security hardening
6. Documentation

**Deliverables**:
- Cloud-ready application
- Deployment documentation
- Security audit

### Iteration Strategy

**Daily**:
- Commit code frequently
- Run unit tests
- Update progress in task tracker

**Weekly**:
- Review and demo progress
- Run E2E tests
- Gather feedback
- Adjust priorities

**Bi-weekly**:
- Sprint planning
- Retrospective
- Update documentation

---

## 9. Testing Strategy Summary

### Test Pyramid

```
        ╱╲
       ╱  ╲     E2E Tests (Playwright)
      ╱────╲    - User story scenarios
     ╱      ╲   - Full stack integration
    ╱────────╲
   ╱          ╲ Integration Tests (pytest)
  ╱────────────╲ - API endpoint tests
 ╱              ╲ - Database tests
╱────────────────╲ Unit Tests (pytest + Jest)
──────────────────  - Business logic
                    - Component tests
```

### Test Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: All critical user flows

### Continuous Integration

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install backend dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run backend tests
        run: |
          cd backend
          pytest tests/

      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci

      - name: Run frontend tests
        run: |
          cd frontend
          npm test

      - name: Install Playwright
        run: |
          cd tests/e2e
          npm ci
          npx playwright install --with-deps

      - name: Run E2E tests
        run: |
          cd tests/e2e
          npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests/e2e/playwright-report/
```

---

## 10. Documentation Plan

### User Documentation

1. **Getting Started Guide**
   - Installation instructions
   - First workflow tutorial
   - Basic concepts

2. **User Guide**
   - Data upload and management
   - Creating workflows
   - Executing and monitoring
   - Validation strategies
   - Results and exports

3. **API Documentation**
   - Auto-generated from FastAPI (Swagger/OpenAPI)
   - Example requests/responses
   - Authentication guide

### Developer Documentation

1. **Architecture Overview**
   - System design
   - Component interactions
   - Data flow diagrams

2. **Setup Guide**
   - Development environment setup
   - Running locally
   - Running tests

3. **Contributing Guide**
   - Code style
   - Testing requirements
   - PR process

4. **Deployment Guide**
   - Local deployment
   - Cloud deployment (AWS/GCP/Azure)
   - Configuration options
   - Scaling strategies

---

## 11. Success Metrics

### Technical Metrics
- API response time < 200ms (p95)
- Workflow execution time (varies by data size)
- Test coverage > 80%
- Zero critical security vulnerabilities

### User Experience Metrics
- Time to first workflow execution < 5 minutes
- Error rate < 1%
- UI load time < 2 seconds

### Reliability Metrics
- Uptime > 99.9%
- Successful workflow completion rate > 95%
- Data loss incidents = 0

---

## 12. Risk Assessment & Mitigation

### Technical Risks

**Risk**: LLM API failures or rate limits
- **Mitigation**: Implement retry logic, fallback models, rate limiting

**Risk**: Large data file handling
- **Mitigation**: Streaming uploads, chunked processing, size limits

**Risk**: Long-running workflows timeout
- **Mitigation**: Background job queue, progress checkpoints, resumable execution

**Risk**: Concurrent execution conflicts
- **Mitigation**: Database transactions, job locking, queue management

### Security Risks

**Risk**: Unauthorized access to data
- **Mitigation**: Authentication/authorization, encrypted storage, access logs

**Risk**: Code injection via CodeInterpreter
- **Mitigation**: Sandboxed execution, input validation, output sanitization

**Risk**: API key exposure
- **Mitigation**: Environment variables, secret management, encryption at rest

---

## 13. Future Enhancements

### Phase 7+ (Post-MVP)

1. **Multi-user Support**
   - User accounts and authentication
   - Team workspaces
   - Role-based access control

2. **Workflow Templates**
   - Pre-built workflows for common use cases
   - Community workflow sharing
   - Template marketplace

3. **Advanced Visualizations**
   - Interactive data exploration
   - Cosmograph integration
   - Custom visualization plugins

4. **Scheduling & Automation**
   - Scheduled workflow execution
   - Trigger-based automation
   - Webhook integrations

5. **Monitoring & Analytics**
   - Execution history and trends
   - Performance analytics
   - Cost tracking

6. **Plugin System**
   - Custom agents
   - Custom validators
   - Third-party integrations

---

## 14. Technology Stack Summary

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Database**: SQLite (local), PostgreSQL (production)
- **ORM**: SQLAlchemy
- **Task Queue**: Celery + Redis
- **Validation**: Pydantic
- **Testing**: pytest, pytest-asyncio

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **State**: Zustand or Redux Toolkit
- **UI Library**: shadcn/ui or Material-UI
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest, React Testing Library

### E2E Testing
- **Framework**: Playwright
- **Language**: TypeScript
- **Browsers**: Chromium, Firefox
- **CI Integration**: GitHub Actions

### Infrastructure
- **Containerization**: Docker, Docker Compose
- **Web Server**: NGINX
- **Storage**: Local FS (local), S3 (cloud)
- **CI/CD**: GitHub Actions

### Core Dependency
- **AW Library**: thorwhalen/aw

---

## 15. Next Steps

1. **Review and approve this plan**
2. **Set up repository and project management**
3. **Begin Phase 1: Foundation**
4. **Iterate based on feedback**

---

## Appendix A: API Endpoint Reference

See Section 4.1 for complete endpoint listing.

## Appendix B: Database Schema

See Section 4.5 for database models.

## Appendix C: Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=sqlite:///./aw_app.db

# Storage
STORAGE_BACKEND=local
STORAGE_PATH=./data

# Redis
REDIS_URL=redis://localhost:6379/0

# LLM
OPENAI_API_KEY=your-key-here
DEFAULT_LLM=gpt-4

# App Config
DEBUG=true
CORS_ORIGINS=http://localhost:3000

# Cloud (when ready)
# DATABASE_URL=postgresql://user:pass@host:5432/awapp
# STORAGE_BACKEND=s3
# S3_BUCKET=my-aw-bucket
# S3_REGION=us-east-1
```

---

**End of Implementation Plan**
