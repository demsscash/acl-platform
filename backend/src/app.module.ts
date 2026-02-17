import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';

import configuration from './config/configuration';

// Entities
import {
  User,
  Camion,
  Chauffeur,
  Client,
  ContactClient,
  Fournisseur,
  CataloguePiece,
  StockPiece,
  SortieStock,
  LigneSortieStock,
  EntreeStock,
  LigneEntreeStock,
  MouvementPiece,
  CuveCarburant,
  ApprovisionnementCuve,
  DotationCarburant,
  StationPartenaire,
  BonTransport,
  BonLocation,
  Mission,
  CoutMission,
  BilanFinancierMission,
  Panne,
  Maintenance,
  PlanificationMaintenance,
  HistoriqueMaintenance,
  CataloguePneu,
  StockPneumatique,
  ControlePneumatique,
  TrackerGps,
  GpsGeofence,
  GpsPositionHistory,
  GpsAlert,
  HistoriqueAffectation,
  JournalEvenementCamion,
  Incident,
  StatistiqueChauffeurMensuel,
  EvaluationChauffeur,
  StatistiqueCamionMensuel,
  EvaluationClient,
  ReclamationClient,
  RouteFrequente,
  Alerte,
  Notification,
  PreferenceNotification,
  ConfigSysteme,
  AuditLog,
  KpiQuotidien,
  Fichier,
  Caisse,
  MouvementCaisse,
} from './database/entities';

// Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CamionsModule } from './camions/camions.module';
import { ChauffeursModule } from './chauffeurs/chauffeurs.module';
import { PiecesModule } from './pieces/pieces.module';
import { CarburantModule } from './carburant/carburant.module';
import { TransportModule } from './transport/transport.module';
import { GpsModule } from './gps/gps.module';
import { AlertesModule } from './alertes/alertes.module';
import { LocationModule } from './location/location.module';
import { ExportModule } from './export/export.module';
import { PneumatiquesModule } from './pneumatiques/pneumatiques.module';
import { UploadsModule } from './uploads/uploads.module';
import { PannesModule } from './pannes/pannes.module';
import { SyncModule } from './sync/sync.module';
import { ClientsModule } from './clients/clients.module';
import { EmailModule } from './email/email.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EntretienModule } from './entretien/entretien.module';
import { CaissesModule } from './caisses/caisses.module';
import { ConfigSystemeModule } from './config-systeme/config-systeme.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get('database.url');
        const baseConfig = {
          type: 'postgres' as const,
          entities: [
            User,
            Camion,
            Chauffeur,
            Client,
            ContactClient,
            Fournisseur,
            CataloguePiece,
            StockPiece,
            SortieStock,
            LigneSortieStock,
            EntreeStock,
            LigneEntreeStock,
            MouvementPiece,
            CuveCarburant,
            ApprovisionnementCuve,
            DotationCarburant,
            StationPartenaire,
            BonTransport,
            BonLocation,
            Mission,
            CoutMission,
            BilanFinancierMission,
            Panne,
            Maintenance,
            PlanificationMaintenance,
            HistoriqueMaintenance,
            CataloguePneu,
            StockPneumatique,
            ControlePneumatique,
            TrackerGps,
            GpsGeofence,
            GpsPositionHistory,
            GpsAlert,
            HistoriqueAffectation,
            JournalEvenementCamion,
            Incident,
            StatistiqueChauffeurMensuel,
            EvaluationChauffeur,
            StatistiqueCamionMensuel,
            EvaluationClient,
            ReclamationClient,
            RouteFrequente,
            Alerte,
            Notification,
            PreferenceNotification,
            ConfigSysteme,
            AuditLog,
            KpiQuotidien,
            Fichier,
            Caisse,
            MouvementCaisse,
          ],
          synchronize: false,
          logging: process.env.NODE_ENV === 'development',
        };

        if (databaseUrl) {
          return {
            ...baseConfig,
            url: databaseUrl,
            ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
          };
        }

        return {
          ...baseConfig,
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.name'),
        };
      },
      inject: [ConfigService],
    }),

    // Scheduler for cron jobs
    ScheduleModule.forRoot(),

    // BullMQ Queue for async jobs
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),

    // Feature Modules
    EmailModule,
    AuthModule,
    UsersModule,
    CamionsModule,
    ChauffeursModule,
    PiecesModule,
    CarburantModule,
    TransportModule,
    GpsModule,
    AlertesModule,
    LocationModule,
    ExportModule,
    PneumatiquesModule,
    UploadsModule,
    PannesModule,
    SyncModule,
    ClientsModule,
    NotificationsModule,
    EntretienModule,
    CaissesModule,
    ConfigSystemeModule,
    AuditModule,
  ],
})
export class AppModule {}
