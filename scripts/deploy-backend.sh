#!/bin/bash

# Deploy Backend with Docker
# This script builds and starts the backend API service

set -e

echo "🚀 Deploying Crypto Live Dashboard Backend..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found!"
    echo "📄 Copy .env.example to .env and configure your settings:"
    echo "   cp .env.example .env"
    echo ""
    echo "🔑 Don't forget to set your FINNHUB_API_TOKEN!"
    exit 1
fi

# Load environment variables
source .env

# Create data directory
echo "📁 Creating data directory..."
mkdir -p data

# Stop and remove existing container if it exists
echo "🧹 Cleaning up existing container..."
docker stop crypto-dashboard-api 2>/dev/null || true
docker rm crypto-dashboard-api 2>/dev/null || true

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t crypto-dashboard-api ./backend

# Run container
echo "🚀 Starting container..."
docker run -d \
  --name crypto-dashboard-api \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e FINNHUB_API_TOKEN="$FINNHUB_API_TOKEN" \
  -e DATABASE_URL="sqlite:./data/quotes.sqlite" \
  -v "$(pwd)/data:/app/data" \
  --restart unless-stopped \
  crypto-dashboard-api

echo "⏳ Waiting for service to be ready..."
sleep 15

# Check service health
if curl -f -s http://localhost:3000/health/live > /dev/null; then
    echo "✅ Backend deployed successfully!"
    echo ""
    echo "🌐 API is running at: http://localhost:3000"
    echo "🔍 Health check: http://localhost:3000/health/live"
    echo "📊 WebSocket: ws://localhost:3000/ws/quotes"
    echo ""
    echo "📋 Useful commands:"
    echo "   docker logs -f crypto-dashboard-api    # View logs"
    echo "   docker stop crypto-dashboard-api      # Stop service"
    echo "   docker start crypto-dashboard-api     # Start service"
    echo "   docker rm crypto-dashboard-api        # Remove container"
else
    echo "❌ Deployment failed! Check the logs:"
    docker logs crypto-dashboard-api
    exit 1
fi
