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

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const fetchHistoricalData = async (pair: CryptoPair) => {
      try {
        const from = new Date();
        from.setHours(from.getHours() - 24);

        const response = await apiClient.getAverages(
          pair,
          from.toISOString(),
          new Date().toISOString()
        );

        const chartData: ChartDataPoint[] = response.points.map(point => ({
          x: new Date(point.t).getTime(),
          y: point.avg,
          timestamp: point.t,
        }));

        setHistoryData(pair, chartData);
      } catch (error) {
        console.warn(`Failed to fetch historical data for ${pair}:`, error);
      }
    };

    const fetchLastTicks = async () => {
      try {
        const response = await apiClient.getLastTicks();

        Object.entries(response).forEach(([pairStr, data]) => {
          const pair = pairStr as CryptoPair;
          if (pairs.includes(pair)) {
            updateTick({
              pair,
              price: data.price,
              ts: data.ts,
            });
          }
        });
      } catch (error) {
        console.warn('Failed to fetch last ticks:', error);
      }
    };

    try {
      const historicalPromises = pairs.map(pair => fetchHistoricalData(pair));
      await Promise.all(historicalPromises);

      await fetchLastTicks();

      hasInitialized.current = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load historical data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [setHistoryData, updateTick]);

  const refetch = useCallback(async () => {
    hasInitialized.current = false;
    await fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (!hasInitialized.current) {
      const timer = setTimeout(() => {
        fetchAllData();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [fetchAllData]);

  return {
    isLoading,
    error,
    refetch,
  };
};
