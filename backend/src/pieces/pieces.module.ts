import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CataloguePiece,
  StockPiece,
  Fournisseur,
  SortieStock,
  LigneSortieStock,
  EntreeStock,
  LigneEntreeStock,
  MouvementPiece,
  Camion,
} from '../database/entities';
import { PiecesService } from './pieces.service';
import { PiecesController } from './pieces.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CataloguePiece,
      StockPiece,
      Fournisseur,
      SortieStock,
      LigneSortieStock,
      EntreeStock,
      LigneEntreeStock,
      MouvementPiece,
      Camion,
    ]),
  ],
  controllers: [PiecesController],
  providers: [PiecesService],
  exports: [PiecesService],
})
export class PiecesModule {}
