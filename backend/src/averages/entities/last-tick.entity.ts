import { Entity, Column, PrimaryColumn } from 'typeorm';
import { CryptoPair } from '../../shared/types';

@Entity('last_ticks')
export class LastTick {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  pair: CryptoPair;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  price: number;

  @Column({ type: 'bigint' })
  ts: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
