import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';
import { useQuotesStore } from '../store/quotes';
import { LiveChart } from './LiveChart';
import type { CryptoPair } from '../types';
import { PAIR_CONFIGS } from '../types';

interface PairCardProps {
  pair: CryptoPair;
}

const EMPTY: [] = [];

const PairCardComponent: React.FC<PairCardProps> = ({ pair }) => {
  const pairConfig = PAIR_CONFIGS[pair];

  // State for price change animations
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'same'>('same');
  const prevPriceRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);

  // Get data with simple selectors (ignore the getSnapshot warning - it's not causing issues)
  const pairData = useQuotesStore((state) => state.pairs?.[pair]);
  const chartData = useQuotesStore((state) => state.history?.[pair] || EMPTY);

  // Helper functions for formatting
  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '--';

    // Format based on the pair
    if (pair === 'ETHBTC') {
      return price.toFixed(6);
    }
    return price.toFixed(2);
  };

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleTimeString();
  };

  // Track price changes for animations
  useEffect(() => {
    const currentPrice = pairData?.price;

    // Only proceed if we have a valid current price
    if (currentPrice !== null && currentPrice !== undefined) {
      // Compare with previous price if we have one
      if (prevPriceRef.current !== null && prevPriceRef.current !== currentPrice) {
        // Clear any existing animation timeout
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
        }

        // Set direction based on price change
        if (currentPrice > prevPriceRef.current) {
          setPriceDirection('up');
        } else if (currentPrice < prevPriceRef.current) {
          setPriceDirection('down');
        }

        // Reset direction after animation
        animationTimeoutRef.current = setTimeout(() => {
          setPriceDirection('same');
          animationTimeoutRef.current = null;
        }, 1000);
      }

      // Update previous price reference
      prevPriceRef.current = currentPrice;
    }

    // Cleanup function
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };
  }, [pairData?.price]); // Only depend on the price value

  const isStale = useMemo(() => {
    if (!pairData?.lastUpdate) return true;
    return Date.now() - pairData.lastUpdate > 30000; // 30 seconds
  }, [pairData?.lastUpdate]);

  const priceChangeClass = useMemo(() => {
    switch (priceDirection) {
      case 'up':
        return 'price-up animate-bounce-subtle';
      case 'down':
        return 'price-down animate-bounce-subtle';
      default:
        return 'text-gray-900 dark:text-gray-100';
    }
  }, [priceDirection]);
  
  const PriceArrowIcon = useMemo(() => {
    switch (priceDirection) {
      case 'up':
        return ArrowTrendingUpIcon;
      case 'down':
        return ArrowTrendingDownIcon;
      default:
        return null;
    }
  }, [priceDirection]);

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: pairConfig.color }}
          />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {pairConfig.name}
          </h3>
        </div>
        {isStale && (
          <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
            Stale
          </div>
        )}
      </div>

      {/* Price Display */}
      <div className="mb-4">
        <div className={`text-3xl font-bold mb-1 transition-colors ${priceChangeClass} flex items-center gap-2`}>
          <span>${formatPrice(pairData?.price)}</span>
          {PriceArrowIcon && (
            <PriceArrowIcon className="w-6 h-6 animate-bounce-subtle" />
          )}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Last update: {formatTimestamp(pairData?.ts)}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="text-gray-600 dark:text-gray-400">Hour Avg</div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            ${formatPrice(pairData?.hourlyAvg)}
          </div>
        </div>
        <div>
          <div className="text-gray-600 dark:text-gray-400">Tick Count</div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {pairData?.count || 0}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <LiveChart pair={pair} data={chartData} height={180} />
      </div>
    </div>
  );
};

export const PairCard = React.memo(PairCardComponent);
