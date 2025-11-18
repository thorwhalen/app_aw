#!/bin/bash
# Setup script for AW App

set -e

echo "🚀 Setting up AW App..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration"
fi

# Create data directory
echo "📁 Creating data directory..."
mkdir -p backend/data

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
cd ..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your OpenAI API key and other settings"
echo "2. Run 'bash scripts/dev.sh' to start the development server"
echo "   OR use Docker: 'cd docker && docker-compose up'"
