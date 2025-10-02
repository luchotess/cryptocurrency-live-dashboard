import { Module } from '@nestjs/common';
import { QuotesGateway } from './quotes.gateway';
import { QuotesOrchestratorService } from './quotes-orchestrator.service';
import { FinnhubModule } from '../finnhub/finnhub.module';
import { AveragesModule } from '../averages/averages.module';

@Module({
  imports: [FinnhubModule, AveragesModule],
  providers: [QuotesGateway, QuotesOrchestratorService],
  exports: [QuotesGateway, QuotesOrchestratorService],
})
export class StreamModule {}
