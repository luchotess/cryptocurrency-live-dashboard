import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CryptoPair } from '../shared/types';
import { LastTick } from './entities/last-tick.entity';
import { HourlyAverage } from './entities/hourly-average.entity';

export interface HourlyAverageData {
  pair: CryptoPair;
  hourStartUtc: Date;
  avgPrice: number;
  tickCount: number;
  lastTickPrice: number;
}

@Injectable()
export class AveragesRepository {
  constructor(
    @InjectRepository(LastTick)
    private readonly lastTickRepository: Repository<LastTick>,
    @InjectRepository(HourlyAverage)
    private readonly hourlyAverageRepository: Repository<HourlyAverage>,
  ) {}

  /**
   * Upsert last tick for a pair
   */
  async upsertLastTick(
    pair: CryptoPair,
    price: number,
    ts: number,
  ): Promise<void> {
    try {
      // Try to update existing record first
      const result = await this.lastTickRepository.update(
        { pair },
        {
          price,
          ts,
          updatedAt: new Date(),
        },
      );

      // If no rows were affected, insert a new one
      if (result.affected === 0) {
        await this.lastTickRepository.insert({
          pair,
          price,
          ts,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      // If insert fails due to race condition, try update again
      await this.lastTickRepository.update(
        { pair },
        {
          price,
          ts,
          updatedAt: new Date(),
        },
      );
    }
  }

  /**
   * Get last tick for all pairs
   */
  async getAllLastTicks(): Promise<LastTick[]> {
    return this.lastTickRepository.find();
  }

  /**
   * Get last tick for a specific pair
   */
  async getLastTick(pair: CryptoPair): Promise<LastTick | null> {
    return this.lastTickRepository.findOne({ where: { pair } });
  }

  /**
   * Upsert hourly average
   */
  async upsertHourlyAverage(data: HourlyAverageData): Promise<void> {
    try {
      // Try to update existing record first
      const result = await this.hourlyAverageRepository.update(
        { pair: data.pair, hourStartUtc: data.hourStartUtc },
        {
          avgPrice: data.avgPrice,
          tickCount: data.tickCount,
          lastTickPrice: data.lastTickPrice,
          updatedAt: new Date(),
        },
      );

      // If no rows were affected, insert a new one
      if (result.affected === 0) {
        await this.hourlyAverageRepository.insert({
          pair: data.pair,
          hourStartUtc: data.hourStartUtc,
          avgPrice: data.avgPrice,
          tickCount: data.tickCount,
          lastTickPrice: data.lastTickPrice,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      // If insert fails due to race condition, try update again
      await this.hourlyAverageRepository.update(
        { pair: data.pair, hourStartUtc: data.hourStartUtc },
        {
          avgPrice: data.avgPrice,
          tickCount: data.tickCount,
          lastTickPrice: data.lastTickPrice,
          updatedAt: new Date(),
        },
      );
    }
  }

  /**
   * Get hourly averages for a pair within a time range
   */
  async getHourlyAverages(
    pair: CryptoPair,
    from: Date,
    to: Date,
  ): Promise<HourlyAverage[]> {
    return this.hourlyAverageRepository.find({
      where: {
        pair,
        hourStartUtc: Between(from, to),
      },
      order: {
        hourStartUtc: 'ASC',
      },
    });
  }

  /**
   * Get recent hourly averages for all pairs (last N hours)
   */
  async getRecentHourlyAverages(hours: number = 24): Promise<HourlyAverage[]> {
    const from = new Date();
    from.setHours(from.getHours() - hours);

    return this.hourlyAverageRepository.find({
      where: {
        hourStartUtc: Between(from, new Date()),
      },
      order: {
        pair: 'ASC',
        hourStartUtc: 'ASC',
      },
    });
  }
}
