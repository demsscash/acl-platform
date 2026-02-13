import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { AlertesService } from './alertes.service';
import { DocumentExpirationService, DocumentExpiration } from './document-expiration.service';
import { StockAlertsService, StockAlert } from './stock-alerts.service';
import { MaintenanceAlertsService, MaintenanceAlert } from './maintenance-alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Alertes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/alertes')
export class AlertesController {
  constructor(
    private readonly alertesService: AlertesService,
    private readonly documentExpirationService: DocumentExpirationService,
    private readonly stockAlertsService: StockAlertsService,
    private readonly maintenanceAlertsService: MaintenanceAlertsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste des alertes' })
  findAll(@Query('statut') statut?: string) {
    return this.alertesService.findAll(statut);
  }

  @Get('actives')
  @ApiOperation({ summary: 'Alertes actives' })
  findActives() {
    return this.alertesService.findActives();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques alertes' })
  getStats() {
    return this.alertesService.getStats();
  }

  @Get('by-type')
  @ApiOperation({ summary: 'Alertes par type' })
  getByType() {
    return this.alertesService.getByType();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail alerte' })
  findOne(@Param('id') id: string) {
    return this.alertesService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une alerte' })
  create(@Body() data: any) {
    return this.alertesService.create(data);
  }

  @Put(':id/acquitter')
  @ApiOperation({ summary: 'Acquitter une alerte' })
  acquitter(@Param('id') id: string, @Req() req: any) {
    return this.alertesService.acquitter(+id, req.user.id);
  }

  @Put(':id/resoudre')
  @ApiOperation({ summary: 'Résoudre une alerte' })
  resoudre(@Param('id') id: string) {
    return this.alertesService.resoudre(+id);
  }

  @Get('documents/expirations')
  @ApiOperation({ summary: 'Liste des documents expirants (30 jours)' })
  getExpiringDocuments(@Query('days') days?: string): Promise<DocumentExpiration[]> {
    return this.documentExpirationService.getExpiringDocuments(days ? +days : 30);
  }

  @Post('documents/check')
  @ApiOperation({ summary: 'Vérifier et créer alertes pour documents expirants' })
  checkDocuments(): Promise<{ alertesCreees: number; documentsExpirants: DocumentExpiration[] }> {
    return this.documentExpirationService.runCheck();
  }

  // Stock alerts endpoints
  @Get('stock/bas')
  @ApiOperation({ summary: 'Liste des pièces en stock bas' })
  getLowStockItems(): Promise<StockAlert[]> {
    return this.stockAlertsService.getLowStockItems();
  }

  @Post('stock/check')
  @ApiOperation({ summary: 'Vérifier et créer alertes pour stock bas' })
  checkStock(): Promise<{ alertesCreees: number; stockBas: StockAlert[] }> {
    return this.stockAlertsService.runCheck();
  }

  // Maintenance alerts endpoints
  @Get('maintenance/upcoming')
  @ApiOperation({ summary: 'Maintenances planifiées dans les 7 prochains jours' })
  getUpcomingMaintenance(): Promise<MaintenanceAlert[]> {
    return this.maintenanceAlertsService.getUpcomingMaintenance(7);
  }

  @Get('maintenance/overdue')
  @ApiOperation({ summary: 'Maintenances en retard' })
  getOverdueMaintenance(): Promise<MaintenanceAlert[]> {
    return this.maintenanceAlertsService.getOverdueMaintenance();
  }

  @Post('maintenance/check')
  @ApiOperation({ summary: 'Vérifier et créer alertes maintenance' })
  checkMaintenance(): Promise<{ upcoming: MaintenanceAlert[]; overdue: MaintenanceAlert[] }> {
    return this.maintenanceAlertsService.runCheck();
  }
}
