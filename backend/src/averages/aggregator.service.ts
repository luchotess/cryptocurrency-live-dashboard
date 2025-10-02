import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { 
  CryptoPair, 
  QuoteTick, 
  HourlyAvgSnapshot 
} from '../shared/types';
import { AveragesRepository } from './averages.repository';

interface HourAccumulator {
  hourStartUtc: string;
  sum: number;
  count: number;
  lastTs: number;
}

@Injectable()
export class AggregatorService implements OnModuleDestroy {
  private readonly logger = new Logger(AggregatorService.name);
  private readonly accumulators = new Map<CryptoPair, HourAccumulator>();
  private flushInterval?: NodeJS.Timeout;

  constructor(private readonly repository: AveragesRepository) {
    // Set up periodic flush to handle low-traffic periods
    this.flushInterval = setInterval(() => {
      this.flushStaleAccumulators();
    }, 60000); // Check every minute
  }

  async onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Flush all remaining data on shutdown
    await this.flushAllAccumulators();
  }

  /**
   * Process a new tick and return the current hour's average
   */
  async processTick(tick: QuoteTick): Promise<HourlyAvgSnapshot> {
    const hourBucket = this.getHourBucket(tick.ts);
    const currentAcc = this.accumulators.get(tick.pair);

    // Check if we need to flush the current accumulator (hour changed)
    if (currentAcc && currentAcc.hourStartUtc !== hourBucket) {
      await this.flushAccumulator(tick.pair, currentAcc);
    }

    // Get or create accumulator for current hour
    let acc = this.accumulators.get(tick.pair);
    if (!acc || acc.hourStartUtc !== hourBucket) {
      acc = {
        hourStartUtc: hourBucket,
        sum: 0,
        count: 0,
        lastTs: 0,
      };
      this.accumulators.set(tick.pair, acc);
    }

    // Update accumulator
    acc.sum += tick.price;
    acc.count += 1;
    acc.lastTs = Math.max(acc.lastTs, tick.ts);

    // Update last tick in database
    await this.repository.upsertLastTick(tick.pair, tick.price, tick.ts);

    // Return current snapshot
    const avg = acc.sum / acc.count;
    return {
      pair: tick.pair,
      hourStartUtc: acc.hourStartUtc,
      avg,
      count: acc.count,
      lastTs: acc.lastTs,
    };
  }

  /**
   * Get the current hour average for a pair (without processing new ticks)
   */
  getCurrentHourAverage(pair: CryptoPair): HourlyAvgSnapshot | null {
    const acc = this.accumulators.get(pair);
    if (!acc || acc.count === 0) {
      return null;
    }

    return {
      pair,
      hourStartUtc: acc.hourStartUtc,
      avg: acc.sum / acc.count,
      count: acc.count,
      lastTs: acc.lastTs,
    };
  }

  /**
   * Get current hour averages for all pairs
   */
  getAllCurrentHourAverages(): HourlyAvgSnapshot[] {
    const snapshots: HourlyAvgSnapshot[] = [];
    
    for (const [pair] of this.accumulators) {
      const snapshot = this.getCurrentHourAverage(pair);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  /**
   * Flush accumulators that are for previous hours
   */
  private async flushStaleAccumulators(): Promise<void> {
    const currentHour = this.getHourBucket(Date.now());
    const toFlush: Array<[CryptoPair, HourAccumulator]> = [];

    for (const [pair, acc] of this.accumulators) {
      if (acc.hourStartUtc !== currentHour && acc.count > 0) {
        toFlush.push([pair, acc]);
      }
    }

    for (const [pair, acc] of toFlush) {
      await this.flushAccumulator(pair, acc);
    }
  }

  /**
   * Flush all accumulators to database
   */
  private async flushAllAccumulators(): Promise<void> {
    const toFlush = Array.from(this.accumulators.entries());
    
    for (const [pair, acc] of toFlush) {
      if (acc.count > 0) {
        await this.flushAccumulator(pair, acc);
      }
    }
  }

  /**
   * Flush a single accumulator to database
   */
  private async flushAccumulator(pair: CryptoPair, acc: HourAccumulator): Promise<void> {
    if (acc.count === 0) {
      return;
    }

    const avgPrice = acc.sum / acc.count;
    
    try {
      await this.repository.upsertHourlyAverage({
        pair,
        hourStartUtc: new Date(acc.hourStartUtc),
        avgPrice,
        tickCount: acc.count,
        lastTickPrice: 0, // We'll update this separately
      });

      this.logger.log(`Flushed ${acc.count} ticks for ${pair} at ${acc.hourStartUtc}, avg: ${avgPrice}`);
      
      // Reset the accumulator
      this.accumulators.delete(pair);
      
    } catch (error) {
      this.logger.error(`Failed to flush accumulator for ${pair}`, error);
    }
  }

  /**
   * Get the hour bucket (ISO string) for a timestamp
   */
  private getHourBucket(timestamp: number): string {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0); // Reset to start of hour
    return date.toISOString();
  }
}