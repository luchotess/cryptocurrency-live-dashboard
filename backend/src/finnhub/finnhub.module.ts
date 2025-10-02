import { Module } from '@nestjs/common';
import { FinnhubClient } from './finnhub-client.service';
import { SymbolMapper } from './symbol-mapper.service';

@Module({
  providers: [FinnhubClient, SymbolMapper],
  exports: [FinnhubClient, SymbolMapper],
})
export class FinnhubModule {}
