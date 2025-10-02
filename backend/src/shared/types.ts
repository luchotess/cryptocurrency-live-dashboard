export type CryptoPair = 'ETHUSDC' | 'ETHUSDT' | 'ETHBTC';

export const PAIRS: Record<CryptoPair, string> = {
  ETHUSDC: 'BINANCE:ETHUSDC',
  ETHUSDT: 'BINANCE:ETHUSDT',
  ETHBTC: 'BINANCE:ETHBTC',
};

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

// Finnhub WebSocket message structure
export interface FinnhubTradeMessage {
  type: 'trade';
  data: Array<{
    s: string; // symbol
    p: number; // price
    t: number; // timestamp
  }>;
}
