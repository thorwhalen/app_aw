# AW App Frontend

React + TypeScript frontend for the AW (Agentic Workflows) interface.

## Features

- **Data Manager** - Upload and manage data files with drag & drop
- **Workflow Builder** - Visual workflow creation with multiple step types
- **Execution Monitor** - Real-time job progress tracking via WebSocket
- **Results Viewer** - Browse and download processed data

## Tech Stack

- React 18
- TypeScript
- Vite (build tool)
- TanStack Query (data fetching)
- Zustand (state management)
- Axios (HTTP client)
- React Dropzone (file uploads)
- Lucide React (icons)

## Development

### Setup

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Access at http://localhost:3000

The dev server proxies API requests to the backend at http://localhost:8000

### Build for Production

```bash
npm run build
```

Output in `dist/` directory

## Project Structure

```
src/
├── components/       # React components
│   ├── DataUpload.tsx
│   ├── DataList.tsx
│   ├── WorkflowBuilder.tsx
│   ├── WorkflowList.tsx
│   └── ExecutionMonitor.tsx
├── services/        # API and WebSocket clients
│   ├── api.ts
│   └── websocket.ts
├── store/           # Zustand state management
│   └── index.ts
├── types/           # TypeScript types
│   └── index.ts
├── App.tsx          # Main application
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## API Integration

The frontend communicates with the FastAPI backend through:

1. **REST API** - CRUD operations for workflows, data, and jobs
2. **WebSocket** - Real-time job progress updates

API base URL is configured via `VITE_API_BASE_URL` environment variable (defaults to `/api/v1`).

## Docker Deployment

Build and run with Docker:

```bash
docker build -t aw-frontend .
docker run -p 3000:80 aw-frontend
```

Or use Docker Compose (from project root):

```bash
cd docker
docker-compose up
```

## Components

### DataUpload

Drag & drop file upload with support for CSV, JSON, and TXT files.

### WorkflowBuilder

Create workflows by:
1. Adding workflow name and description
2. Adding steps (loading, preparing, validation)
3. Configuring each step
4. Saving the workflow

### WorkflowList

Lists all created workflows with options to:
- Execute with optional input data
- Delete workflows

### ExecutionMonitor

Real-time monitoring of job execution:
- Live status updates
- Progress bar (0-100%)
- Error messages
- Result download link on completion

Uses WebSocket for instant updates without polling.

## Environment Variables

Create `.env` file (see `.env.example`):

```env
VITE_API_BASE_URL=/api/v1
VITE_WS_BASE_URL=ws://localhost:8000
```

## Development Notes

- Uses Vite dev server with HMR (Hot Module Replacement)
- API requests proxied to avoid CORS issues
- WebSocket connections use relative URLs
- All TypeScript types match backend Pydantic schemas

## Production Deployment

The production build:
1. Builds optimized static files with Vite
2. Serves via Nginx
3. Proxies API and WebSocket requests to backend
4. Enables gzip compression
5. Caches static assets

See `nginx.conf` for Nginx configuration.
