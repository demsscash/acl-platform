import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { GpsService } from './gps.service';
import { WhatsGpsService } from './whatsgps.service';
import { GpsGeofenceService } from './gps-geofence.service';
import { CreateGeofenceDto, UpdateGeofenceDto } from './dto/geofence.dto';
import { GpsAlertService } from './gps-alert.service';
import { GpsHistoryService } from './gps-history.service';
import { GpsGateway } from './gps.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GpsAlertType, GpsAlertStatus, GpsAlertSeverity, GeofenceType } from '../database/entities';

@ApiTags('GPS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/gps')
export class GpsController {
  constructor(
    private readonly gpsService: GpsService,
    private readonly whatsGpsService: WhatsGpsService,
    private readonly geofenceService: GpsGeofenceService,
    private readonly alertService: GpsAlertService,
    private readonly historyService: GpsHistoryService,
    private readonly gpsGateway: GpsGateway,
  ) {}

  // ============== TRACKERS ==============

  @Get('trackers')
  @ApiOperation({ summary: 'Liste des trackers GPS' })
  findAll() {
    return this.gpsService.findAll();
  }

  @Get('trackers/stats')
  @ApiOperation({ summary: 'Statistiques GPS' })
  getStats() {
    return this.gpsService.getStats();
  }

  @Get('trackers/:id')
  @ApiOperation({ summary: 'Détail tracker' })
  findOne(@Param('id') id: string) {
    return this.gpsService.findOne(+id);
  }

  @Get('camion/:camionId')
  @ApiOperation({ summary: "Tracker d'un camion" })
  findByCamion(@Param('camionId') camionId: string) {
    return this.gpsService.findByCamion(+camionId);
  }

  @Post('trackers')
  @ApiOperation({ summary: 'Créer un tracker' })
  create(@Body() data: any) {
    return this.gpsService.create(data);
  }

  @Put('trackers/:id')
  @ApiOperation({ summary: 'Modifier un tracker' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.gpsService.update(+id, data);
  }

  @Get('positions')
  @ApiOperation({ summary: 'Positions actuelles de tous les camions' })
  getPositionsActuelles() {
    return this.gpsService.getPositionsActuelles();
  }

  @Post('position')
  @ApiOperation({ summary: 'Mettre à jour la position (webhook tracker)' })
  updatePosition(
    @Body() data: { imei: string; lat: number; lng: number; vitesse?: number; cap?: number },
  ) {
    return this.gpsService.updatePosition(data.imei, data.lat, data.lng, data.vitesse, data.cap);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Simuler des positions GPS pour les tests' })
  simulatePositions() {
    return this.gpsService.simulatePositions();
  }

  // ============== GEOFENCES ==============

  @Get('geofences')
  @ApiOperation({ summary: 'Liste des geofences' })
  getAllGeofences() {
    return this.geofenceService.findAll();
  }

  @Get('geofences/stats')
  @ApiOperation({ summary: 'Statistiques des geofences' })
  getGeofenceStats() {
    return this.geofenceService.getStats();
  }

  @Get('geofences/:id')
  @ApiOperation({ summary: 'Détail geofence' })
  getGeofence(@Param('id', ParseIntPipe) id: number) {
    return this.geofenceService.findOne(id);
  }

  @Post('geofences')
  @ApiOperation({ summary: 'Créer une geofence' })
  createGeofence(@Body() data: CreateGeofenceDto) {
    return this.geofenceService.create(data);
  }

  @Put('geofences/:id')
  @ApiOperation({ summary: 'Modifier une geofence' })
  updateGeofence(@Param('id', ParseIntPipe) id: number, @Body() data: UpdateGeofenceDto) {
    return this.geofenceService.update(id, data);
  }

  @Delete('geofences/:id')
  @ApiOperation({ summary: 'Supprimer une geofence (soft delete)' })
  deleteGeofence(@Param('id', ParseIntPipe) id: number) {
    return this.geofenceService.delete(id);
  }

  @Post('geofences/:id/trackers')
  @ApiOperation({ summary: 'Assigner des trackers à une geofence' })
  assignTrackersToGeofence(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { trackerIds: number[] },
  ) {
    return this.geofenceService.assignTrackers(id, data.trackerIds);
  }

  @Get('geofences/tracker/:trackerId')
  @ApiOperation({ summary: "Geofences d'un tracker" })
  getGeofencesByTracker(@Param('trackerId', ParseIntPipe) trackerId: number) {
    return this.geofenceService.getGeofencesByTracker(trackerId);
  }

  @Get('geofences/check/:trackerId')
  @ApiOperation({ summary: 'Vérifier position par rapport aux geofences' })
  @ApiQuery({ name: 'lat', required: true })
  @ApiQuery({ name: 'lng', required: true })
  checkPointAgainstGeofences(
    @Param('trackerId', ParseIntPipe) trackerId: number,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.geofenceService.checkPointAgainstGeofences(trackerId, parseFloat(lat), parseFloat(lng));
  }

  // ============== ALERTS ==============

  @Get('alerts')
  @ApiOperation({ summary: 'Liste des alertes GPS' })
  @ApiQuery({ name: 'trackerId', required: false })
  @ApiQuery({ name: 'camionId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: GpsAlertType })
  @ApiQuery({ name: 'status', required: false, enum: GpsAlertStatus })
  @ApiQuery({ name: 'severity', required: false, enum: GpsAlertSeverity })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAlerts(
    @Query('trackerId') trackerId?: string,
    @Query('camionId') camionId?: string,
    @Query('type') type?: GpsAlertType,
    @Query('status') status?: GpsAlertStatus,
    @Query('severity') severity?: GpsAlertSeverity,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.alertService.getAlerts({
      trackerId: trackerId ? parseInt(trackerId, 10) : undefined,
      camionId: camionId ? parseInt(camionId, 10) : undefined,
      type,
      status,
      severity,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('alerts/stats')
  @ApiOperation({ summary: 'Statistiques des alertes' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getAlertStats(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.alertService.getAlertStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Put('alerts/:id/status')
  @ApiOperation({ summary: "Mettre à jour le statut d'une alerte" })
  updateAlertStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { status: GpsAlertStatus; username?: string; resolution?: string },
  ) {
    return this.alertService.updateAlertStatus(id, data.status, data.username, data.resolution);
  }

  // ============== HISTORY ==============

  @Get('history/:trackerId')
  @ApiOperation({ summary: 'Historique des positions' })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  @ApiQuery({ name: 'limit', required: false })
  getHistory(
    @Param('trackerId', ParseIntPipe) trackerId: number,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('limit') limit?: string,
  ) {
    return this.historyService.getHistory(
      trackerId,
      new Date(startTime),
      new Date(endTime),
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('history/:trackerId/simplified')
  @ApiOperation({ summary: 'Historique simplifié (pour carte)' })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  @ApiQuery({ name: 'maxPoints', required: false })
  getSimplifiedTrack(
    @Param('trackerId', ParseIntPipe) trackerId: number,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('maxPoints') maxPoints?: string,
  ) {
    return this.historyService.getSimplifiedTrack(
      trackerId,
      new Date(startTime),
      new Date(endTime),
      maxPoints ? parseInt(maxPoints, 10) : 500,
    );
  }

  @Get('history/:trackerId/stats')
  @ApiOperation({ summary: 'Statistiques de trajet' })
  @ApiQuery({ name: 'startTime', required: true })
  @ApiQuery({ name: 'endTime', required: true })
  getTravelStats(
    @Param('trackerId', ParseIntPipe) trackerId: number,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.historyService.getTravelStats(trackerId, new Date(startTime), new Date(endTime));
  }

  @Get('history/:trackerId/mileage')
  @ApiOperation({ summary: 'Kilométrage journalier' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getDailyMileage(
    @Param('trackerId', ParseIntPipe) trackerId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.historyService.getDailyMileage(trackerId, new Date(startDate), new Date(endDate));
  }

  // ============== WEBSOCKET STATUS ==============

  @Get('realtime/status')
  @ApiOperation({ summary: 'Statut du WebSocket' })
  getRealtimeStatus() {
    return {
      connectedClients: this.gpsGateway.getConnectedClientsCount(),
      websocketNamespace: '/gps',
    };
  }

  // ============== WHATSGPS INTEGRATION ==============

  @Get('whatsgps/status')
  @ApiOperation({ summary: 'Statut de la connexion WhatsGPS' })
  getWhatsGpsStatus() {
    return this.whatsGpsService.getStatus();
  }

  @Post('whatsgps/sync')
  @ApiOperation({ summary: 'Synchroniser manuellement les positions depuis WhatsGPS' })
  async syncWhatsGps() {
    return this.whatsGpsService.forceSyncNow();
  }

  @Post('whatsgps/login')
  @ApiOperation({ summary: 'Se connecter à WhatsGPS' })
  async loginWhatsGps() {
    const success = await this.whatsGpsService.login();
    return { success };
  }

  @Get('whatsgps/vehicles')
  @ApiOperation({ summary: 'Liste des véhicules depuis WhatsGPS' })
  async getWhatsGpsVehicles() {
    return this.whatsGpsService.getVehicles();
  }

  @Get('whatsgps/vehicles/status')
  @ApiOperation({ summary: 'Statut de tous les véhicules WhatsGPS' })
  async getAllWhatsGpsVehicleStatus() {
    return this.whatsGpsService.getAllVehicleStatus();
  }

  @Get('whatsgps/vehicles/:carIds/status')
  @ApiOperation({ summary: 'Statut de véhicules spécifiques (IDs séparés par virgule)' })
  async getWhatsGpsVehicleStatus(@Param('carIds') carIds: string) {
    const ids = carIds
      .split(',')
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id));
    return this.whatsGpsService.getVehicleStatus(ids);
  }

  @Get('whatsgps/history/:carId')
  @ApiOperation({ summary: "Historique de trajet d'un véhicule WhatsGPS" })
  async getWhatsGpsHistory(
    @Param('carId') carId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    return this.whatsGpsService.getHistoryTrack(parseInt(carId, 10), startTime, endTime);
  }

  @Get('whatsgps/vehicle/imei/:imei')
  @ApiOperation({ summary: 'Rechercher un véhicule par IMEI' })
  async getWhatsGpsVehicleByImei(@Param('imei') imei: string) {
    return this.whatsGpsService.getVehicleByImei(imei);
  }

  @Get('whatsgps/alarms')
  @ApiOperation({ summary: 'Alarmes non lues depuis WhatsGPS' })
  async getWhatsGpsAlarms() {
    return this.whatsGpsService.getAlarms();
  }

  @Get('whatsgps/stats')
  @ApiOperation({ summary: 'Statistiques des véhicules WhatsGPS' })
  async getWhatsGpsStats() {
    return this.whatsGpsService.getVehicleStats();
  }

  @Post('whatsgps/platform')
  @ApiOperation({ summary: 'Changer de plateforme (whatsgps ou iotlink)' })
  async setWhatsGpsPlatform(@Body() data: { platform: 'whatsgps' | 'iotlink' }) {
    this.whatsGpsService.setPlatform(data.platform);
    return { success: true, platform: data.platform };
  }
}
