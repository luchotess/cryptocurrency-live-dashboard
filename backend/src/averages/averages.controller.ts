import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { AveragesRepository } from './averages.repository';
import {
  GetAveragesQueryDto,
  GetAveragesResponseDto,
  GetLastResponseDto,
  AveragePointDto,
} from './dto/averages.dto';

@Controller('api')
export class AveragesController {
  constructor(private readonly repository: AveragesRepository) {}

  @Get('averages')
  async getAverages(
    @Query(new ValidationPipe({ transform: true })) query: GetAveragesQueryDto,
  ): Promise<GetAveragesResponseDto> {
    const { pair, from, to } = query;

    // Default to last 24 hours if no range specified
    const fromDate = from
      ? new Date(from)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const averages = await this.repository.getHourlyAverages(
      pair,
      fromDate,
      toDate,
    );

    const points: AveragePointDto[] = averages.map((avg) => ({
      t: avg.hourStartUtc.toISOString(),
      avg: Number(avg.avgPrice),
      n: avg.tickCount,
    }));

    return {
      pair,
      points,
    };
  }

  @Get('last')
  async getLastTicks(): Promise<GetLastResponseDto> {
    const lastTicks = await this.repository.getAllLastTicks();

    const response: GetLastResponseDto = {};

    for (const tick of lastTicks) {
      response[tick.pair] = {
        price: Number(tick.price),
        ts: Number(tick.ts),
      };
    }

    return response;
  }
}
