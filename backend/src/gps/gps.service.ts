import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TrackerGps, Camion } from '../database/entities';
import { GpsGateway, GpsPositionUpdate } from './gps.gateway';
import { GpsAlertService } from './gps-alert.service';
import { GpsHistoryService } from './gps-history.service';

@Injectable()
export class GpsService {
  private readonly logger = new Logger(GpsService.name);

  constructor(
    @InjectRepository(TrackerGps)
    private readonly trackerRepository: Repository<TrackerGps>,
    @InjectRepository(Camion)
    private readonly camionRepository: Repository<Camion>,
    @Inject(forwardRef(() => GpsGateway))
    private readonly gpsGateway: GpsGateway,
    @Inject(forwardRef(() => GpsAlertService))
    private readonly alertService: GpsAlertService,
    @Inject(forwardRef(() => GpsHistoryService))
    private readonly historyService: GpsHistoryService,
  ) {}

  async findAll(): Promise<TrackerGps[]> {
    return this.trackerRepository.find({
      where: { actif: true },
      relations: ['camion'],
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<TrackerGps> {
    const tracker = await this.trackerRepository.findOne({
      where: { id },
      relations: ['camion'],
    });
    if (!tracker) {
      throw new NotFoundException(`Tracker #${id} non trouvé`);
    }
    return tracker;
  }

  async findByCamion(camionId: number): Promise<TrackerGps | null> {
    return this.trackerRepository.findOne({
      where: { camionId },
      relations: ['camion'],
    });
  }

  async create(data: Partial<TrackerGps>): Promise<TrackerGps> {
    const tracker = this.trackerRepository.create(data);
    return this.trackerRepository.save(tracker);
  }

  async update(id: number, data: Partial<TrackerGps>): Promise<TrackerGps> {
    const tracker = await this.findOne(id);
    Object.assign(tracker, data);
    return this.trackerRepository.save(tracker);
  }

  async updatePosition(
    imei: string,
    lat: number,
    lng: number,
    vitesse?: number,
    cap?: number,
  ): Promise<TrackerGps> {
    const tracker = await this.trackerRepository.findOne({
      where: { imei },
      relations: ['camion'],
    });
    if (!tracker) {
      throw new NotFoundException(`Tracker IMEI ${imei} non trouvé`);
    }

    // Store previous position for geofence checks
    const previousLat = tracker.dernierePositionLat;
    const previousLng = tracker.dernierePositionLng;
    const wasOnline = tracker.enLigne;

    tracker.dernierePositionLat = lat;
    tracker.dernierePositionLng = lng;
    tracker.dernierePositionDate = new Date();
    tracker.enLigne = true;
    tracker.derniereConnexion = new Date();

    if (vitesse !== undefined) tracker.vitesseActuelle = vitesse;
    if (cap !== undefined) tracker.cap = cap;

    const savedTracker = await this.trackerRepository.save(tracker);

    // Record position in history
    try {
      await this.historyService.recordPosition(
        tracker.id,
        lat,
        lng,
        vitesse,
        cap,
        undefined,
        undefined,
        new Date(),
        undefined,
        true,
      );
    } catch (error) {
      this.logger.warn(`Failed to record position history: ${error.message}`);
    }

    // Broadcast position update via WebSocket
    const positionUpdate: GpsPositionUpdate = {
      trackerId: tracker.id,
      camionId: tracker.camionId,
      imei: tracker.imei,
      immatriculation: tracker.camion?.immatriculation,
      lat,
      lng,
      vitesse: vitesse || 0,
      cap: cap || 0,
      enLigne: true,
      timestamp: new Date(),
    };
    this.gpsGateway.broadcastPositionUpdate(positionUpdate);

    // Check for status change (came back online)
    if (!wasOnline) {
      this.gpsGateway.broadcastStatusChange({
        trackerId: tracker.id,
        camionId: tracker.camionId,
        immatriculation: tracker.camion?.immatriculation,
        enLigne: true,
        timestamp: new Date(),
      });
    }

    // Check for overspeed alert
    if (vitesse !== undefined) {
      try {
        await this.alertService.checkOverspeed(savedTracker, vitesse, lat, lng);
      } catch (error) {
        this.logger.warn(`Failed to check overspeed: ${error.message}`);
      }
    }

    // Check for geofence alerts
    if (previousLat && previousLng) {
      try {
        await this.alertService.checkGeofences(
          savedTracker,
          lat,
          lng,
          Number(previousLat),
          Number(previousLng),
        );
      } catch (error) {
        this.logger.warn(`Failed to check geofences: ${error.message}`);
      }
    }

    return savedTracker;
  }

  async getPositionsActuelles(): Promise<any[]> {
    const trackers = await this.trackerRepository.find({
      where: { actif: true },
      relations: ['camion'],
    });

    return trackers
      .filter(t => t.dernierePositionLat && t.dernierePositionLng)
      .map(t => ({
        id: t.id,
        camionId: t.camionId,
        camion: t.camion ? {
          immatriculation: t.camion.immatriculation,
          typeCamion: t.camion.typeCamion,
        } : null,
        lat: Number(t.dernierePositionLat),
        lng: Number(t.dernierePositionLng),
        vitesse: t.vitesseActuelle,
        cap: t.cap,
        enLigne: t.enLigne,
        derniereMaj: t.dernierePositionDate,
      }));
  }

  async getStats(): Promise<any> {
    const total = await this.trackerRepository.count({ where: { actif: true } });
    const enLigne = await this.trackerRepository.count({ where: { actif: true, enLigne: true } });

    return {
      total,
      enLigne,
      horsLigne: total - enLigne,
    };
  }

  // Simulate GPS data for testing - positions réalistes autour de Dakar
  async simulatePositions(): Promise<any[]> {
    const trackers = await this.trackerRepository.find({
      where: { actif: true },
      relations: ['camion'],
    });

    // Lieux réalistes à Dakar pour simulation
    const locations = [
      { name: 'Port de Dakar', lat: 14.6833, lng: -17.4333, zone: 'port' },
      { name: 'Zone Industrielle', lat: 14.7167, lng: -17.4500, zone: 'industrie' },
      { name: 'Autoroute Diamniadio', lat: 14.7000, lng: -17.3500, zone: 'route' },
      { name: 'Rufisque', lat: 14.7167, lng: -17.2667, zone: 'ville' },
      { name: 'Thiaroye', lat: 14.7500, lng: -17.3833, zone: 'ville' },
      { name: 'Pikine', lat: 14.7667, lng: -17.4000, zone: 'ville' },
      { name: 'Mbao', lat: 14.7333, lng: -17.3333, zone: 'industrie' },
      { name: 'Keur Massar', lat: 14.7833, lng: -17.3167, zone: 'ville' },
      { name: 'Bargny', lat: 14.6833, lng: -17.2333, zone: 'ville' },
      { name: 'Sendou', lat: 14.6667, lng: -17.2667, zone: 'port' },
      { name: 'Aéroport AIBD', lat: 14.6700, lng: -17.0700, zone: 'aeroport' },
      { name: 'Saly', lat: 14.4500, lng: -17.0167, zone: 'route' },
      { name: 'Thiès', lat: 14.7833, lng: -16.9333, zone: 'ville' },
      { name: 'Touba', lat: 14.8500, lng: -15.8833, zone: 'route' },
    ];

    const updated: Array<{
      imei: string;
      camion: string;
      lat: number;
      lng: number;
      vitesse: number;
      location: string;
    }> = [];

    for (let i = 0; i < trackers.length; i++) {
      const tracker = trackers[i];

      // Ne simuler que les trackers associés à un camion
      if (!tracker.camionId) continue;

      // Position basée sur un lieu réaliste avec variation
      const baseLocation = locations[i % locations.length];
      const lat = baseLocation.lat + (Math.random() - 0.5) * 0.02;
      const lng = baseLocation.lng + (Math.random() - 0.5) * 0.02;

      // Vitesse selon la zone
      let vitesse: number;
      switch (baseLocation.zone) {
        case 'port': vitesse = Math.floor(Math.random() * 20); break;
        case 'industrie': vitesse = Math.floor(Math.random() * 30); break;
        case 'route': vitesse = 40 + Math.floor(Math.random() * 50); break;
        case 'aeroport': vitesse = Math.floor(Math.random() * 25); break;
        default: vitesse = 20 + Math.floor(Math.random() * 40);
      }

      const cap = Math.floor(Math.random() * 360);

      tracker.dernierePositionLat = lat;
      tracker.dernierePositionLng = lng;
      tracker.vitesseActuelle = vitesse;
      tracker.cap = cap;
      tracker.enLigne = Math.random() > 0.1; // 90% en ligne
      tracker.derniereConnexion = new Date();
      tracker.dernierePositionDate = new Date();

      await this.trackerRepository.save(tracker);
      updated.push({
        imei: tracker.imei,
        camion: tracker.camion?.immatriculation || 'N/A',
        lat,
        lng,
        vitesse,
        location: baseLocation.name,
      });
    }

    return updated;
  }
}
