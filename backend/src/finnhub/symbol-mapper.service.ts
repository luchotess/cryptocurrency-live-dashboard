import { Injectable } from '@nestjs/common';
import { CryptoPair, PAIRS } from '../shared/types';

@Injectable()
export class SymbolMapper {
  private readonly symbolToPair = new Map<string, CryptoPair>();
  private readonly pairToSymbol = new Map<CryptoPair, string>();

  constructor() {
    // Initialize bidirectional mappings
    Object.entries(PAIRS).forEach(([pair, symbol]) => {
      this.pairToSymbol.set(pair as CryptoPair, symbol);
      this.symbolToPair.set(symbol, pair as CryptoPair);
    });
  }

  /**
   * Convert provider symbol (e.g., "BINANCE:ETHUSDT") to internal pair
   */
  mapSymbolToPair(symbol: string): CryptoPair | null {
    return this.symbolToPair.get(symbol) || null;
  }

  /**
   * Convert internal pair to provider symbol
   */
  mapPairToSymbol(pair: CryptoPair): string {
    return this.pairToSymbol.get(pair)!;
  }

  /**
   * Get all provider symbols
   */
  getAllSymbols(): string[] {
    return Array.from(this.symbolToPair.keys());
  }

  /**
   * Get all internal pairs
   */
  getAllPairs(): CryptoPair[] {
    return Array.from(this.pairToSymbol.keys());
  }
}