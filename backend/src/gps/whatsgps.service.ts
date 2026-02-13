import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { GpsService } from './gps.service';
import { GpsGateway } from './gps.gateway';

export interface WhatsGpsDevice {
  carId: number;
  imei: string;
  machineName: string;
  carNO: string;
  lat: number;
  lng: number;
  speed: number;
  dir: number;
  status: string;
  online: boolean;
  pointTime: string;
}

interface WhatsGpsPosition {
  lat: number;
  latc: number;
  lon: number;
  lonc: number;
  speed: number;
  dir: number;
  pointDt: string;
  pointType: number;
  status: number;
  mileage: number;
}

export interface WhatsGpsHistoryPoint {
  lat: number;
  lon: number;
  latc: number;
  lonc: number;
  speed: number;
  dir: number;
  pointDt: string;
  pointType: number;
  altitude: number;
  mileage: number;
}

@Injectable()
export class WhatsGpsService {
  private readonly logger = new Logger(WhatsGpsService.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private userId: number | null = null;

  // Support multiple platforms
  private readonly platforms = {
    whatsgps: 'https://www.whatsgps.com',
    iotlink: 'https://www.iotlink.net',
  };

  private currentPlatform: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => GpsService))
    private readonly gpsService: GpsService,
    @Inject(forwardRef(() => GpsGateway))
    private readonly gpsGateway: GpsGateway,
  ) {
    // Default to whatsgps, can be configured via env
    this.currentPlatform = this.configService.get<string>('WHATSGPS_PLATFORM') || 'whatsgps';
  }

  private get baseUrl(): string {
    return this.platforms[this.currentPlatform] || this.platforms.whatsgps;
  }

  private get credentials() {
    return {
      name: this.configService.get<string>('WHATSGPS_ACCOUNT'),
      password: this.configService.get<string>('WHATSGPS_PASSWORD'),
    };
  }

  isConfigured(): boolean {
    const { name, password } = this.credentials;
    return !!(name && password);
  }

  async login(): Promise<boolean> {
    const { name, password } = this.credentials;

    if (!name || !password) {
      this.logger.warn('WhatsGPS credentials not configured');
      return false;
    }

    try {
      // WhatsGPS API v1.4.0 - user/login.do endpoint
      const url = `${this.baseUrl}/user/login.do?name=${encodeURIComponent(name)}&password=${encodeURIComponent(password)}`;

      this.logger.debug(`Attempting login to ${this.baseUrl}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.json();
      this.logger.debug(`WhatsGPS login response: ${JSON.stringify(data)}`);

      // Response: { "ret": 1|0, "data": { "token": "...", "userId": ..., ... } }
      if (data.ret === 1 && data.data?.token) {
        this.accessToken = data.data.token;
        this.userId = data.data.userId;
        // Token expires in 24h, refresh at 23h
        this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);
        this.logger.log(`WhatsGPS login successful - userId: ${this.userId}`);
        return true;
      } else {
        this.logger.error(`WhatsGPS login failed: ${data.msg || JSON.stringify(data)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`WhatsGPS login error: ${error.message}`);
      return false;
    }
  }

  private async ensureAuthenticated(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return true;
    }

    return this.login();
  }

  /**
   * Get all vehicles for current user
   * API: car/getByUserId.do
   */
  async getVehicles(): Promise<any[]> {
    if (!await this.ensureAuthenticated()) {
      return [];
    }

    try {
      const url = `${this.baseUrl}/car/getByUserId.do?token=${this.accessToken}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.json();
      this.logger.debug(`WhatsGPS vehicles: ${JSON.stringify(data).substring(0, 500)}`);

      if (data.ret === 1 && Array.isArray(data.data)) {
        return data.data;
      } else {
        this.logger.error(`WhatsGPS get vehicles failed: ${data.msg || JSON.stringify(data)}`);
        return [];
      }
    } catch (error) {
      this.logger.error(`WhatsGPS get vehicles error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get vehicle status by car IDs
   * API: carStatus/getByCarIds.do
   * mapType: 2 = Google coordinates
   */
  async getVehicleStatus(carIds: number[]): Promise<WhatsGpsDevice[]> {
    if (!await this.ensureAuthenticated()) {
      return [];
    }

    try {
      const carIdsStr = carIds.join(',');
      const url = `${this.baseUrl}/carStatus/getByCarIds.do?token=${this.accessToken}&carIds=${carIdsStr}&mapType=2`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.json();
      this.logger.debug(`WhatsGPS status response: ${JSON.stringify(data).substring(0, 500)}`);

      if (data.ret === 1 && Array.isArray(data.data)) {
        return data.data.map((vehicle: any) => ({
          carId: vehicle.carId,
          imei: vehicle.imei,
          machineName: vehicle.machineName || vehicle.carNO,
          carNO: vehicle.carNO,
          lat: parseFloat(vehicle.latc) || parseFloat(vehicle.lat) || 0,
          lng: parseFloat(vehicle.lonc) || parseFloat(vehicle.lon) || 0,
          speed: parseFloat(vehicle.speed) || 0,
          dir: parseFloat(vehicle.dir) || 0,
          status: vehicle.status,
          online: vehicle.online,
          pointTime: vehicle.pointTime,
        }));
      } else {
        this.logger.error(`WhatsGPS get status failed: ${data.msg || JSON.stringify(data)}`);
        return [];
      }
    } catch (error) {
      this.logger.error(`WhatsGPS get status error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get vehicle status by user ID (all vehicles at once)
   * API: carStatus/getByUserId.do
   */
  async getAllVehicleStatus(): Promise<WhatsGpsDevice[]> {
    if (!await this.ensureAuthenticated()) {
      return [];
    }

    try {
      const url = `${this.baseUrl}/carStatus/getByUserId.do?token=${this.accessToken}&targetUserId=${this.userId}&mapType=2`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.json();
      this.logger.debug(`WhatsGPS all status: ${JSON.stringify(data).substring(0, 500)}`);

      if (data.ret === 1 && Array.isArray(data.data)) {
        return data.data.map((vehicle: any) => ({
          carId: vehicle.carId,
          imei: vehicle.imei,
          machineName: vehicle.machineName || vehicle.carNO,
          carNO: vehicle.carNO,
          lat: parseFloat(vehicle.latc) || parseFloat(vehicle.lat) || 0,
          lng: parseFloat(vehicle.lonc) || parseFloat(vehicle.lon) || 0,
          speed: parseFloat(vehicle.speed) || 0,
          dir: parseFloat(vehicle.dir) || 0,
          status: vehicle.status,
          online: vehicle.online,
          pointTime: vehicle.pointTime,
        }));
      } else {
        this.logger.error(`WhatsGPS get all status failed: ${data.msg || JSON.stringify(data)}`);
        return [];
      }
    } catch (error) {
      this.logger.error(`WhatsGPS get all status error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get history track for a vehicle
   * API: position/queryHistory.do
   * @param carId - Vehicle ID (from WhatsGPS)
   * @param startTime - UTC start time (yyyy-MM-dd HH:mm:ss)
   * @param endTime - UTC end time (yyyy-MM-dd HH:mm:ss)
   */
  async getHistoryTrack(carId: number, startTime: string, endTime: string): Promise<WhatsGpsHistoryPoint[]> {
    if (!await this.ensureAuthenticated()) {
      return [];
    }

    try {
      const url = `${this.baseUrl}/position/queryHistory.do?token=${this.accessToken}&carId=${carId}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&mapType=2&filter=true`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.json();

      if (data.ret === 1 && Array.isArray(data.data)) {
        return data.data.map((point: any) => ({
          lat: parseFloat(point.latc) || parseFloat(point.lat) || 0,
          lon: parseFloat(point.lonc) || parseFloat(point.lon) || 0,
          latc: parseFloat(point.latc) || 0,
          lonc: parseFloat(point.lonc) || 0,
          speed: parseFloat(point.speed) || 0,
          dir: parseFloat(point.dir) || 0,
          pointDt: point.pointDt,
          pointType: point.pointType,
          altitude: parseFloat(point.altitude) || 0,
          mileage: parseFloat(point.mileage) || 0,
        }));
      } else {
        this.logger.error(`WhatsGPS history failed: ${data.msg || JSON.stringify(data)}`);
        return [];
      }
    } catch (error) {
      this.logger.error(`WhatsGPS history error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get vehicle by IMEI
   * API: car/getByImei.do
   */
  async getVehicleByImei(imei: string): Promise<any | null> {
    if (!await this.ensureAuthenticated()) {
      return null;
    }

    try {
      const url = `${this.baseUrl}/car/getByImei.do?token=${this.accessToken}&imei=${encodeURIComponent(imei)}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.json();

      if (data.ret === 1 && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      this.logger.error(`WhatsGPS getByImei error: ${error.message}`);
      return null;
    }
  }

  /**
   * Get unread alarms
   * API: carAlarm/getNotReadByUser.do
   */
  async getAlarms(): Promise<any[]> {
    if (!await this.ensureAuthenticated()) {
      return [];
    }

    try {
      const url = `${this.baseUrl}/carAlarm/getNotReadByUser.do?token=${this.accessToken}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.json();

      if (data.ret === 1 && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    } catch (error) {
      this.logger.error(`WhatsGPS alarms error: ${error.message}`);
      return [];
    }
  }

  /**
   * Sync all vehicle positions to local database
   */
  async syncPositions(): Promise<{ synced: number; errors: number; devices: string[] }> {
    if (!this.isConfigured()) {
      this.logger.debug('WhatsGPS not configured, skipping sync');
      return { synced: 0, errors: 0, devices: [] };
    }

    const positions = await this.getAllVehicleStatus();
    let synced = 0;
    let errors = 0;
    const devices: string[] = [];

    for (const device of positions) {
      // Skip devices without valid coordinates
      if (!device.lat || !device.lng || device.lat === 0 || device.lng === 0) {
        continue;
      }

      try {
        await this.gpsService.updatePosition(
          device.imei,
          device.lat,
          device.lng,
          device.speed,
          device.dir,
        );
        synced++;
        devices.push(`${device.machineName || device.carNO} (${device.imei})`);
      } catch (error) {
        // Tracker might not exist in our database - that's OK
        if (!error.message?.includes('non trouvé')) {
          this.logger.warn(`Failed to update position for IMEI ${device.imei}: ${error.message}`);
        }
        errors++;
      }
    }

    if (synced > 0) {
      this.logger.log(`WhatsGPS sync completed: ${synced} positions updated, ${errors} errors`);
    }

    // Broadcast sync status via WebSocket
    this.gpsGateway.broadcastSyncStatus({
      inProgress: false,
      synced,
      errors,
      timestamp: new Date(),
    });

    return { synced, errors, devices };
  }

  // Sync every 30 seconds
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    if (this.isConfigured()) {
      await this.syncPositions();
    }
  }

  // Manual sync trigger
  async forceSyncNow(): Promise<{ synced: number; errors: number; devices: string[] }> {
    return this.syncPositions();
  }

  // Get configuration status
  getStatus(): {
    configured: boolean;
    authenticated: boolean;
    platform: string;
    userId: number | null;
  } {
    return {
      configured: this.isConfigured(),
      authenticated: !!(this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry),
      platform: this.currentPlatform,
      userId: this.userId,
    };
  }

  // Switch platform (whatsgps or iotlink)
  setPlatform(platform: 'whatsgps' | 'iotlink'): void {
    if (this.platforms[platform]) {
      this.currentPlatform = platform;
      // Reset authentication when switching platform
      this.accessToken = null;
      this.tokenExpiry = null;
      this.userId = null;
      this.logger.log(`Switched to platform: ${platform}`);
    }
  }

  // Get vehicle statistics
  async getVehicleStats(): Promise<{ total: number; online: number; offline: number }> {
    if (!await this.ensureAuthenticated()) {
      return { total: 0, online: 0, offline: 0 };
    }

    try {
      const url = `${this.baseUrl}/user/getCarStatusCount.do?token=${this.accessToken}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      const data = await response.json();

      if (data.ret === 1 && data.data) {
        return {
          total: data.data.allCount || 0,
          online: data.data.onlineCount || 0,
          offline: data.data.offlineCount || 0,
        };
      }
      return { total: 0, online: 0, offline: 0 };
    } catch (error) {
      this.logger.error(`WhatsGPS stats error: ${error.message}`);
      return { total: 0, online: 0, offline: 0 };
    }
  }
}
