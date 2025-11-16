# app_aw

An HTTP and GUI interface for the [aw](https://github.com/thorwhalen/aw) (Agentic Workflows) library.

## Status

- **Phase 1**: ✅ Complete - FastAPI backend foundation
- **Phase 2**: ✅ Complete - Core backend features & async execution
- **Phase 3**: ✅ Complete - React + TypeScript frontend
- **Phase 4**: ✅ Complete - Advanced UI features & visualization
- **Phase 5**: ✅ Complete - E2E testing with Playwright

## What's Been Built

### Backend (FastAPI)

Complete REST API with async support for workflow management, data handling, and asynchronous job execution.

**Key Features**:
- ✅ Workflow CRUD operations
- ✅ File upload and management
- ✅ Background job processing (Celery)
- ✅ Real-time updates (WebSocket)
- ✅ Local/cloud storage abstraction
- ✅ Comprehensive testing (11/12 passing)

### Frontend (React + TypeScript)

Modern web interface with real-time updates and intuitive UX.

**Key Features**:
- ✅ Drag & drop file uploads
- ✅ Visual workflow builder
- ✅ Real-time execution monitoring
- ✅ WebSocket integration
- ✅ Responsive design
- ✅ Production-ready Docker deployment
- ✅ Result data visualization with table preview
- ✅ Download functionality for job results
- ✅ Human-in-loop approval modal (ready for backend)

### Testing (Playwright E2E)

Comprehensive end-to-end testing covering all user workflows.

**Key Features**:
- ✅ 24 E2E tests across 4 scenarios
- ✅ Page Object Model architecture
- ✅ Auto-start servers in test environment
- ✅ Data loading, workflow creation, execution, error handling
- ✅ Screenshot/video capture on failure

## Quick Start

### Using Docker (Recommended)

```bash
cd docker
docker-compose up
```

Access:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Backend**: http://localhost:8000

### Local Development

**Backend**:
```bash
bash scripts/setup.sh
cd backend && uvicorn app.main:app --reload
```

**Frontend** (in separate terminal):
```bash
cd frontend
npm install
npm run dev
```

## Documentation

- [Implementation Plan](IMPLEMENTATION_PLAN.md) - Complete project roadmap
- [Phase 1 Summary](PHASE1_COMPLETE.md) - Backend foundation
- [Phase 2 Summary](PHASE2_COMPLETE.md) - Async execution
- [Phase 3 Summary](PHASE3_COMPLETE.md) - Frontend implementation
- [Phase 4 Summary](PHASE4_COMPLETE.md) - Advanced UI features
- [Phase 5 Summary](PHASE5_COMPLETE.md) - E2E testing
- [Backend README](backend/README.md) - Backend details
- [Frontend README](frontend/README.md) - Frontend details
- [E2E Testing README](tests/e2e/README.md) - Test documentation

## Testing

**Backend Tests**:
```bash
cd backend && pytest -v
```
Test Results: 11/12 passing (1 requires Docker environment)

**E2E Tests**:
```bash
cd tests/e2e && npm test
```
Test Results: 24 tests across 4 user scenarios

## Architecture

**Full Stack**:
- Frontend: React 18 + TypeScript + Vite
- Backend: FastAPI + SQLAlchemy + Celery
- Database: SQLite (local) / PostgreSQL (prod)
- Storage: Local filesystem / S3
- Real-time: WebSocket
- Queue: Redis + Celery workers

**Local-first, cloud-ready design**:
- **Local**: SQLite + filesystem + single container
- **Cloud**: PostgreSQL + S3 + horizontal scaling

## License

MIT
