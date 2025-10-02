import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQuotesStore } from '../store/quotes';
import type { OutboundMessage, QuoteTick, HourlyAvgSnapshot, StatusMessage } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

interface UseQuotesWSReturn {
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export const useQuotesWS = (): UseQuotesWSReturn => {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Extract only the methods and values we need from the store
  const status = useQuotesStore((state) => state.status);
  const error = useQuotesStore((state) => state.error);
  const setStatus = useQuotesStore((state) => state.setStatus);
  const updateTick = useQuotesStore((state) => state.updateTick);
  const updateAverage = useQuotesStore((state) => state.updateAverage);
  const initializePairs = useQuotesStore((state) => state.initializePairs);

  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second
  const maxReconnectDelay = 30000; // 30 seconds

  const handleMessage = useCallback((message: OutboundMessage) => {
    switch (message.type) {
      case 'tick': {
        const tick = message.payload as QuoteTick;
        updateTick(tick);
        break;
      }
      case 'avg': {
        const avg = message.payload as HourlyAvgSnapshot;
        updateAverage(avg);
        break;
      }
      case 'status': {
        const status = message.payload as StatusMessage;
        setStatus(status.status, status.reason);
        break;
      }
      default:
        break;
    }
  }, [updateTick, updateAverage, setStatus]);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setStatus('connecting');

    const socket = io(`${WS_URL}/ws/quotes`, {
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection manually
    });

    const scheduleReconnect = () => {
      if (reconnectTimeoutRef.current) return;

      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setStatus('error', 'Max reconnection attempts reached');
        return;
      }

      const delay = Math.min(
        maxReconnectDelay,
        baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
      );

      // Add jitter
      const jitteredDelay = delay + Math.random() * delay * 0.1;

      reconnectAttemptsRef.current++;
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect();
      }, jitteredDelay);
    };

    socket.on('connect', () => {
      setStatus('connected');
      reconnectAttemptsRef.current = 0;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    socket.on('disconnect', (reason) => {
      setStatus('disconnected', reason);
      scheduleReconnect();
    });

    socket.on('connect_error', (error) => {
      setStatus('error', error.message);
      scheduleReconnect();
    });

    socket.on('message', (message: OutboundMessage) => {
      try {
        handleMessage(message);
      } catch (error) {
        setStatus('error', error instanceof Error ? error.message : 'Message handling error');
      }
    });

    socketRef.current = socket;
  }, [setStatus, handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setStatus('disconnected');
  }, [setStatus]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  // Initialize connection on mount
  useEffect(() => {
    initializePairs();
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect, initializePairs]);

  return {
    isConnected: status === 'connected',
    error: error || null,
    reconnect,
  };
};
