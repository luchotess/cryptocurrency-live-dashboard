import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LastTick } from './entities/last-tick.entity';
import { HourlyAverage } from './entities/hourly-average.entity';
import { AveragesRepository } from './averages.repository';
import { AggregatorService } from './aggregator.service';
import { AveragesController } from './averages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LastTick, HourlyAverage])],
  providers: [AveragesRepository, AggregatorService],
  controllers: [AveragesController],
  exports: [AveragesRepository, AggregatorService],
})
export class AveragesModule {}
