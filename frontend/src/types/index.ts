export type CryptoPair = 'ETHUSDC' | 'ETHUSDT' | 'ETHBTC';

export interface QuoteTick {
  pair: CryptoPair;
  price: number;
  ts: number;
}

export interface HourlyAvgSnapshot {
  pair: CryptoPair;
  hourStartUtc: string;
  avg: number;
  count: number;
  lastTs: number;
}

export interface OutboundMessage {
  type: 'tick' | 'status' | 'avg';
  payload: QuoteTick | HourlyAvgSnapshot | StatusMessage;
}

export interface StatusMessage {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  reason?: string;
}

export interface PairState {
  price: number | null;
  ts: number | null;
  hourlyAvg: number | null;
  count: number;
  lastUpdate?: number;
}

export interface ChartDataPoint {
  x: number;
  y: number;
  timestamp: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// API Response types
export interface AveragePoint {
  t: string;
  avg: number;
  n: number;
}

export interface GetAveragesResponse {
  pair: CryptoPair;
  points: AveragePoint[];
}

export interface LastTickData {
  price: number;
  ts: number;
}

export interface GetLastResponse {
  [key: string]: LastTickData;
}

// Pair configuration
export const PAIR_CONFIGS = {
  ETHUSDC: {
    name: 'ETH/USDC',
    color: '#2775CA',
    baseColor: '#627EEA',
  },
  ETHUSDT: {
    name: 'ETH/USDT',
    color: '#26A17B',
    baseColor: '#627EEA',
  },
  ETHBTC: {
    name: 'ETH/BTC',
    color: '#F7931A',
    baseColor: '#627EEA',
  },
} as const;