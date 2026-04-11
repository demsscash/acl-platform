import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alerte, Camion, Chauffeur, User, CataloguePiece, StockPiece, Maintenance, Panne } from '../database/entities';
import { AlertesService } from './alertes.service';
import { AlertesController } from './alertes.controller';
import { DocumentExpirationService } from './document-expiration.service';
import { StockAlertsService } from './stock-alerts.service';
import { MaintenanceAlertsService } from './maintenance-alerts.service';
import { PannesAlertsService } from './pannes-alerts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Alerte, Camion, Chauffeur, User, CataloguePiece, StockPiece, Maintenance, Panne])],
  controllers: [AlertesController],
  providers: [AlertesService, DocumentExpirationService, StockAlertsService, MaintenanceAlertsService, PannesAlertsService],
  exports: [AlertesService, DocumentExpirationService, StockAlertsService, MaintenanceAlertsService, PannesAlertsService],
})
export class AlertesModule {}
