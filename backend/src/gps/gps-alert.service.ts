import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import {
  GpsAlert,
  GpsAlertType,
  GpsAlertSeverity,
  GpsAlertStatus,
  GpsGeofence,
  GeofenceType,
  GeofenceAlertType,
  TrackerGps,
} from '../database/entities';
import { GpsGateway, GpsAlertNotification } from './gps.gateway';

@Injectable()
export class GpsAlertService {
  private readonly logger = new Logger(GpsAlertService.name);

  constructor(
    @InjectRepository(GpsAlert)
    private readonly alertRepository: Repository<GpsAlert>,
    @InjectRepository(GpsGeofence)
    private readonly geofenceRepository: Repository<GpsGeofence>,
    @InjectRepository(TrackerGps)
    private readonly trackerRepository: Repository<TrackerGps>,
    private readonly gpsGateway: GpsGateway,
  ) {}

  /**
   * Check for overspeed and create alert if threshold exceeded
   */
  async checkOverspeed(
    tracker: TrackerGps,
    speed: number,
    lat: number,
    lng: number,
  ): Promise<GpsAlert | null> {
    if (speed <= tracker.alerteSurvitesseSeuil) {
      return null;
    }

    // Check if we already have a recent overspeed alert for this tracker (within 5 min)
    const recentAlert = await this.alertRepository.findOne({
      where: {
        trackerId: tracker.id,
        type: GpsAlertType.OVERSPEED,
        status: In([GpsAlertStatus.NEW, GpsAlertStatus.READ]),
        alertTime: MoreThan(new Date(Date.now() - 5 * 60 * 1000)),
      },
    });

    if (recentAlert) {
      // Update existing alert with new speed if higher
      if (speed > (recentAlert.speedRecorded || 0)) {
        recentAlert.speedRecorded = speed;
        recentAlert.lat = lat;
        recentAlert.lng = lng;
        recentAlert.alertTime = new Date();
        return this.alertRepository.save(recentAlert);
      }
      return null;
    }

    // Create new overspeed alert
    const severity = this.calculateOverspeedSeverity(speed, tracker.alerteSurvitesseSeuil);
    const alert = this.alertRepository.create({
      trackerId: tracker.id,
      camionId: tracker.camionId,
      type: GpsAlertType.OVERSPEED,
      severity,
      status: GpsAlertStatus.NEW,
      message: `Survitesse détectée: ${speed} km/h (limite: ${tracker.alerteSurvitesseSeuil} km/h)`,
      speedRecorded: speed,
      speedLimit: tracker.alerteSurvitesseSeuil,
      lat,
      lng,
      alertTime: new Date(),
    });

    const savedAlert = await this.alertRepository.save(alert);
    this.notifyAlert(savedAlert, tracker);
    return savedAlert;
  }

  /**
   * Check if position is inside/outside geofences and trigger alerts
   */
  async checkGeofences(
    tracker: TrackerGps,
    lat: number,
    lng: number,
    previousLat?: number,
    previousLng?: number,
  ): Promise<GpsAlert[]> {
    if (!tracker.alerteGeofenceActive) {
      return [];
    }

    // Get all active geofences associated with this tracker
    const geofences = await this.geofenceRepository.find({
      where: { actif: true },
      relations: ['trackers'],
    });

    const alerts: GpsAlert[] = [];

    for (const geofence of geofences) {
      // Check if this tracker is associated with this geofence
      const isAssociated = geofence.trackers?.some(t => t.id === tracker.id);
      if (!isAssociated) continue;

      const isInside = this.isPointInsideGeofence(lat, lng, geofence);
      const wasInside = previousLat !== undefined && previousLng !== undefined
        ? this.isPointInsideGeofence(previousLat, previousLng, geofence)
        : null;

      // Check for entry
      if (isInside && wasInside === false &&
          (geofence.alertType === GeofenceAlertType.ENTER || geofence.alertType === GeofenceAlertType.BOTH)) {
        const alert = await this.createGeofenceAlert(
          tracker,
          geofence,
          GpsAlertType.GEOFENCE_ENTER,
          lat,
          lng,
        );
        if (alert) alerts.push(alert);
      }

      // Check for exit
      if (!isInside && wasInside === true &&
          (geofence.alertType === GeofenceAlertType.EXIT || geofence.alertType === GeofenceAlertType.BOTH)) {
        const alert = await this.createGeofenceAlert(
          tracker,
          geofence,
          GpsAlertType.GEOFENCE_EXIT,
          lat,
          lng,
        );
        if (alert) alerts.push(alert);
      }
    }

    return alerts;
  }

  private async createGeofenceAlert(
    tracker: TrackerGps,
    geofence: GpsGeofence,
    type: GpsAlertType.GEOFENCE_ENTER | GpsAlertType.GEOFENCE_EXIT,
    lat: number,
    lng: number,
  ): Promise<GpsAlert | null> {
    // Check for recent similar alert
    const recentAlert = await this.alertRepository.findOne({
      where: {
        trackerId: tracker.id,
        geofenceId: geofence.id,
        type,
        status: In([GpsAlertStatus.NEW, GpsAlertStatus.READ]),
        alertTime: MoreThan(new Date(Date.now() - 10 * 60 * 1000)),
      },
    });

    if (recentAlert) {
      return null;
    }

    const action = type === GpsAlertType.GEOFENCE_ENTER ? 'entré dans' : 'sorti de';
    const alert = this.alertRepository.create({
      trackerId: tracker.id,
      camionId: tracker.camionId,
      geofenceId: geofence.id,
      type,
      severity: GpsAlertSeverity.MEDIUM,
      status: GpsAlertStatus.NEW,
      message: `Véhicule ${action} la zone "${geofence.nom}"`,
      lat,
      lng,
      alertTime: new Date(),
    });

    const savedAlert = await this.alertRepository.save(alert);
    this.notifyAlert(savedAlert, tracker);
    this.notifyGeofenceEvent(type, geofence, tracker, lat, lng);
    return savedAlert;
  }

  /**
   * Check if a point is inside a geofence
   */
  isPointInsideGeofence(lat: number, lng: number, geofence: GpsGeofence): boolean {
    if (geofence.type === GeofenceType.CIRCLE) {
      return this.isPointInsideCircle(lat, lng, geofence.centerLat, geofence.centerLng, geofence.radius);
    } else if (geofence.type === GeofenceType.POLYGON && geofence.coordinates) {
      return this.isPointInsidePolygon(lat, lng, geofence.coordinates);
    }
    return false;
  }

  /**
   * Check if point is inside a circle (using Haversine formula)
   */
  private isPointInsideCircle(
    lat: number,
    lng: number,
    centerLat: number,
    centerLng: number,
    radiusMeters: number,
  ): boolean {
    const distance = this.haversineDistance(lat, lng, centerLat, centerLng);
    return distance <= radiusMeters;
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
   * Check if point is inside a polygon (ray casting algorithm)
   */
  private isPointInsidePolygon(lat: number, lng: number, polygon: { lat: number; lng: number }[]): boolean {
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
   * Calculate severity based on speed excess
   */
  private calculateOverspeedSeverity(speed: number, limit: number): GpsAlertSeverity {
    const excess = ((speed - limit) / limit) * 100;

    if (excess >= 50) return GpsAlertSeverity.CRITICAL;
    if (excess >= 30) return GpsAlertSeverity.HIGH;
    if (excess >= 15) return GpsAlertSeverity.MEDIUM;
    return GpsAlertSeverity.LOW;
  }

  /**
   * Send real-time notification via WebSocket
   */
  private async notifyAlert(alert: GpsAlert, tracker: TrackerGps) {
    const notification: GpsAlertNotification = {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      trackerId: alert.trackerId,
      camionId: alert.camionId,
      immatriculation: tracker.camion?.immatriculation,
      lat: alert.lat,
      lng: alert.lng,
      timestamp: alert.alertTime,
    };

    this.gpsGateway.broadcastAlert(notification);
    this.logger.log(`Alert broadcasted: ${alert.type} - ${alert.message}`);
  }

  /**
   * Send geofence event notification
   */
  private notifyGeofenceEvent(
    type: GpsAlertType.GEOFENCE_ENTER | GpsAlertType.GEOFENCE_EXIT,
    geofence: GpsGeofence,
    tracker: TrackerGps,
    lat: number,
    lng: number,
  ) {
    this.gpsGateway.broadcastGeofenceEvent({
      type: type === GpsAlertType.GEOFENCE_ENTER ? 'enter' : 'exit',
      geofenceId: geofence.id,
      geofenceName: geofence.nom,
      trackerId: tracker.id,
      camionId: tracker.camionId,
      immatriculation: tracker.camion?.immatriculation,
      lat,
      lng,
      timestamp: new Date(),
    });
  }

  /**
   * Get alerts with filters
   */
  async getAlerts(filters: {
    trackerId?: number;
    camionId?: number;
    type?: GpsAlertType;
    status?: GpsAlertStatus;
    severity?: GpsAlertSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<GpsAlert[]> {
    const query = this.alertRepository.createQueryBuilder('alert')
      .leftJoinAndSelect('alert.tracker', 'tracker')
      .leftJoinAndSelect('alert.camion', 'camion')
      .leftJoinAndSelect('alert.geofence', 'geofence')
      .orderBy('alert.alertTime', 'DESC');

    if (filters.trackerId) {
      query.andWhere('alert.trackerId = :trackerId', { trackerId: filters.trackerId });
    }
    if (filters.camionId) {
      query.andWhere('alert.camionId = :camionId', { camionId: filters.camionId });
    }
    if (filters.type) {
      query.andWhere('alert.type = :type', { type: filters.type });
    }
    if (filters.status) {
      query.andWhere('alert.status = :status', { status: filters.status });
    }
    if (filters.severity) {
      query.andWhere('alert.severity = :severity', { severity: filters.severity });
    }
    if (filters.startDate) {
      query.andWhere('alert.alertTime >= :startDate', { startDate: filters.startDate });
    }
    if (filters.endDate) {
      query.andWhere('alert.alertTime <= :endDate', { endDate: filters.endDate });
    }
    if (filters.limit) {
      query.take(filters.limit);
    }

    return query.getMany();
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(
    alertId: number,
    status: GpsAlertStatus,
    username?: string,
    resolution?: string,
  ): Promise<GpsAlert> {
    const alert = await this.alertRepository.findOneOrFail({ where: { id: alertId } });

    alert.status = status;

    if (status === GpsAlertStatus.ACKNOWLEDGED) {
      alert.acknowledgedAt = new Date();
      if (username) alert.acknowledgedBy = username;
    } else if (status === GpsAlertStatus.RESOLVED) {
      alert.resolvedAt = new Date();
      if (username) alert.resolvedBy = username;
      if (resolution) alert.resolution = resolution;
    }

    return this.alertRepository.save(alert);
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(startDate?: Date, endDate?: Date): Promise<{
    total: number;
    byType: Record<GpsAlertType, number>;
    byStatus: Record<GpsAlertStatus, number>;
    bySeverity: Record<GpsAlertSeverity, number>;
  }> {
    const query = this.alertRepository.createQueryBuilder('alert');

    if (startDate) {
      query.andWhere('alert.alertTime >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('alert.alertTime <= :endDate', { endDate });
    }

    const alerts = await query.getMany();

    const byType = {} as Record<GpsAlertType, number>;
    const byStatus = {} as Record<GpsAlertStatus, number>;
    const bySeverity = {} as Record<GpsAlertSeverity, number>;

    // Initialize counters
    Object.values(GpsAlertType).forEach(t => byType[t] = 0);
    Object.values(GpsAlertStatus).forEach(s => byStatus[s] = 0);
    Object.values(GpsAlertSeverity).forEach(s => bySeverity[s] = 0);

    alerts.forEach(alert => {
      byType[alert.type]++;
      byStatus[alert.status]++;
      bySeverity[alert.severity]++;
    });

    return {
      total: alerts.length,
      byType,
      byStatus,
      bySeverity,
    };
  }
}
