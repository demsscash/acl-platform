import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alerte, Camion, Chauffeur, User, CataloguePiece, StockPiece, Maintenance } from '../database/entities';
import { AlertesService } from './alertes.service';
import { AlertesController } from './alertes.controller';
import { DocumentExpirationService } from './document-expiration.service';
import { StockAlertsService } from './stock-alerts.service';
import { MaintenanceAlertsService } from './maintenance-alerts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Alerte, Camion, Chauffeur, User, CataloguePiece, StockPiece, Maintenance])],
  controllers: [AlertesController],
  providers: [AlertesService, DocumentExpirationService, StockAlertsService, MaintenanceAlertsService],
  exports: [AlertesService, DocumentExpirationService, StockAlertsService, MaintenanceAlertsService],
})
export class AlertesModule {}
