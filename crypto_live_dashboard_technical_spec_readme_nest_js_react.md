# Crypto Live Dashboard – Technical Spec & README

Real‑time cryptocurrency dashboard with NestJS (backend) and React (frontend). Streams live quotes for **ETH/USDC**, **ETH/USDT** and **ETH/BTC**, renders updating charts, and persists **hourly averages**.

---

## 1) Summary & Scope

Build a production‑ready demo showcasing clean real‑time architecture, fault‑tolerant WebSocket handling, typed data contracts, and a smooth UX with connection indicators and live charts. The backend connects to **Finnhub WebSocket API**, normalizes ticks, computes and persists **hourly averages**, and streams updates to the frontend via **WebSockets** (with optional SSE fallback). The frontend renders per‑pair cards and live charts, showing **current price**, **last update time**, and the **current hour’s average**.

Pairs:
- ETH/USDC → provider symbol typically `BINANCE:ETHUSDC`
- ETH/USDT → `BINANCE:ETHUSDT`
- ETH/BTC  → `BINANCE:ETHBTC`

> Note: Symbols are configurable; verify availability in your Finnhub plan/exchange.

---

## 2) Architecture Overview

### 2.1 High‑Level Diagram (ASCII)
```
 [Finnhub WS]
     │  (wss://ws.finnhub.io?token=...)  subscribe BINANCE:ETHUSDC, ETHUSDT, ETHBTC
     ▼
 ┌────────────────────┐
 │  NestJS Backend    │
 │  - FinnhubClient   │  <— resilient WS client (reconnect + resubscribe)
 │  - Aggregator      │  <— in‑memory sums/counts for current hour
 │  - AveragingSvc    │  <— flush to DB per hour; expose REST for history
 │  - WS Gateway      │  <— broadcast normalized ticks + hourly avg to clients
 │  - Health/Logging  │
 └────────┬───────────┘
          │
          │ ws://localhost:3000/ws/quotes   (SSE fallback optional)
          ▼
 ┌────────────────────┐
 │ React Frontend     │
 │ - Quotes Store     │  <— per pair: last price, ts, status, hourly avg
 │ - Charts (Recharts)│  <— live series; initial range from REST
 │ - UX states        │  <— connecting/connected/disconnected/errors
 └────────────────────┘
```

### 2.2 Data Flow
1. Backend opens WS to Finnhub, subscribes to target symbols.
2. On each tick, normalize payload → `{ pair, price, ts }`.
3. Update in‑memory **Aggregator** (sum, count for current hour window).
4. Stream normalized tick + current rolling hour average to all connected clients via **WS Gateway**.
5. On hour boundary (e.g., `2025-10-01T15:00Z → 16:00Z`), **persist** the final average for that hour into `hourly_averages` table.
6. Frontend shows live values; for charts, fetch historical hourly averages via REST and merge incoming ticks for the current hour.

### 2.3 Technology Choices
- **Backend:** NestJS, TypeScript, TypeORM, SQLite (dev) / Postgres (prod), `ws` client, Pino logger, class‑validator.
- **Frontend:** React + TypeScript (Vite), Zustand (or Redux Toolkit), Recharts, Day.js.
- **Realtime:** WebSockets end‑to‑end; optional SSE fallback.

---

## 3) Env & Config

### 3.1 Backend `.env`
```
PORT=3000
NODE_ENV=development
FINNHUB_WS_URL=wss://ws.finnhub.io
FINNHUB_TOKEN=YOUR_TOKEN
FINNHUB_EXCHANGE=BINANCE
# SQLite local
DATABASE_URL=sqlite:./data/quotes.sqlite
# or Postgres (docker/local/prod)
# DATABASE_URL=postgres://user:pass@localhost:5432/quotes
```

### 3.2 Frontend `.env`
```
VITE_API_BASE=http://localhost:3000
VITE_WS_URL=ws://localhost:3000/ws/quotes
```

---

## 4) Data Contracts (Types)

### 4.1 Enumerations & Pairs
```ts
export type CryptoPair = 'ETHUSDC' | 'ETHUSDT' | 'ETHBTC';
export const PAIRS: Record<CryptoPair, string> = {
  ETHUSDC: 'BINANCE:ETHUSDC',
  ETHUSDT: 'BINANCE:ETHUSDT',
  ETHBTC:  'BINANCE:ETHBTC',
};
```

### 4.2 Finnhub WebSocket (incoming)
Finnhub sends objects like:
```json
{
  "type": "trade",
  "data": [
    { "s": "BINANCE:ETHUSDT", "p": 2345.67, "t": 1699999999999 }
  ]
}
```
Key fields used:
- `s` symbol, `p` price (number), `t` epoch ms.

### 4.3 Normalized Quote (internal/outbound)
```ts
export interface QuoteTick {
  pair: CryptoPair;
  price: number;       // latest trade price
  ts: number;          // epoch ms UTC
}

export interface HourlyAvgSnapshot {
  pair: CryptoPair;
  hourStartUtc: string; // ISO hour bucket, e.g., 2025-10-01T15:00:00.000Z
  avg: number;          // average of ticks in hour so far (rolling)
  count: number;        // number of ticks in current hour bucket
  lastTs: number;       // last tick timestamp seen for this pair
}

export interface OutboundMessage {
  type: 'tick' | 'status' | 'avg';
  payload: QuoteTick | HourlyAvgSnapshot | { status: 'connecting'|'connected'|'disconnected'|'error', reason?: string };
}
```

---

## 5) Persistence Model

### 5.1 Tables
- `hourly_averages`
  - `id` (uuid)
  - `pair` (text, indexed)
  - `hour_start_utc` (timestamptz, indexed, unique with `pair`)
  - `avg_price` (numeric/decimal)
  - `tick_count` (int)
  - `last_tick_price` (numeric)
  - `updated_at` (timestamptz)

- `last_ticks` (one row per `pair`)
  - `pair` (primary key)
  - `price` (numeric)
  - `ts` (timestamptz)

> Raw tick storage is optional. For this exercise, keep the DB lean and store hourly aggregates + last seen tick per pair.

### 5.2 Aggregation Logic
- Maintain per‑pair accumulator `{ sum: number, count: number, hourStartUtc: string }` in memory.
- On every tick for a pair:
  1) If tick’s hour bucket ≠ current accumulator bucket → **flush** accumulator to DB (upsert), **start new** bucket.
  2) Update `{ sum += price, count += 1 }`.
  3) Upsert `last_ticks`.
- On backend **shutdown**: flush accumulators.
- On **hour boundary**: a scheduler ensures final flush in case of low traffic.

---

## 6) Backend (NestJS) Design

### 6.1 Modules & Responsibilities
- **AppModule**: wiring, ConfigModule, TypeORM connection, Pino logger.
- **FinnhubModule**
  - `FinnhubClient` (provider): manages WS connection to Finnhub (open/close, ping/pong or keepalive), exponential backoff with jitter, resubscribe on reconnect, backpressure guard.
  - `SymbolMapper`: maps internal `CryptoPair` → provider symbols.
- **StreamModule**
  - `QuotesGateway` (WebSocketGateway): broadcasts `OutboundMessage` to clients; emits connection `status`.
  - Optional `QuotesSseController` for SSE fallback (`/sse/quotes`).
- **AveragingModule**
  - `AggregatorService`: in‑memory rolling averages per pair.
  - `AveragesRepository` (TypeORM): CRUD for `hourly_averages` & `last_ticks`.
  - `AveragesController` (REST):
    - `GET /api/averages?pair=ETHUSDT&from=2025-09-30T00:00Z&to=2025-10-01T00:00Z`
    - `GET /api/last` → last tick per pair.
- **HealthModule**
  - `GET /health/live` and `/health/ready`.

### 6.2 WebSocket Gateway API (frontend ↔ backend)
- URL: `ws://HOST:PORT/ws/quotes`
- **Server → Client**: `OutboundMessage` JSON frames.
  - `type: 'status'` on connect/disconnect/errors.
  - `type: 'tick'` for normalized latest trades.
  - `type: 'avg'` rolling average snapshots.
- **Client → Server**: optional
  - `{ type: 'hello', pairs?: CryptoPair[] }` (if you want per‑client filtering). Default: server broadcasts all pairs.

### 6.3 Error Handling & Resilience
- Reconnect with exponential backoff (e.g., base 500ms, cap 30s, full jitter).
- Resubscribe all pairs after reconnect.
- Detect stale stream: if no ticks for N seconds, send `status: disconnected (stale)` to clients and attempt reconnect.
- Wrap parsing with guards; drop malformed frames; log at `warn`.
- Rate limits: avoid repeated subscriptions; coalesce duplicate `subscribe` calls.

### 6.4 Logging
- Pino configured with request IDs and child loggers per module.
- Log levels: info for lifecycle, warn for recoverable, error for fatal.

### 6.5 Testing (Backend)
- **Unit**: `AggregatorService` (buckets, flush on hour switch), `SymbolMapper`, message normalization.
- **Integration**: mock Finnhub WS (local `ws` server), assert gateway broadcasts and DB flush.
- **e2e**: start app in memory; hit `/api/averages` and open local WS; verify behavior.

---

## 7) Frontend (React) Design

### 7.1 App Structure
```
frontend/
  src/
    main.tsx
    app.css
    lib/dayjs.ts
    store/quotes.ts      // Zustand store: per-pair state
    api/client.ts        // REST client (fetch averages, last)
    ws/useQuotesWS.ts    // hook wrapping WebSocket lifecycle
    components/
      ConnectionIndicator.tsx
      PairCard.tsx       // shows current price, ts, hourly avg
      LiveChart.tsx      // Recharts line/area chart per pair
      Dashboard.tsx      // grid: 3 cards + charts
```

### 7.2 UI/UX Requirements
- **Real‑time updates**: chart point appended on each tick; throttle to ~10 updates/sec per pair for render performance.
- **Connection states**: banner/label – connecting, connected, disconnected, error (with retry CTA).
- **Resilience**: auto‑reconnect; if backend down, show non‑blocking error and keep trying.
- **Initial data**: on mount, fetch last 24h hourly averages; render chart baseline; merge live data as it arrives.

### 7.3 State Shape (Zustand)
```ts
interface PairState { price: number | null; ts: number | null; hourlyAvg: number | null; count: number; }
interface QuotesState {
  status: 'connecting'|'connected'|'disconnected'|'error';
  pairs: Record<CryptoPair, PairState>;
  history: Record<CryptoPair, Array<{ x: number; y: number }>>; // for charts
}
```

### 7.4 Error Handling
- Wrap WS with a hook that exposes: `{ status, error, send, close }` and handles retries.
- Show friendly message when REST `/api/averages` fails; provide “Retry” button.

---

## 8) API Surface (REST)

- `GET /api/averages`
  - Query: `pair` (required), `from` ISO, `to` ISO (optional; default last 24h)
  - Response:
    ```json
    {
      "pair": "ETHUSDT",
      "points": [ { "t": "2025-10-01T14:00:00Z", "avg": 2341.52, "n": 1823 }, ... ]
    }
    ```
- `GET /api/last`
  - Response:
    ```json
    {
      "ETHUSDC": { "price": 2345.6, "ts": 1699999999123 },
      "ETHUSDT": { "price": 2346.1, "ts": 1699999999456 },
      "ETHBTC":  { "price": 0.0601,  "ts": 1699999999678 }
    }
    ```
- `GET /health/live` | `/health/ready` → 200/503 as appropriate.

---

## 9) Running Locally (Dev)

### 9.1 Prerequisites
- Node.js ≥ 20, npm or pnpm
- Git

### 9.2 Clone & Install
```
git clone https://github.com/<you>/crypto-live-dashboard.git
cd crypto-live-dashboard

# backend
cd backend
cp .env.example .env    # add FINNHUB_TOKEN
npm install
npm run prisma:generate  # if using Prisma OR skip for TypeORM
npm run start:dev

# frontend (in another terminal)
cd ../frontend
cp .env.example .env
npm install
npm run dev
```
- Backend at `http://localhost:3000` (WS at `/ws/quotes`).
- Frontend at `http://localhost:5173` (Vite default).

### 9.3 Docker (optional)
A simple `docker-compose.yml` can start Postgres + backend + frontend. Keep out of scope if time‑boxed.

---

## 10) Finnhub API Key – How To Obtain
1. Go to https://finnhub.io and create an account (free tier).
2. In the dashboard, copy your **API token**.
3. Put it in `backend/.env` as `FINNHUB_TOKEN`.
4. Ensure WebSocket endpoint is `wss://ws.finnhub.io?token=YOUR_TOKEN`.

> Free tier limits (60 req/min) primarily affect REST. WebSocket streaming has its own constraints; avoid excessive subscriptions.

---

## 11) Code Quality & Conventions
- **TypeScript first**: strict mode, explicit interfaces, DTOs with class‑validator.
- **Separation of concerns**: client, aggregator, persistence, gateway, controllers.
- **Logging**: Pino structured logs; avoid console.log.
- **Config**: Nest ConfigModule for env; no hardcoded secrets.
- **Formatting**: Prettier + ESLint (airbnb or standard). Commit hooks with `lint-staged`.

---

## 12) Testing Strategy
- **Backend**
  - Unit: aggregation math, hour boundary transitions, symbol mapping.
  - Integration: fake Finnhub WS server emitting ticks; assert DB rows and gateway messages.
  - e2e: supertest REST + ws client to `/ws/quotes`.
- **Frontend**
  - Unit: store reducers/selectors; chart helpers.
  - Component: render states (connecting/connected/disconnected); error banners.
  - Integration: mock WS provider; ensure UI updates on incoming frames.

Commands (example):
```
# backend
npm run test
npm run test:e2e

# frontend
npm run test
```

---

## 13) Security & Ops Notes
- Do not expose FINNHUB token to the browser. Only backend talks to Finnhub.
- If deploying behind proxies/load balancers, enable WS upgrade handling.
- Add CORS config for `VITE_API_BASE` during dev.
- Health endpoints for readiness/liveness in containers.

---

## 14) Repository Layout
```
crypto-live-dashboard/
  backend/
    src/
      app.module.ts
      main.ts
      config/
      finnhub/
        finnhub.client.ts
        symbol.mapper.ts
      stream/
        quotes.gateway.ts
        quotes.sse.controller.ts (optional)
      averages/
        aggregator.service.ts
        averages.controller.ts
        averages.entity.ts
        averages.repository.ts
      health/
        health.controller.ts
    test/
      unit/
      integration/
      e2e/
    .env.example
    package.json
    tsconfig.json

  frontend/
    src/
      main.tsx
      app.css
      lib/dayjs.ts
      store/quotes.ts
      api/client.ts
      ws/useQuotesWS.ts
      components/
        ConnectionIndicator.tsx
        PairCard.tsx
        LiveChart.tsx
        Dashboard.tsx
    .env.example
    vite.config.ts
    package.json
    tsconfig.json

  README.md (points to this spec)
```

---

## 15) Implementation Notes & Pseudocode

### 15.1 Finnhub WS Client (Nest Provider)
```ts
class FinnhubClient {
  private ws?: WebSocket;
  private reconnectAttempts = 0;
  private readonly subs = new Set<string>();
  onTick: (tick: QuoteTick) => void = () => {};
  onStatus: (s: string) => void = () => {};

  start() {
    const url = `${WS_URL}?token=${TOKEN}`;
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.onStatus('connected');
      for (const s of this.subs) this.send({ type: 'subscribe', symbol: s });
    };
    this.ws.onmessage = (ev) => this.handle(ev.data);
    this.ws.onclose = () => this.scheduleReconnect();
    this.ws.onerror = () => this.scheduleReconnect();
  }

  subscribe(symbol: string) { this.subs.add(symbol); this.send({ type: 'subscribe', symbol }); }

  private handle(raw: string) {
    const msg = JSON.parse(raw);
    if (msg.type === 'trade') {
      for (const d of msg.data) {
        const pair = mapProviderSymbolToPair(d.s);
        if (!pair) continue;
        this.onTick({ pair, price: d.p, ts: d.t });
      }
    }
  }

  private scheduleReconnect() {
    this.onStatus('disconnected');
    const timeout = Math.min(30000, (2 ** this.reconnectAttempts++) * 500) * Math.random();
    setTimeout(() => this.start(), timeout);
  }

  private send(obj: any) { this.ws?.readyState === 1 && this.ws.send(JSON.stringify(obj)); }
}
```

### 15.2 Aggregator (hour buckets)
```ts
class AggregatorService {
  private acc: Record<CryptoPair, { hour: string; sum: number; count: number; last: number|null }> = ...
  constructor(private repo: AveragesRepository) {}

  onTick(t: QuoteTick) {
    const hour = bucketHourIso(t.ts);
    const a = this.acc[t.pair] ?? { hour, sum: 0, count: 0, last: null };
    if (a.hour !== hour) { this.repo.flushHour(t.pair, a); this.acc[t.pair] = { hour, sum: 0, count: 0, last: null }; }
    const cur = this.acc[t.pair];
    cur.sum += t.price; cur.count += 1; cur.last = t.ts;
    const avg = cur.sum / cur.count;
    this.repo.upsertLastTick(t.pair, t.price, t.ts);
    return { avg, count: cur.count, hourStartUtc: cur.hour };
  }
}
```

---

## 16) UX Acceptance Criteria
- Dashboard shows three cards (ETH/USDC, ETH/USDT, ETH/BTC) with:
  - Current price (live), last update timestamp (to‑local), and current hour’s average.
- Each pair has a live chart updating without page reload.
- Connection indicator reflects states and recovers from network hiccups automatically.
- If backend is down, UI shows error, continues to retry, and resumes seamlessly.

---

## 17) Submission Checklist
- ✅ Backend starts and connects to Finnhub; logs subscriptions and tick throughput.
- ✅ Frontend starts; renders cards and charts; shows states.
- ✅ Hourly averages persisted; REST returns valid history; charts display last 24h.
- ✅ README includes setup, env, run commands, and architectural notes (this spec).
- ✅ Tests for aggregator + basic WS flow.
- ✅ GitHub repo with clear structure and instructions.

---

## 18) AI Tool (Builder) Prompts
**Backend Prompt (summary):**
“Generate a NestJS project with ConfigModule, TypeORM (SQLite dev), modules for `finnhub`, `stream`, `averages`, and `health`. Implement a resilient Finnhub WebSocket client that subscribes to symbols `BINANCE:ETHUSDC`, `BINANCE:ETHUSDT`, `BINANCE:ETHBTC`, normalizes messages to `{pair, price, ts}`, updates a rolling in‑memory aggregator per hour, persists hourly averages and last ticks to DB, exposes REST `/api/averages` and `/api/last`, and broadcasts `OutboundMessage` via a WebSocket gateway `/ws/quotes`. Include Jest tests for aggregator and an integration test with a mocked ws server.”

**Frontend Prompt (summary):**
“Generate a React + TS (Vite) app with Zustand store and Recharts. Add a `useQuotesWS` hook connecting to `VITE_WS_URL`, handling reconnect and status. Build `ConnectionIndicator`, `PairCard`, and `LiveChart` components. On mount, fetch last 24h hourly averages from `/api/averages` per pair, then merge live ticks from WS. Show current price, last update time, and rolling hourly average for each pair. Include tests for the store and connection states.”

---

## 19) Future Enhancements (Optional)
- Persistence of raw ticks (short TTL) for minute‑level charts.
- Server‑side throttling/coalescing (e.g., 250ms per pair).
- Horizontal scaling with Redis pub/sub or NATS; one Finnhub consumer → many gateways.
- Metrics: Prometheus counters for ticks/sec, reconnects, broadcast latency.
- Alerting on stale data (no ticks > 15s).

---

## 20) License & Credits
- Uses Finnhub data; comply with their ToS.
- This spec is provided as guidance; adapt to your environment and limits.

