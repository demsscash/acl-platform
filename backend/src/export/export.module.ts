import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SortieStock, DotationCarburant, BonTransport, BonLocation, Panne, EntreeStock, LigneEntreeStock, ApprovisionnementCuve } from '../database/entities';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SortieStock, DotationCarburant, BonTransport, BonLocation, Panne, EntreeStock, LigneEntreeStock, ApprovisionnementCuve])],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
