import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { GpsPositionHistory, TrackerGps } from '../database/entities';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class GpsHistoryService {
  private readonly logger = new Logger(GpsHistoryService.name);

  // Configuration
  private readonly HISTORY_RETENTION_DAYS = 90; // Keep 90 days of history
  private readonly MIN_POSITION_INTERVAL_MS = 30000; // 30 seconds minimum between positions

  constructor(
    @InjectRepository(GpsPositionHistory)
    private readonly historyRepository: Repository<GpsPositionHistory>,
    @InjectRepository(TrackerGps)
    private readonly trackerRepository: Repository<TrackerGps>,
  ) {}

  /**
   * Record a position in history
   */
  async recordPosition(
    trackerId: number,
    lat: number,
    lng: number,
    vitesse?: number,
    cap?: number,
    altitude?: number,
    mileage?: number,
    timestamp?: Date,
    pointType?: number,
    enLigne: boolean = true,
  ): Promise<GpsPositionHistory> {
    // Check if we already have a recent position to avoid duplicates
    const recentPosition = await this.historyRepository.findOne({
      where: {
        trackerId,
        timestamp: Between(
          new Date(Date.now() - this.MIN_POSITION_INTERVAL_MS),
          new Date(),
        ),
      },
      order: { timestamp: 'DESC' },
    });

    // If recent position exists and coordinates haven't changed much, skip
    if (recentPosition) {
      const distance = this.calculateDistance(
        Number(recentPosition.lat), Number(recentPosition.lng),
        lat, lng,
      );
      // Skip if moved less than 10 meters
      if (distance < 10) {
        return recentPosition;
      }
    }

    const position = this.historyRepository.create({
      trackerId,
      lat,
      lng,
      vitesse,
      cap,
      altitude,
      mileage,
      timestamp: timestamp || new Date(),
      pointType,
      enLigne,
    });

    return this.historyRepository.save(position);
  }

  /**
   * Get position history for a tracker
   */
  async getHistory(
    trackerId: number,
    startTime: Date,
    endTime: Date,
    limit?: number,
  ): Promise<GpsPositionHistory[]> {
    const query = this.historyRepository.createQueryBuilder('history')
      .where('history.trackerId = :trackerId', { trackerId })
      .andWhere('history.timestamp BETWEEN :startTime AND :endTime', { startTime, endTime })
      .orderBy('history.timestamp', 'ASC');

    if (limit) {
      query.take(limit);
    }

    return query.getMany();
  }

  /**
   * Get simplified track (reduced points for map display)
   */
  async getSimplifiedTrack(
    trackerId: number,
    startTime: Date,
    endTime: Date,
    maxPoints: number = 500,
  ): Promise<GpsPositionHistory[]> {
    // Get all positions
    const positions = await this.getHistory(trackerId, startTime, endTime);

    if (positions.length <= maxPoints) {
      return positions;
    }

    // Use Douglas-Peucker algorithm for simplification
    return this.simplifyTrack(positions, maxPoints);
  }

  /**
   * Simplify track using sampling
   */
  private simplifyTrack(
    positions: GpsPositionHistory[],
    maxPoints: number,
  ): GpsPositionHistory[] {
    const step = Math.ceil(positions.length / maxPoints);
    const simplified: GpsPositionHistory[] = [];

    for (let i = 0; i < positions.length; i += step) {
      simplified.push(positions[i]);
    }

    // Always include the last point
    if (simplified[simplified.length - 1] !== positions[positions.length - 1]) {
      simplified.push(positions[positions.length - 1]);
    }

    return simplified;
  }

  /**
   * Get travel statistics for a tracker within a time range
   */
  async getTravelStats(
    trackerId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<{
    totalDistance: number; // meters
    totalTime: number; // seconds
    maxSpeed: number;
    avgSpeed: number;
    stoppedTime: number; // seconds
    movingTime: number; // seconds
    stops: { lat: number; lng: number; duration: number; startTime: Date }[];
  }> {
    const positions = await this.getHistory(trackerId, startTime, endTime);

    if (positions.length < 2) {
      return {
        totalDistance: 0,
        totalTime: 0,
        maxSpeed: 0,
        avgSpeed: 0,
        stoppedTime: 0,
        movingTime: 0,
        stops: [],
      };
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    let speedSum = 0;
    let speedCount = 0;
    let stoppedTime = 0;
    let movingTime = 0;
    const stops: { lat: number; lng: number; duration: number; startTime: Date }[] = [];

    let currentStop: { lat: number; lng: number; startTime: Date } | null = null;
    const STOP_SPEED_THRESHOLD = 5; // km/h
    const MIN_STOP_DURATION = 60; // seconds

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];

      // Calculate distance
      const distance = this.calculateDistance(
        Number(prev.lat), Number(prev.lng),
        Number(curr.lat), Number(curr.lng),
      );
      totalDistance += distance;

      // Calculate time difference
      const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;

      // Track speed stats
      if (curr.vitesse !== null && curr.vitesse !== undefined) {
        speedSum += curr.vitesse;
        speedCount++;
        if (curr.vitesse > maxSpeed) maxSpeed = curr.vitesse;
      }

      // Track stops
      if (curr.vitesse !== null && curr.vitesse < STOP_SPEED_THRESHOLD) {
        if (!currentStop) {
          currentStop = {
            lat: Number(curr.lat),
            lng: Number(curr.lng),
            startTime: curr.timestamp,
          };
        }
        stoppedTime += timeDiff;
      } else {
        if (currentStop) {
          const stopDuration = (curr.timestamp.getTime() - currentStop.startTime.getTime()) / 1000;
          if (stopDuration >= MIN_STOP_DURATION) {
            stops.push({
              lat: currentStop.lat,
              lng: currentStop.lng,
              duration: stopDuration,
              startTime: currentStop.startTime,
            });
          }
          currentStop = null;
        }
        movingTime += timeDiff;
      }
    }

    // Handle last stop
    if (currentStop) {
      const lastPosition = positions[positions.length - 1];
      const stopDuration = (lastPosition.timestamp.getTime() - currentStop.startTime.getTime()) / 1000;
      if (stopDuration >= MIN_STOP_DURATION) {
        stops.push({
          lat: currentStop.lat,
          lng: currentStop.lng,
          duration: stopDuration,
          startTime: currentStop.startTime,
        });
      }
    }

    const totalTime = (positions[positions.length - 1].timestamp.getTime() - positions[0].timestamp.getTime()) / 1000;

    return {
      totalDistance: Math.round(totalDistance),
      totalTime: Math.round(totalTime),
      maxSpeed,
      avgSpeed: speedCount > 0 ? Math.round(speedSum / speedCount) : 0,
      stoppedTime: Math.round(stoppedTime),
      movingTime: Math.round(movingTime),
      stops,
    };
  }

  /**
   * Get daily mileage summary
   */
  async getDailyMileage(
    trackerId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<{ date: string; distance: number }[]> {
    const result = await this.historyRepository
      .createQueryBuilder('history')
      .select("TO_CHAR(history.timestamp, 'YYYY-MM-DD')", 'date')
      .addSelect('MAX(history.mileage) - MIN(history.mileage)', 'distance')
      .where('history.trackerId = :trackerId', { trackerId })
      .andWhere('history.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy("TO_CHAR(history.timestamp, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    return result.map(r => ({
      date: r.date,
      distance: parseFloat(r.distance) || 0,
    }));
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
   * Clean up old history data (runs daily at 3 AM)
   */
  @Cron('0 3 * * *')
  async cleanupOldHistory() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.HISTORY_RETENTION_DAYS);

    const result = await this.historyRepository.delete({
      timestamp: LessThan(cutoffDate),
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} old position history records`);
    }
  }

  /**
   * Get position count for a tracker
   */
  async getPositionCount(trackerId: number, startTime?: Date, endTime?: Date): Promise<number> {
    const query = this.historyRepository.createQueryBuilder('history')
      .where('history.trackerId = :trackerId', { trackerId });

    if (startTime && endTime) {
      query.andWhere('history.timestamp BETWEEN :startTime AND :endTime', { startTime, endTime });
    }

    return query.getCount();
  }
}
