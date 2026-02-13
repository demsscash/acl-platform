import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Camion, Chauffeur, TrackerGps, BonTransport, BonLocation, DotationCarburant, SortieStock, Panne } from '../database/entities';
import { CamionsController } from './camions.controller';
import { CamionsService } from './camions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Camion, Chauffeur, TrackerGps, BonTransport, BonLocation, DotationCarburant, SortieStock, Panne])],
  controllers: [CamionsController],
  providers: [CamionsService],
  exports: [CamionsService],
})
export class CamionsModule {}
