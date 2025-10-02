import React from 'react';
import { 
  WifiIcon, 
  ExclamationTriangleIcon, 
  SignalSlashIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { useQuotesStore } from '../store/quotes';
import type { ConnectionStatus } from '../types';

interface ConnectionIndicatorProps {
  className?: string;
}

const statusConfig: Record<ConnectionStatus, { 
  label: string; 
  className: string; 
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  connecting: {
    label: 'Connecting',
    className: 'status-connecting',
    description: 'Connecting to live data feed...',
    icon: ArrowPathIcon,
  },
  connected: {
    label: 'Connected',
    className: 'status-connected',
    description: 'Connected to live data feed',
    icon: WifiIcon,
  },
  disconnected: {
    label: 'Disconnected',
    className: 'status-disconnected',
    description: 'Disconnected from live data feed',
    icon: SignalSlashIcon,
  },
  error: {
    label: 'Error',
    className: 'status-error',
    description: 'Connection error occurred',
    icon: ExclamationTriangleIcon,
  },
};

const ConnectionIndicatorComponent: React.FC<ConnectionIndicatorProps> = ({ className = '' }) => {
  const { status, error } = useQuotesStore();
  const config = statusConfig[status];
  const IconComponent = config.icon;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <IconComponent 
          className={`w-4 h-4 ${status === 'connecting' ? 'animate-spin' : ''} ${
            status === 'connected' ? 'text-green-400' :
            status === 'connecting' ? 'text-yellow-400' :
            status === 'error' ? 'text-red-400' :
            'text-gray-400'
          }`}
        />
        <div 
          className={`status-dot ${config.className}`}
          title={error || config.description}
        />
      </div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {config.label}
      </span>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400 max-w-xs truncate">
          ({error})
        </span>
      )}
    </div>
  );
};

export const ConnectionIndicator = React.memo(ConnectionIndicatorComponent);
