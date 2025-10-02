import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { CryptoPair } from '../../shared/types';

export class GetAveragesQueryDto {
  @IsEnum(['ETHUSDC', 'ETHUSDT', 'ETHBTC'])
  pair: CryptoPair;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export interface AveragePointDto {
  t: string; // timestamp ISO string
  avg: number;
  n: number; // count
}

export interface GetAveragesResponseDto {
  pair: CryptoPair;
  points: AveragePointDto[];
}

export interface LastTickDto {
  price: number;
  ts: number;
}

export interface GetLastResponseDto {
  [key: string]: LastTickDto; // key is the pair name
}
