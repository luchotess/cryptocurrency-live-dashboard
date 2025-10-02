import { useEffect, useState, useRef, useCallback } from 'react';
import { useQuotesStore } from '../store/quotes';
import { apiClient } from '../api/client';
import type { CryptoPair, ChartDataPoint } from '../types';

const pairs: CryptoPair[] = ['ETHUSDC', 'ETHUSDT', 'ETHBTC'];

interface UseDataBootstrapReturn {
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDataBootstrap = (): UseDataBootstrapReturn => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  const setHistoryData = useQuotesStore((state) => state.setHistoryData);
  const updateTick = useQuotesStore((state) => state.updateTick);

  const fetchHistoricalData = async (pair: CryptoPair) => {
    try {
      // Fetch last 24 hours of data
      const from = new Date();
      from.setHours(from.getHours() - 24);

      const response = await apiClient.getAverages(
        pair,
        from.toISOString(),
        new Date().toISOString()
      );

      // Convert API response to chart data
      const chartData: ChartDataPoint[] = response.points.map(point => ({
        x: new Date(point.t).getTime(),
        y: point.avg,
        timestamp: point.t,
      }));

      setHistoryData(pair, chartData);
    } catch (error) {
      console.error(`Failed to fetch historical data for ${pair}:`, error);
      // Don't throw - continue with other pairs
    }
  };

  const fetchLastTicks = async () => {
    try {
      const response = await apiClient.getLastTicks();

      // Update store with last known prices
      Object.entries(response).forEach(([pairStr, data]) => {
        const pair = pairStr as CryptoPair;
        if (pairs.includes(pair)) {
          // Simulate a tick to populate the store
          updateTick({
            pair,
            price: data.price,
            ts: data.ts,
          });
        }
      });
    } catch (error) {
      console.error('Failed to fetch last ticks:', error);
      // Don't throw - this is not critical
    }
  };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch historical data for all pairs in parallel
      const historicalPromises = pairs.map(pair => fetchHistoricalData(pair));
      await Promise.all(historicalPromises);

      // Fetch last ticks
      await fetchLastTicks();

      hasInitialized.current = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Data bootstrap failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setHistoryData, updateTick]);

  const refetch = useCallback(async () => {
    hasInitialized.current = false;
    await fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    // Fetch data on mount
    if (!hasInitialized.current) {
      // Small delay to ensure store is initialized
      const timer = setTimeout(() => {
        fetchAllData();
      }, 1000); // Slightly longer delay to let WebSocket connect

      return () => clearTimeout(timer);
    }
  }, [fetchAllData]);

  return {
    isLoading,
    error,
    refetch,
  };
};
