# 🚀 Crypto Live Dashboard - Deployment Guide

**Developed by Luis Suarez**

This guide covers how to run and deploy both the backend API and frontend application for the Crypto Live Dashboard.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker)](#quick-start-docker)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Crypto Live Dashboard consists of two main components:

1. **Backend API** (NestJS) - Handles WebSocket connections, data aggregation, and database operations
2. **Frontend SPA** (React) - Static single-page application that connects to the backend

```
┌─────────────────┐    WebSocket     ┌─────────────────┐    REST API    ┌─────────────────┐
│   React SPA     │◄────────────────►│   NestJS API    │◄──────────────►│  Finnhub API    │
│  (Static Files) │                  │   (Docker)      │                │                 │
└─────────────────┘                  └─────────────────┘                └─────────────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │  SQLite DB      │
                                     │  (Persistent)   │
                                     └─────────────────┘
```

## 📋 Prerequisites

### Required
- **Docker** (for backend deployment)
- **Node.js 18+** (for frontend building and development)
- **Finnhub API Token** - Get free token at [finnhub.io](https://finnhub.io/)

### Optional (for development)
- **npm or pnpm** - Package manager
- **Git** - Version control

## 🐳 Quick Start (Docker)

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd crypto-live-dashboard

# Setup environment
cp .env.example .env
```

### 2. Configure Environment
Edit the `.env` file and set your Finnhub API token:
```env
FINNHUB_API_TOKEN=your_actual_token_here
```

### 3. Deploy Backend
```bash
# Make scripts executable (if needed)
chmod +x scripts/*.sh

# Deploy backend with Docker
./scripts/deploy-backend.sh
```

### 4. Build and Serve Frontend
```bash
# Build static files
./scripts/build-frontend.sh

# Serve frontend (choose one option)

# Option A: Python HTTP Server
cd frontend/dist && python3 -m http.server 8080

# Option B: Node.js serve
npx serve frontend/dist -p 8080

# Option C: Any static file server
# Upload frontend/dist/ to Netlify, Vercel, etc.
```

### 5. Access the Application
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health/live

## 💻 Development Setup

For local development with hot reloading:

### Backend Development
```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env and set FINNHUB_API_TOKEN

# Start development server
npm run start:dev
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Create environment file (optional)
cp .env.example .env.local
# Edit if you need custom API URLs

# Start development server
npm run dev
```

### Development URLs
- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:3000
- WebSocket: ws://localhost:3000/ws/quotes

## 🌐 Production Deployment

### Backend Deployment Options

#### Option 1: Docker Container Platforms
Deploy the backend to any container platform:

```bash
# Build Docker image
docker build -t crypto-dashboard-api ./backend

# Tag for your registry
docker tag crypto-dashboard-api your-registry/crypto-dashboard-api

# Push to registry
docker push your-registry/crypto-dashboard-api
```

**Recommended platforms:**
- **Railway** - `railway deploy`
- **Render** - Connect GitHub repo
- **DigitalOcean App Platform** - Import from GitHub
- **AWS ECS** - Deploy container
- **Google Cloud Run** - Deploy container

#### Option 2: Traditional VPS
```bash
# On your server
git clone <your-repo>
cd crypto-live-dashboard

# Setup environment
cp .env.example .env
# Configure .env with production values

# Deploy with Docker Compose
./scripts/deploy-backend.sh
```

### Frontend Deployment Options

The frontend builds to static files that can be deployed anywhere:

#### Option 1: Static Hosting (Recommended)
```bash
# Build static files
./scripts/build-frontend.sh

# Upload frontend/dist/ to:
```
- **Netlify** - Drag & drop `frontend/dist` folder
- **Vercel** - `npx vercel --cwd frontend/dist`
- **GitHub Pages** - Push to gh-pages branch
- **AWS S3 + CloudFront** - Upload to S3 bucket
- **Cloudflare Pages** - Connect GitHub repo

#### Option 2: CDN Deployment
```bash
# Build and sync to CDN
./scripts/build-frontend.sh
aws s3 sync frontend/dist s3://your-bucket --delete
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

#### Option 3: Traditional Web Server
```bash
# Copy built files to web server
./scripts/build-frontend.sh
scp -r frontend/dist/* user@server:/var/www/html/
```

### Production Environment Setup

#### Backend Environment Variables
```env
NODE_ENV=production
PORT=3000
FINNHUB_API_TOKEN=your_production_token
DATABASE_URL=sqlite:./data/quotes.sqlite

# Optional: For PostgreSQL in production
# DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

#### Frontend Environment Variables
```env
VITE_API_BASE=https://your-api-domain.com
VITE_WS_URL=wss://your-api-domain.com
```

## 🔧 Environment Variables

### Backend (.env)
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FINNHUB_API_TOKEN` | Finnhub API token | - | ✅ |
| `NODE_ENV` | Environment | `development` | ❌ |
| `PORT` | Server port | `3000` | ❌ |
| `DATABASE_URL` | Database connection | `sqlite:./data/quotes.sqlite` | ❌ |

### Frontend (.env.local)
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE` | Backend API URL | `http://localhost:3000` | ❌ |
| `VITE_WS_URL` | WebSocket URL | `http://localhost:3000` | ❌ |

## 🔍 Useful Commands

### Docker Commands
```bash
# View backend logs
docker logs -f crypto-dashboard-api

# Stop service
docker stop crypto-dashboard-api

# Start service
docker start crypto-dashboard-api

# Remove container
docker rm crypto-dashboard-api

# Rebuild and redeploy
./scripts/deploy-backend.sh

# Check service health
curl http://localhost:3000/health/live
```

### Development Commands
```bash
# Backend
cd backend
npm run start:dev      # Development server
npm run build         # Build for production
npm run test          # Run tests
npm run lint          # Lint code

# Frontend
cd frontend
npm run dev           # Development server
npm run build         # Build static files
npm run preview       # Preview built files
npm run lint          # Lint code
```

## 🔧 Troubleshooting

### Common Issues

#### Backend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Check Docker logs
docker-compose logs backend

# Verify environment variables
docker-compose config
```

#### Frontend can't connect to backend
1. Check if backend is running: `curl http://localhost:3000/health/live`
2. Verify CORS settings in backend
3. Check frontend environment variables
4. Look for WebSocket connection errors in browser console

#### Database issues
```bash
# Check if data directory exists and has permissions
ls -la data/

# Reset database (WARNING: loses all data)
docker-compose down
rm -rf data/
docker-compose up -d
```

#### Finnhub API issues
1. Verify your API token is correct
2. Check API rate limits
3. Ensure you have access to the symbols (ETH/USDC, ETH/USDT, ETH/BTC)

## 📄 License

© 2025 Luis Suarez
