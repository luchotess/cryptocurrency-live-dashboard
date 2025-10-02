import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CryptoPair, ChartDataPoint } from '../types';
import { PAIR_CONFIGS } from '../types';

interface LiveChartProps {
  pair: CryptoPair;
  data: ChartDataPoint[];
  height?: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ChartDataPoint;
  }>;
  label?: string;
}

const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const timestamp = new Date(data.payload.x);

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          ${data.value.toFixed(6)}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {timestamp.toLocaleString()}
        </p>
      </div>
    );
  }

  return null;
};

const LiveChartComponent: React.FC<LiveChartProps> = ({ pair, data, height = 200 }) => {
  const pairConfig = PAIR_CONFIGS[pair];

  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      formattedTime: new Date(point.x).toLocaleTimeString(),
    }));
  }, [data]);

  const domain = useMemo(() => {
    if (data.length === 0) return ['auto', 'auto'];

    const prices = data.map(d => d.y);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;

    return [Math.max(0, min - padding), max + padding];
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
          </div>
          <p className="text-sm mt-3 animate-pulse">Waiting for data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
          />
          <XAxis
            dataKey="formattedTime"
            tick={{ fontSize: 12, fill: 'currentColor' }}
            className="text-gray-600 dark:text-gray-400"
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 12, fill: 'currentColor' }}
            className="text-gray-600 dark:text-gray-400"
            axisLine={false}
            tickLine={false}
            width={80}
            tickFormatter={(value) => `$${value.toFixed(6)}`}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: pairConfig.color, strokeWidth: 1, strokeDasharray: '5 5' }}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke={pairConfig.color}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 4,
              fill: pairConfig.color,
              stroke: '#fff',
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Memoize with custom comparison to prevent unnecessary re-renders
export const LiveChart = React.memo(LiveChartComponent, (prevProps, nextProps) => {
  return (
    prevProps.pair === nextProps.pair &&
    prevProps.height === nextProps.height &&
    prevProps.data.length === nextProps.data.length &&
    (prevProps.data.length === 0 ||
     prevProps.data[prevProps.data.length - 1]?.x === nextProps.data[nextProps.data.length - 1]?.x)
  );
});
