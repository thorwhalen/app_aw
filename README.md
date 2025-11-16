# app_aw

An HTTP and GUI interface for the [aw](https://github.com/thorwhalen/aw) (Agentic Workflows) library.

## Status

- **Phase 1**: ✅ Complete - FastAPI backend foundation
- **Phase 2**: ✅ Complete - Core backend features & async execution
- **Phase 3**: ✅ Complete - React + TypeScript frontend

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
- [Backend README](backend/README.md) - Backend details
- [Frontend README](frontend/README.md) - Frontend details

## Testing

```bash
cd backend && pytest -v
```

**Test Results**: 11/12 passing

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
