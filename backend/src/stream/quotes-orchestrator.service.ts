import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FinnhubClient } from '../finnhub/finnhub-client.service';
import { AggregatorService } from '../averages/aggregator.service';
import { QuotesGateway } from './quotes.gateway';
import { QuoteTick, StatusMessage } from '../shared/types';

@Injectable()
export class QuotesOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(QuotesOrchestratorService.name);

  constructor(
    private readonly finnhubClient: FinnhubClient,
    private readonly aggregator: AggregatorService,
    private readonly gateway: QuotesGateway,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Quotes Orchestrator...');
    
    // Listen to Finnhub client events
    this.finnhubClient.on('tick', (tick: QuoteTick) => this.handleTick(tick));
    this.finnhubClient.on('status', (status: StatusMessage) => this.handleStatus(status));
    
    this.logger.log('Quotes Orchestrator initialized');
  }

  private async handleTick(tick: QuoteTick): Promise<void> {
    try {
      // Process tick through aggregator
      const hourlySnapshot = await this.aggregator.processTick(tick);
      
      // Broadcast tick to WebSocket clients
      this.gateway.broadcastTick(tick);
      
      // Broadcast updated hourly average
      this.gateway.broadcastAverage(hourlySnapshot);
      
      // Log tick throughput occasionally
      if (Math.random() < 0.001) { // ~0.1% of ticks
        this.logger.debug(`Processed tick for ${tick.pair}: $${tick.price} (clients: ${this.gateway.getClientCount()})`);
      }
      
    } catch (error) {
      this.logger.error(`Failed to handle tick for ${tick.pair}`, error);
    }
  }

  private handleStatus(status: StatusMessage): void {
    this.logger.log(`Finnhub status: ${status.status}${status.reason ? ` (${status.reason})` : ''}`);
    
    // Forward status to WebSocket clients
    this.gateway.broadcastStatus(status);
  }

  /**
   * Get current system status
   */
  getSystemStatus() {
    return {
      finnhub: {
        status: this.finnhubClient.getStatus(),
        connected: this.finnhubClient.isConnected(),
      },
      websocket: {
        clients: this.gateway.getClientCount(),
      },
      aggregator: {
        currentHours: this.aggregator.getAllCurrentHourAverages(),
      },
    };
  }
}