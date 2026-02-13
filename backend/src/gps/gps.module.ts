import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TrackerGps,
  Camion,
  GpsGeofence,
  GpsPositionHistory,
  GpsAlert,
} from '../database/entities';
import { GpsService } from './gps.service';
import { GpsController } from './gps.controller';
import { GpsWebhookController } from './gps-webhook.controller';
import { WhatsGpsService } from './whatsgps.service';
import { GpsGateway } from './gps.gateway';
import { GpsAlertService } from './gps-alert.service';
import { GpsGeofenceService } from './gps-geofence.service';
import { GpsHistoryService } from './gps-history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrackerGps,
      Camion,
      GpsGeofence,
      GpsPositionHistory,
      GpsAlert,
    ]),
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [GpsController, GpsWebhookController],
  providers: [
    GpsService,
    WhatsGpsService,
    GpsGateway,
    GpsAlertService,
    GpsGeofenceService,
    GpsHistoryService,
  ],
  exports: [
    GpsService,
    WhatsGpsService,
    GpsGateway,
    GpsAlertService,
    GpsGeofenceService,
    GpsHistoryService,
  ],
})
export class GpsModule {}
