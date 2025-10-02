import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  CryptoPair, 
  PairState, 
  ChartDataPoint, 
  ConnectionStatus,
  QuoteTick,
  HourlyAvgSnapshot 
} from '../types';

interface QuotesState {
  // Connection status
  status: ConnectionStatus;
  error?: string;
  
  // Pair data
  pairs: Record<CryptoPair, PairState>;
  
  // Chart data
  history: Record<CryptoPair, ChartDataPoint[]>;
  
  // Actions
  setStatus: (status: ConnectionStatus, error?: string) => void;
  updateTick: (tick: QuoteTick) => void;
  updateAverage: (avg: HourlyAvgSnapshot) => void;
  setHistoryData: (pair: CryptoPair, data: ChartDataPoint[]) => void;
  addHistoryPoint: (pair: CryptoPair, point: ChartDataPoint) => void;
  initializePairs: () => void;
}

const initialPairState: PairState = {
  price: null,
  ts: null,
  hourlyAvg: null,
  count: 0,
  lastUpdate: undefined,
};

const pairs: CryptoPair[] = ['ETHUSDC', 'ETHUSDT', 'ETHBTC'];

export const useQuotesStore = create<QuotesState>()(
  devtools(
    (set) => ({
      status: 'disconnected',
      error: undefined,
      
      pairs: {} as Record<CryptoPair, PairState>,
      history: {} as Record<CryptoPair, ChartDataPoint[]>,

      setStatus: (status, error) =>
        set({ status, error }, false, 'setStatus'),

      updateTick: (tick) =>
        set(
          (state) => {
            const now = Date.now();
            const updatedPairs = {
              ...state.pairs,
              [tick.pair]: {
                ...state.pairs[tick.pair],
                price: tick.price,
                ts: tick.ts,
                lastUpdate: now,
              },
            };

            // Add to history if this is a new data point
            const existingHistory = state.history[tick.pair] || [];
            const lastPoint = existingHistory[existingHistory.length - 1];
            
            let updatedHistory = state.history;
            
            // Only add if it's a different timestamp or significant price change
            if (!lastPoint || Math.abs(lastPoint.x - tick.ts) > 10000) { // 10 seconds
              const newPoint: ChartDataPoint = {
                x: tick.ts,
                y: tick.price,
                timestamp: new Date(tick.ts).toISOString(),
              };
              
              updatedHistory = {
                ...state.history,
                [tick.pair]: [...existingHistory.slice(-100), newPoint], // Keep last 100 points
              };
            }

            return {
              pairs: updatedPairs,
              history: updatedHistory,
            };
          },
          false,
          'updateTick'
        ),

      updateAverage: (avg) =>
        set(
          (state) => ({
            pairs: {
              ...state.pairs,
              [avg.pair]: {
                ...state.pairs[avg.pair],
                hourlyAvg: avg.avg,
                count: avg.count,
              },
            },
          }),
          false,
          'updateAverage'
        ),

      setHistoryData: (pair, data) =>
        set(
          (state) => ({
            history: {
              ...state.history,
              [pair]: data,
            },
          }),
          false,
          'setHistoryData'
        ),

      addHistoryPoint: (pair, point) =>
        set(
          (state) => {
            const existing = state.history[pair] || [];
            return {
              history: {
                ...state.history,
                [pair]: [...existing.slice(-99), point], // Keep last 100 points
              },
            };
          },
          false,
          'addHistoryPoint'
        ),

      initializePairs: () =>
        set(
          () => {
            const initialPairs = {} as Record<CryptoPair, PairState>;
            const initialHistory = {} as Record<CryptoPair, ChartDataPoint[]>;
            
            pairs.forEach((pair) => {
              initialPairs[pair] = { ...initialPairState };
              initialHistory[pair] = [];
            });
            
            return {
              pairs: initialPairs,
              history: initialHistory,
            };
          },
          false,
          'initializePairs'
        ),
    }),
    { name: 'quotes-store' }
  )
);