# AW App Backend

FastAPI backend for the AW (Agentic Workflows) interface.

## Features

- RESTful API for workflow management
- Data upload and management
- Integration with AW library
- SQLite database (development) / PostgreSQL (production)
- Storage abstraction (local filesystem / S3)
- Background job processing with Celery (Phase 2)

## Setup

### Local Development

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Copy environment file:
   ```bash
   cp ../.env.example ../.env
   ```

3. Update `.env` with your configuration

4. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

5. Access the API documentation:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Docker Development

```bash
cd ../docker
docker-compose up
```

## API Endpoints

### Health
- `GET /api/v1/health` - Health check

### Workflows
- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows` - List workflows
- `GET /api/v1/workflows/{id}` - Get workflow
- `PUT /api/v1/workflows/{id}` - Update workflow
- `DELETE /api/v1/workflows/{id}` - Delete workflow

### Data
- `POST /api/v1/data/upload` - Upload data file
- `GET /api/v1/data` - List data artifacts
- `GET /api/v1/data/{id}` - Get data artifact details
- `GET /api/v1/data/{id}/download` - Download data file
- `GET /api/v1/data/{id}/sample` - Get data sample
- `DELETE /api/v1/data/{id}` - Delete data artifact

## Project Structure

```
app/
├── api/
│   └── v1/
│       ├── health.py      # Health check endpoints
│       ├── workflows.py   # Workflow management
│       └── data.py        # Data management
├── core/
│   ├── database.py        # Database connection
│   └── aw_wrapper.py      # AW library wrapper
├── models/
│   ├── database.py        # SQLAlchemy models
│   └── schemas.py         # Pydantic schemas
├── services/
│   └── storage_service.py # Storage abstraction
├── config.py              # Configuration
├── dependencies.py        # FastAPI dependencies
└── main.py               # FastAPI application
```

## Testing

Run tests:
```bash
pytest
```

With coverage:
```bash
pytest --cov=app tests/
```

## Development

Format code:
```bash
black .
```

Lint:
```bash
ruff check .
```
