#!/bin/bash
# Development server script

set -e

echo "🚀 Starting AW App development server..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run 'bash scripts/setup.sh' first."
    exit 1
fi

# Start Redis in background (if not running)
if ! pgrep -x "redis-server" > /dev/null; then
    echo "🔴 Starting Redis..."
    redis-server --daemonize yes
fi

# Start backend
echo "🔧 Starting FastAPI backend..."
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
