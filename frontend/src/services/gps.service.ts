import api from './api';
import { io, Socket } from 'socket.io-client';

export interface TrackerGps {
  id: number;
  camionId?: number;
  camion?: any;
  imei: string;
  simNumero?: string;
  simOperateur?: string;
  modeleTracker?: string;
  actif: boolean;
  dernierePositionLat?: number;
  dernierePositionLng?: number;
  dernierePositionDate?: string;
  vitesseActuelle?: number;
  cap?: number;
  enLigne: boolean;
  derniereConnexion?: string;
  alerteSurvitesseSeuil: number;
  alerteGeofenceActive: boolean;
}

export interface Position {
  id: number;
  camionId?: number;
  camion?: { immatriculation: string; typeCamion: string };
  lat: number;
  lng: number;
  vitesse?: number;
  cap?: number;
  enLigne: boolean;
  derniereMaj?: string;
}

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

export interface WhatsGpsStatus {
  configured: boolean;
  authenticated: boolean;
  platform: string;
  userId: number | null;
}

export interface WhatsGpsStats {
  total: number;
  online: number;
  offline: number;
}

// Geofence Types
export type GeofenceType = 'circle' | 'polygon';
export type GeofenceAlertType = 'enter' | 'exit' | 'both';

export interface GpsGeofence {
  id: number;
  nom: string;
  description?: string;
  type: GeofenceType;
  centerLat?: number;
  centerLng?: number;
  radius?: number;
  coordinates?: { lat: number; lng: number }[];
  alertType: GeofenceAlertType;
  actif: boolean;
  couleur: string;
  trackers?: TrackerGps[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGeofenceDto {
  nom: string;
  description?: string;
  type: GeofenceType;
  centerLat?: number;
  centerLng?: number;
  radius?: number;
  coordinates?: { lat: number; lng: number }[];
  alertType?: GeofenceAlertType;
  couleur?: string;
  trackerIds?: number[];
}

// Alert Types
export type GpsAlertType =
  | 'overspeed'
  | 'geofence_enter'
  | 'geofence_exit'
  | 'offline'
  | 'low_battery'
  | 'sos'
  | 'vibration'
  | 'power_cut'
  | 'external';

export type GpsAlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type GpsAlertStatus = 'new' | 'read' | 'acknowledged' | 'resolved';

export interface GpsAlert {
  id: number;
  trackerId?: number;
  tracker?: TrackerGps;
  camionId?: number;
  camion?: any;
  geofenceId?: number;
  geofence?: GpsGeofence;
  type: GpsAlertType;
  severity: GpsAlertSeverity;
  status: GpsAlertStatus;
  message: string;
  details?: string;
  lat?: number;
  lng?: number;
  speedRecorded?: number;
  speedLimit?: number;
  alertTime: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

// History Types
export interface GpsPositionHistory {
  id: number;
  trackerId: number;
  lat: number;
  lng: number;
  vitesse?: number;
  cap?: number;
  altitude?: number;
  mileage?: number;
  enLigne: boolean;
  timestamp: string;
  pointType?: number;
}

export interface TravelStats {
  totalDistance: number;
  totalTime: number;
  maxSpeed: number;
  avgSpeed: number;
  stoppedTime: number;
  movingTime: number;
  stops: {
    lat: number;
    lng: number;
    duration: number;
    startTime: string;
  }[];
}

// WebSocket Event Types
export interface GpsPositionUpdate {
  trackerId: number;
  camionId?: number;
  imei: string;
  immatriculation?: string;
  lat: number;
  lng: number;
  vitesse: number;
  cap: number;
  enLigne: boolean;
  timestamp: string;
}

export interface GpsAlertNotification {
  id: number;
  type: GpsAlertType;
  severity: GpsAlertSeverity;
  message: string;
  trackerId?: number;
  camionId?: number;
  immatriculation?: string;
  lat?: number;
  lng?: number;
  timestamp: string;
}

export interface GeofenceEvent {
  type: 'enter' | 'exit';
  geofenceId: number;
  geofenceName: string;
  trackerId: number;
  camionId?: number;
  immatriculation?: string;
  lat: number;
  lng: number;
  timestamp: string;
}

// WebSocket Client
class GpsWebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      this.socket = io(`${baseUrl}/gps`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.socket.on('connect', () => {
        console.log('[GPS WebSocket] Connected');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[GPS WebSocket] Connection error:', error);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Failed to connect to GPS WebSocket'));
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[GPS WebSocket] Disconnected:', reason);
        this.emit('disconnect', { reason });
      });

      // Position updates
      this.socket.on('position:update', (data: GpsPositionUpdate) => {
        this.emit('position:update', data);
      });

      this.socket.on('positions:batch', (data: GpsPositionUpdate[]) => {
        this.emit('positions:batch', data);
      });

      // Alerts
      this.socket.on('alert:new', (data: GpsAlertNotification) => {
        this.emit('alert:new', data);
      });

      // Geofence events
      this.socket.on('geofence:event', (data: GeofenceEvent) => {
        this.emit('geofence:event', data);
      });

      // Tracker status changes
      this.socket.on('tracker:status', (data: any) => {
        this.emit('tracker:status', data);
      });

      // Sync status
      this.socket.on('sync:status', (data: any) => {
        this.emit('sync:status', data);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  subscribeToTracker(trackerId: number): void {
    this.socket?.emit('subscribe:tracker', { trackerId });
  }

  unsubscribeFromTracker(trackerId: number): void {
    this.socket?.emit('unsubscribe:tracker', { trackerId });
  }

  subscribeToAlerts(): void {
    this.socket?.emit('subscribe:alerts');
  }

  subscribeToGeofence(geofenceId: number): void {
    this.socket?.emit('subscribe:geofence', { geofenceId });
  }

  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const gpsWebSocket = new GpsWebSocketClient();

export const gpsService = {
  // Trackers
  async getTrackers(): Promise<TrackerGps[]> {
    const response = await api.get<TrackerGps[]>('/gps/trackers');
    return response.data;
  },

  async getTracker(id: number): Promise<TrackerGps> {
    const response = await api.get<TrackerGps>(`/gps/trackers/${id}`);
    return response.data;
  },

  async createTracker(data: Partial<TrackerGps>): Promise<TrackerGps> {
    const response = await api.post<TrackerGps>('/gps/trackers', data);
    return response.data;
  },

  async updateTracker(id: number, data: Partial<TrackerGps>): Promise<TrackerGps> {
    const response = await api.put<TrackerGps>(`/gps/trackers/${id}`, data);
    return response.data;
  },

  async getPositions(): Promise<Position[]> {
    const response = await api.get<Position[]>('/gps/positions');
    return response.data;
  },

  async getStats(): Promise<{ total: number; enLigne: number; horsLigne: number }> {
    const response = await api.get('/gps/trackers/stats');
    return response.data;
  },

  async simulatePositions(): Promise<any[]> {
    const response = await api.post('/gps/simulate');
    return response.data;
  },

  // Geofences
  async getGeofences(): Promise<GpsGeofence[]> {
    const response = await api.get<GpsGeofence[]>('/gps/geofences');
    return response.data;
  },

  async getGeofence(id: number): Promise<GpsGeofence> {
    const response = await api.get<GpsGeofence>(`/gps/geofences/${id}`);
    return response.data;
  },

  async createGeofence(data: CreateGeofenceDto): Promise<GpsGeofence> {
    const response = await api.post<GpsGeofence>('/gps/geofences', data);
    return response.data;
  },

  async updateGeofence(id: number, data: Partial<CreateGeofenceDto>): Promise<GpsGeofence> {
    const response = await api.put<GpsGeofence>(`/gps/geofences/${id}`, data);
    return response.data;
  },

  async deleteGeofence(id: number): Promise<void> {
    await api.delete(`/gps/geofences/${id}`);
  },

  async assignTrackersToGeofence(geofenceId: number, trackerIds: number[]): Promise<GpsGeofence> {
    const response = await api.post<GpsGeofence>(`/gps/geofences/${geofenceId}/trackers`, {
      trackerIds,
    });
    return response.data;
  },

  async getGeofencesByTracker(trackerId: number): Promise<GpsGeofence[]> {
    const response = await api.get<GpsGeofence[]>(`/gps/geofences/tracker/${trackerId}`);
    return response.data;
  },

  async getGeofenceStats(): Promise<{
    total: number;
    byType: Record<GeofenceType, number>;
    withTrackers: number;
    withoutTrackers: number;
  }> {
    const response = await api.get('/gps/geofences/stats');
    return response.data;
  },

  // Alerts
  async getAlerts(filters?: {
    trackerId?: number;
    camionId?: number;
    type?: GpsAlertType;
    status?: GpsAlertStatus;
    severity?: GpsAlertSeverity;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<GpsAlert[]> {
    const response = await api.get<GpsAlert[]>('/gps/alerts', { params: filters });
    return response.data;
  },

  async getAlertStats(startDate?: string, endDate?: string): Promise<{
    total: number;
    byType: Record<GpsAlertType, number>;
    byStatus: Record<GpsAlertStatus, number>;
    bySeverity: Record<GpsAlertSeverity, number>;
  }> {
    const response = await api.get('/gps/alerts/stats', { params: { startDate, endDate } });
    return response.data;
  },

  async updateAlertStatus(
    alertId: number,
    status: GpsAlertStatus,
    username?: string,
    resolution?: string,
  ): Promise<GpsAlert> {
    const response = await api.put<GpsAlert>(`/gps/alerts/${alertId}/status`, {
      status,
      username,
      resolution,
    });
    return response.data;
  },

  // History
  async getHistory(
    trackerId: number,
    startTime: string,
    endTime: string,
    limit?: number,
  ): Promise<GpsPositionHistory[]> {
    const response = await api.get<GpsPositionHistory[]>(`/gps/history/${trackerId}`, {
      params: { startTime, endTime, limit },
    });
    return response.data;
  },

  async getSimplifiedTrack(
    trackerId: number,
    startTime: string,
    endTime: string,
    maxPoints?: number,
  ): Promise<GpsPositionHistory[]> {
    const response = await api.get<GpsPositionHistory[]>(`/gps/history/${trackerId}/simplified`, {
      params: { startTime, endTime, maxPoints },
    });
    return response.data;
  },

  async getTravelStats(trackerId: number, startTime: string, endTime: string): Promise<TravelStats> {
    const response = await api.get<TravelStats>(`/gps/history/${trackerId}/stats`, {
      params: { startTime, endTime },
    });
    return response.data;
  },

  async getDailyMileage(
    trackerId: number,
    startDate: string,
    endDate: string,
  ): Promise<{ date: string; distance: number }[]> {
    const response = await api.get(`/gps/history/${trackerId}/mileage`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // Real-time Status
  async getRealtimeStatus(): Promise<{ connectedClients: number; websocketNamespace: string }> {
    const response = await api.get('/gps/realtime/status');
    return response.data;
  },

  // WhatsGPS Integration
  async getWhatsGpsStatus(): Promise<WhatsGpsStatus> {
    const response = await api.get('/gps/whatsgps/status');
    return response.data;
  },

  async syncWhatsGps(): Promise<{ synced: number; errors: number; devices: string[] }> {
    const response = await api.post('/gps/whatsgps/sync');
    return response.data;
  },

  async loginWhatsGps(): Promise<{ success: boolean }> {
    const response = await api.post('/gps/whatsgps/login');
    return response.data;
  },

  async getWhatsGpsVehicles(): Promise<any[]> {
    const response = await api.get('/gps/whatsgps/vehicles');
    return response.data;
  },

  async getAllWhatsGpsVehicleStatus(): Promise<WhatsGpsDevice[]> {
    const response = await api.get('/gps/whatsgps/vehicles/status');
    return response.data;
  },

  async getWhatsGpsVehicleStatus(carIds: number[]): Promise<WhatsGpsDevice[]> {
    const response = await api.get(`/gps/whatsgps/vehicles/${carIds.join(',')}/status`);
    return response.data;
  },

  async getWhatsGpsHistory(
    carId: number,
    startTime: string,
    endTime: string,
  ): Promise<WhatsGpsHistoryPoint[]> {
    const response = await api.get('/gps/whatsgps/history/' + carId, {
      params: { startTime, endTime },
    });
    return response.data;
  },

  async getWhatsGpsVehicleByImei(imei: string): Promise<any | null> {
    const response = await api.get(`/gps/whatsgps/vehicle/imei/${imei}`);
    return response.data;
  },

  async getWhatsGpsAlarms(): Promise<any[]> {
    const response = await api.get('/gps/whatsgps/alarms');
    return response.data;
  },

  async getWhatsGpsStats(): Promise<WhatsGpsStats> {
    const response = await api.get('/gps/whatsgps/stats');
    return response.data;
  },

  async setWhatsGpsPlatform(platform: 'whatsgps' | 'iotlink'): Promise<{ success: boolean; platform: string }> {
    const response = await api.post('/gps/whatsgps/platform', { platform });
    return response.data;
  },
};

export default gpsService;
