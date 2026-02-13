import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  DotationCarburant,
  SortieStock,
  LigneSortieStock,
  BonTransport,
  BonLocation,
  Panne,
  Camion,
  Chauffeur,
  Client,
  CuveCarburant,
  CataloguePiece,
  StockPiece,
  Fournisseur,
} from '../database/entities';

import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Transactional entities
      DotationCarburant,
      SortieStock,
      LigneSortieStock,
      BonTransport,
      BonLocation,
      Panne,
      // Reference entities
      Camion,
      Chauffeur,
      Client,
      CuveCarburant,
      CataloguePiece,
      StockPiece,
      Fournisseur,
    ]),
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
