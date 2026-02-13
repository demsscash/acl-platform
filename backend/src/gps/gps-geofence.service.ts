import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  GpsGeofence,
  GeofenceType,
  GeofenceAlertType,
  TrackerGps,
} from '../database/entities';
import { CreateGeofenceDto, UpdateGeofenceDto } from './dto/geofence.dto';

@Injectable()
export class GpsGeofenceService {
  private readonly logger = new Logger(GpsGeofenceService.name);

  constructor(
    @InjectRepository(GpsGeofence)
    private readonly geofenceRepository: Repository<GpsGeofence>,
    @InjectRepository(TrackerGps)
    private readonly trackerRepository: Repository<TrackerGps>,
  ) {}

  async findAll(): Promise<GpsGeofence[]> {
    return this.geofenceRepository.find({
      where: { actif: true },
      relations: ['trackers'],
      order: { nom: 'ASC' },
    });
  }

  async findOne(id: number): Promise<GpsGeofence> {
    const geofence = await this.geofenceRepository.findOne({
      where: { id },
      relations: ['trackers', 'trackers.camion'],
    });

    if (!geofence) {
      throw new NotFoundException(`Geofence #${id} non trouvée`);
    }

    return geofence;
  }

  async create(data: CreateGeofenceDto): Promise<GpsGeofence> {
    const geofence = this.geofenceRepository.create({
      nom: data.nom,
      description: data.description,
      type: data.type,
      centerLat: data.centerLat,
      centerLng: data.centerLng,
      radius: data.radius,
      coordinates: data.coordinates,
      alertType: data.alertType || GeofenceAlertType.BOTH,
      couleur: data.couleur || '#FF5722',
      actif: true,
    });

    const savedGeofence = await this.geofenceRepository.save(geofence);

    // Associate trackers if provided
    if (data.trackerIds && data.trackerIds.length > 0) {
      await this.assignTrackers(savedGeofence.id, data.trackerIds);
    }

    this.logger.log(`Geofence created: ${savedGeofence.nom} (${savedGeofence.id})`);
    return this.findOne(savedGeofence.id);
  }

  async update(id: number, data: UpdateGeofenceDto): Promise<GpsGeofence> {
    const geofence = await this.findOne(id);

    if (data.nom !== undefined) geofence.nom = data.nom;
    if (data.description !== undefined) geofence.description = data.description;
    if (data.type !== undefined) geofence.type = data.type;
    if (data.centerLat !== undefined) geofence.centerLat = data.centerLat;
    if (data.centerLng !== undefined) geofence.centerLng = data.centerLng;
    if (data.radius !== undefined) geofence.radius = data.radius;
    if (data.coordinates !== undefined) geofence.coordinates = data.coordinates;
    if (data.alertType !== undefined) geofence.alertType = data.alertType;
    if (data.couleur !== undefined) geofence.couleur = data.couleur;

    await this.geofenceRepository.save(geofence);

    // Update tracker associations if provided
    if (data.trackerIds !== undefined) {
      await this.assignTrackers(id, data.trackerIds);
    }

    this.logger.log(`Geofence updated: ${geofence.nom} (${id})`);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    const geofence = await this.findOne(id);
    geofence.actif = false;
    await this.geofenceRepository.save(geofence);
    this.logger.log(`Geofence deleted (soft): ${geofence.nom} (${id})`);
  }

  async hardDelete(id: number): Promise<void> {
    await this.geofenceRepository.delete(id);
    this.logger.log(`Geofence hard deleted: ${id}`);
  }

  /**
   * Assign trackers to a geofence
   */
  async assignTrackers(geofenceId: number, trackerIds: number[]): Promise<GpsGeofence> {
    const geofence = await this.geofenceRepository.findOne({
      where: { id: geofenceId },
      relations: ['trackers'],
    });

    if (!geofence) {
      throw new NotFoundException(`Geofence #${geofenceId} non trouvée`);
    }

    if (trackerIds.length === 0) {
      geofence.trackers = [];
    } else {
      const trackers = await this.trackerRepository.find({
        where: { id: In(trackerIds) },
      });
      geofence.trackers = trackers;
    }

    await this.geofenceRepository.save(geofence);

    // Update tracker alerteGeofenceActive flag
    if (trackerIds.length > 0) {
      await this.trackerRepository.update(
        { id: In(trackerIds) },
        { alerteGeofenceActive: true },
      );
    }

    this.logger.log(`Trackers assigned to geofence ${geofenceId}: ${trackerIds.join(', ')}`);
    return this.findOne(geofenceId);
  }

  /**
   * Get all geofences for a specific tracker
   */
  async getGeofencesByTracker(trackerId: number): Promise<GpsGeofence[]> {
    return this.geofenceRepository
      .createQueryBuilder('geofence')
      .leftJoin('geofence.trackers', 'tracker')
      .where('tracker.id = :trackerId', { trackerId })
      .andWhere('geofence.actif = true')
      .getMany();
  }

  /**
   * Check if a point is inside any of the tracker's geofences
   */
  async checkPointAgainstGeofences(
    trackerId: number,
    lat: number,
    lng: number,
  ): Promise<{ inside: GpsGeofence[]; outside: GpsGeofence[] }> {
    const geofences = await this.getGeofencesByTracker(trackerId);

    const inside: GpsGeofence[] = [];
    const outside: GpsGeofence[] = [];

    for (const geofence of geofences) {
      if (this.isPointInsideGeofence(lat, lng, geofence)) {
        inside.push(geofence);
      } else {
        outside.push(geofence);
      }
    }

    return { inside, outside };
  }

  /**
   * Check if a point is inside a geofence
   */
  isPointInsideGeofence(lat: number, lng: number, geofence: GpsGeofence): boolean {
    if (geofence.type === GeofenceType.CIRCLE) {
      const distance = this.haversineDistance(
        lat, lng,
        geofence.centerLat, geofence.centerLng,
      );
      return distance <= geofence.radius;
    } else if (geofence.type === GeofenceType.POLYGON && geofence.coordinates) {
      return this.isPointInsidePolygon(lat, lng, geofence.coordinates);
    }
    return false;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Ray casting algorithm to check if point is inside polygon
   */
  private isPointInsidePolygon(
    lat: number,
    lng: number,
    polygon: { lat: number; lng: number }[],
  ): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].lat;
      const yi = polygon[i].lng;
      const xj = polygon[j].lat;
      const yj = polygon[j].lng;

      const intersect = ((yi > lng) !== (yj > lng)) &&
        (lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi);

      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Get geofence statistics
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<GeofenceType, number>;
    withTrackers: number;
    withoutTrackers: number;
  }> {
    const geofences = await this.geofenceRepository.find({
      where: { actif: true },
      relations: ['trackers'],
    });

    const byType = {
      [GeofenceType.CIRCLE]: 0,
      [GeofenceType.POLYGON]: 0,
    };

    let withTrackers = 0;
    let withoutTrackers = 0;

    geofences.forEach(g => {
      byType[g.type]++;
      if (g.trackers && g.trackers.length > 0) {
        withTrackers++;
      } else {
        withoutTrackers++;
      }
    });

    return {
      total: geofences.length,
      byType,
      withTrackers,
      withoutTrackers,
    };
  }
}
