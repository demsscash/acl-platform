import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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
  timestamp: Date;
}

export interface GpsAlertNotification {
  id: number;
  type: string;
  severity: string;
  message: string;
  trackerId?: number;
  camionId?: number;
  immatriculation?: string;
  lat?: number;
  lng?: number;
  timestamp: Date;
}

@WebSocketGateway({
  namespace: '/gps',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class GpsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GpsGateway.name);
  private connectedClients: Map<string, { userId?: number; subscribedTrackers: Set<number> }> = new Map();

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('GPS WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          this.connectedClients.set(client.id, {
            userId: payload.sub,
            subscribedTrackers: new Set()
          });
          this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
        } catch (error) {
          this.logger.warn(`Invalid token for client ${client.id}`);
          this.connectedClients.set(client.id, { subscribedTrackers: new Set() });
        }
      } else {
        this.connectedClients.set(client.id, { subscribedTrackers: new Set() });
        this.logger.log(`Client connected: ${client.id} (anonymous)`);
      }

      // Join default room for all GPS updates
      client.join('gps:all');
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:tracker')
  handleSubscribeTracker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { trackerId: number },
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.subscribedTrackers.add(data.trackerId);
      client.join(`tracker:${data.trackerId}`);
      this.logger.debug(`Client ${client.id} subscribed to tracker ${data.trackerId}`);
    }
    return { subscribed: true, trackerId: data.trackerId };
  }

  @SubscribeMessage('unsubscribe:tracker')
  handleUnsubscribeTracker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { trackerId: number },
  ) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      clientData.subscribedTrackers.delete(data.trackerId);
      client.leave(`tracker:${data.trackerId}`);
      this.logger.debug(`Client ${client.id} unsubscribed from tracker ${data.trackerId}`);
    }
    return { unsubscribed: true, trackerId: data.trackerId };
  }

  @SubscribeMessage('subscribe:alerts')
  handleSubscribeAlerts(@ConnectedSocket() client: Socket) {
    client.join('gps:alerts');
    this.logger.debug(`Client ${client.id} subscribed to alerts`);
    return { subscribed: true, channel: 'alerts' };
  }

  @SubscribeMessage('subscribe:geofence')
  handleSubscribeGeofence(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { geofenceId: number },
  ) {
    client.join(`geofence:${data.geofenceId}`);
    this.logger.debug(`Client ${client.id} subscribed to geofence ${data.geofenceId}`);
    return { subscribed: true, geofenceId: data.geofenceId };
  }

  // Broadcast position update to all clients
  broadcastPositionUpdate(position: GpsPositionUpdate) {
    this.server.to('gps:all').emit('position:update', position);

    // Also send to specific tracker room
    if (position.trackerId) {
      this.server.to(`tracker:${position.trackerId}`).emit('position:update', position);
    }
  }

  // Broadcast multiple position updates (batch)
  broadcastPositionUpdates(positions: GpsPositionUpdate[]) {
    this.server.to('gps:all').emit('positions:batch', positions);
  }

  // Broadcast alert to subscribed clients
  broadcastAlert(alert: GpsAlertNotification) {
    this.server.to('gps:alerts').emit('alert:new', alert);
    this.server.to('gps:all').emit('alert:new', alert);

    // Also send to specific tracker room if associated
    if (alert.trackerId) {
      this.server.to(`tracker:${alert.trackerId}`).emit('alert:new', alert);
    }
  }

  // Broadcast geofence event
  broadcastGeofenceEvent(event: {
    type: 'enter' | 'exit';
    geofenceId: number;
    geofenceName: string;
    trackerId: number;
    camionId?: number;
    immatriculation?: string;
    lat: number;
    lng: number;
    timestamp: Date;
  }) {
    this.server.to(`geofence:${event.geofenceId}`).emit('geofence:event', event);
    this.server.to('gps:all').emit('geofence:event', event);
  }

  // Broadcast tracker online/offline status change
  broadcastStatusChange(data: {
    trackerId: number;
    camionId?: number;
    immatriculation?: string;
    enLigne: boolean;
    timestamp: Date;
  }) {
    this.server.to('gps:all').emit('tracker:status', data);
    this.server.to(`tracker:${data.trackerId}`).emit('tracker:status', data);
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Broadcast sync status
  broadcastSyncStatus(status: {
    inProgress: boolean;
    synced: number;
    errors: number;
    timestamp: Date;
  }) {
    this.server.to('gps:all').emit('sync:status', status);
  }
}
