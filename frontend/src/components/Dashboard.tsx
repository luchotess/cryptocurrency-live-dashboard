import React from 'react';
import { ConnectionIndicator } from './ConnectionIndicator';
import { PairCard } from './PairCard';
import { useQuotesWS } from '../hooks/useQuotesWS';
import { useDataBootstrap } from '../hooks/useDataBootstrap';
import type { CryptoPair } from '../types';

const pairs: CryptoPair[] = ['ETHUSDC', 'ETHUSDT', 'ETHBTC'];

export const Dashboard: React.FC = () => {
  const { isConnected, error, reconnect } = useQuotesWS();
  const { isLoading: isLoadingData, error: dataError, refetch } = useDataBootstrap();

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                📈 Crypto Live Dashboard
              </h1>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Real-time ETH prices
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ConnectionIndicator />
              {!isConnected && (
                <button
                  onClick={reconnect}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Reconnect
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading Banner */}
        {isLoadingData && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <div className="text-blue-900 dark:text-blue-100">
                Loading historical data...
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {(error || dataError) && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="text-red-600 dark:text-red-400">⚠️</div>
                <div>
                  <div className="font-medium text-red-900 dark:text-red-100">
                    {error ? 'Connection Error' : 'Data Loading Error'}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    {error || dataError}
                  </div>
                </div>
              </div>
              <button
                onClick={error ? reconnect : refetch}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Pairs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {pairs.map((pair) => (
            <PairCard key={pair} pair={pair} />
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center space-y-4">
            {/* Technical Details */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="mb-2">
                Real-time cryptocurrency data powered by{' '}
                <span className="font-semibold text-gray-800 dark:text-gray-200">Finnhub API</span>
              </p>
              <p className="text-xs">
                Live price updates • Hourly averages • Server-side aggregation
              </p>
            </div>

            {/* Technology Stack */}
            <div className="text-xs text-gray-500 dark:text-gray-500">
              <p>
                Built with NestJS, React, TypeScript, WebSockets, and Tailwind CSS
              </p>
            </div>

            {/* Developer Credit */}
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              <p>
                Developed by{' '}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Luis Suarez
                </span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                © {currentYear} Crypto Live Dashboard. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};
