import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WS from 'ws';
import { EventEmitter } from 'events';
import { 
  QuoteTick, 
  FinnhubTradeMessage,
  StatusMessage 
} from '../shared/types';
import { SymbolMapper } from './symbol-mapper.service';

@Injectable()
export class FinnhubClient extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinnhubClient.name);
  private ws?: WS;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly baseReconnectDelay = 500; // ms
  private readonly maxReconnectDelay = 30000; // ms
  private reconnectTimeout?: NodeJS.Timeout;
  private pingInterval?: NodeJS.Timeout;
  private readonly subscriptions = new Set<string>();
  private isShuttingDown = false;

  private readonly wsUrl: string;
  private readonly token: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly symbolMapper: SymbolMapper,
  ) {
    super();
    this.wsUrl = this.configService.get('FINNHUB_WS_URL') || 'wss://ws.finnhub.io';
    this.token = this.configService.get('FINNHUB_TOKEN') || '';
  }

  async onModuleInit() {
    if (!this.token || this.token === 'placeholder_token') {
      this.logger.warn('No valid Finnhub token provided. WebSocket connection will be mocked.');
      this.emitStatus('error', 'No valid API token');
      return;
    }

    await this.connect();
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    this.cleanup();
  }

  private async connect(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      this.emitStatus('connecting');
      this.logger.log('Connecting to Finnhub WebSocket...');

      const url = `${this.wsUrl}?token=${this.token}`;
      this.ws = new WS(url);

      this.ws.on('open', () => this.handleOpen());
      this.ws.on('message', (data: any) => this.handleMessage(data));
      this.ws.on('close', (code: number, reason: Buffer) => this.handleClose(code, reason));
      this.ws.on('error', (error: Error) => this.handleError(error));

    } catch (error) {
      this.logger.error('Failed to create WebSocket connection', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    this.logger.log('Connected to Finnhub WebSocket');
    this.reconnectAttempts = 0;
    this.emitStatus('connected');
    
    // Subscribe to all symbols
    this.resubscribeAll();
    
    // Start ping interval for keep-alive
    this.startPingInterval();
  }

  private handleMessage(data: any): void {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'trade') {
        this.handleTradeMessage(message as FinnhubTradeMessage);
      } else if (message.type === 'ping') {
        // Respond to ping with pong
        this.send({ type: 'pong' });
      }
    } catch (error) {
      this.logger.warn('Failed to parse WebSocket message', { error: error.message, data: data.toString() });
    }
  }

  private handleTradeMessage(message: FinnhubTradeMessage): void {
    if (!message.data || !Array.isArray(message.data)) {
      return;
    }

    message.data.forEach((trade) => {
      const pair = this.symbolMapper.mapSymbolToPair(trade.s);
      if (!pair) {
        return; // Ignore unknown symbols
      }

      const tick: QuoteTick = {
        pair,
        price: trade.p,
        ts: trade.t,
      };

      this.emit('tick', tick);
    });
  }

  private handleClose(code: number, reason: Buffer): void {
    this.logger.warn('WebSocket connection closed', { code, reason: reason.toString() });
    this.cleanup();
    
    if (!this.isShuttingDown) {
      this.emitStatus('disconnected', `Connection closed: ${code}`);
      this.scheduleReconnect();
    }
  }

  private handleError(error: Error): void {
    this.logger.error('WebSocket error', error);
    this.emitStatus('error', error.message);
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown || this.reconnectTimeout) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection.`);
      this.emitStatus('error', 'Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.maxReconnectDelay,
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts)
    );
    
    // Add jitter
    const jitteredDelay = delay + Math.random() * delay * 0.1;

    this.logger.log(`Scheduling reconnect in ${Math.round(jitteredDelay)}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = undefined;
      this.connect();
    }, jitteredDelay);
  }

  private resubscribeAll(): void {
    const symbols = this.symbolMapper.getAllSymbols();
    symbols.forEach(symbol => {
      this.subscriptions.add(symbol);
      this.send({ type: 'subscribe', symbol });
    });
    
    this.logger.log(`Subscribed to ${symbols.length} symbols: ${symbols.join(', ')}`);
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WS.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WS.OPEN) {
        this.ws.close();
      }
      this.ws = undefined;
    }
  }

  private emitStatus(status: StatusMessage['status'], reason?: string): void {
    const message: StatusMessage = { status, reason };
    this.emit('status', message);
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WS.OPEN;
  }

  public getStatus(): StatusMessage['status'] {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WS.CONNECTING:
        return 'connecting';
      case WS.OPEN:
        return 'connected';
      case WS.CLOSING:
      case WS.CLOSED:
      default:
        return 'disconnected';
    }
  }
}