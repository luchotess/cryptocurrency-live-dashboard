import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { FinnhubModule } from '../finnhub/finnhub.module';
import { StreamModule } from '../stream/stream.module';

@Module({
  imports: [TerminusModule, FinnhubModule, StreamModule],
  controllers: [HealthController],
})
export class HealthModule {}
