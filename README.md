# Crypto Live Dashboard

Real-time cryptocurrency dashboard with NestJS backend and React frontend. Streams live quotes for **ETH/USDC**, **ETH/USDT** and **ETH/BTC**, renders updating charts, and persists **hourly averages**.

## Architecture

- **Backend**: NestJS with TypeORM, WebSocket streaming, Finnhub API integration
- **Frontend**: React + TypeScript with Zustand state management, Recharts for live charts, Tailwind CSS styling
- **Database**: SQLite (development) / PostgreSQL (production)
- **Real-time**: WebSocket connection for live price updates

## Features

- 📈 Real-time price streaming from Finnhub
- 📊 Live updating charts with historical data
- 💾 Hourly price averaging and persistence
- 🔄 Automatic reconnection and error handling
- 📱 Responsive design with Tailwind CSS
- 🔧 Health checks and monitoring

## Prerequisites

- Node.js ≥ 20
- npm or pnpm
- Finnhub API token (free tier available at [finnhub.io](https://finnhub.io))

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd crypto-live-dashboard
npm install
```

### 2. Configure Environment

```bash
# Backend configuration
cd backend
cp .env.example .env
# Edit .env and add your FINNHUB_TOKEN
```

### 3. Development

```bash
# Start both backend and frontend in development mode
npm run dev

# Or start individually:
cd backend && npm run start:dev
cd frontend && npm run dev
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- WebSocket: ws://localhost:3000/ws/quotes

## Available Scripts

- `npm run dev` - Start both services in development mode
- `npm run build` - Build both applications for production
- `npm run test` - Run all tests
- `npm run lint` - Lint all code
- `npm run format` - Format all code

## API Endpoints

### REST API

- `GET /api/averages?pair=ETHUSDT&from=2025-10-01T00:00Z&to=2025-10-02T00:00Z` - Get historical hourly averages
- `GET /api/last` - Get last tick for all pairs
- `GET /health/live` - Health check endpoint
- `GET /health/ready` - Readiness check endpoint

### WebSocket

- `ws://localhost:3000/ws/quotes` - Real-time price updates

## Data Models

### Supported Pairs

- ETH/USDC → `BINANCE:ETHUSDC`
- ETH/USDT → `BINANCE:ETHUSDT`
- ETH/BTC → `BINANCE:ETHBTC`

### Message Types

```typescript
// Outbound WebSocket messages
interface OutboundMessage {
  type: 'tick' | 'status' | 'avg';
  payload: QuoteTick | HourlyAvgSnapshot | StatusMessage;
}
```

## Environment Variables

### Backend

```env
PORT=3000
NODE_ENV=development
FINNHUB_WS_URL=wss://ws.finnhub.io
FINNHUB_TOKEN=your_token_here
FINNHUB_EXCHANGE=BINANCE
DATABASE_URL=sqlite:./data/quotes.sqlite
```

### Frontend

```env
VITE_API_BASE=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws/quotes
```

## Project Structure

```
crypto-live-dashboard/
├── backend/           # NestJS backend application
├── frontend/          # React frontend application
├── package.json       # Workspace configuration
└── README.md         # This file
```

## License

MIT