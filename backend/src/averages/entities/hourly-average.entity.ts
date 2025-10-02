import { Entity, Column, PrimaryGeneratedColumn, Index, Unique } from 'typeorm';
import { CryptoPair } from '../../shared/types';

@Entity('hourly_averages')
@Unique(['pair', 'hourStartUtc'])
@Index(['pair', 'hourStartUtc'])
export class HourlyAverage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  pair: CryptoPair;

  @Column({ type: 'datetime' })
  hourStartUtc: Date;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  avgPrice: number;

  @Column({ type: 'integer' })
  tickCount: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  lastTickPrice: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
