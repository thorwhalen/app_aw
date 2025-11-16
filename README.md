# app_aw

An HTTP and GUI interface for the [aw](https://github.com/thorwhalen/aw) (Agentic Workflows) library.

## Status

- **Phase 1**: ✅ Complete - FastAPI backend foundation
- **Phase 2**: ✅ Complete - Core backend features & async execution
- **Phase 3**: 🔄 Planned - Frontend implementation

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

## Quick Start

### Using Docker

```bash
cd docker
docker-compose up
```

Access API docs at http://localhost:8000/docs

### Local Development

```bash
bash scripts/setup.sh
cd backend && uvicorn app.main:app --reload
```

## Documentation

- [Implementation Plan](IMPLEMENTATION_PLAN.md) - Complete project roadmap
- [Phase 1 Summary](PHASE1_COMPLETE.md) - Backend foundation
- [Phase 2 Summary](PHASE2_COMPLETE.md) - Async execution
- [Backend README](backend/README.md) - Backend details

## Testing

```bash
cd backend && pytest -v
```

**Test Results**: 11/12 passing

## Architecture

Local-first, cloud-ready design:
- **Local**: SQLite + filesystem
- **Cloud**: PostgreSQL + S3 + Celery workers

## License

MIT
