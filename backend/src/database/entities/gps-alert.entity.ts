import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TrackerGps } from './tracker-gps.entity';
import { GpsGeofence } from './gps-geofence.entity';
import { Camion } from './camion.entity';

export enum GpsAlertType {
  OVERSPEED = 'overspeed',
  GEOFENCE_ENTER = 'geofence_enter',
  GEOFENCE_EXIT = 'geofence_exit',
  OFFLINE = 'offline',
  LOW_BATTERY = 'low_battery',
  SOS = 'sos',
  VIBRATION = 'vibration',
  POWER_CUT = 'power_cut',
  EXTERNAL = 'external', // From WhatsGPS
}

export enum GpsAlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum GpsAlertStatus {
  NEW = 'new',
  READ = 'read',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

@Entity('gps_alerts')
export class GpsAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tracker_id', type: 'integer', nullable: true })
  trackerId: number;

  @ManyToOne(() => TrackerGps, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tracker_id' })
  tracker: TrackerGps;

  @Column({ name: 'camion_id', type: 'integer', nullable: true })
  camionId: number;

  @ManyToOne(() => Camion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({ name: 'geofence_id', type: 'integer', nullable: true })
  geofenceId: number;

  @ManyToOne(() => GpsGeofence, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'geofence_id' })
  geofence: GpsGeofence;

  @Column({
    type: 'enum',
    enum: GpsAlertType,
  })
  type: GpsAlertType;

  @Column({
    type: 'enum',
    enum: GpsAlertSeverity,
    default: GpsAlertSeverity.MEDIUM,
  })
  severity: GpsAlertSeverity;

  @Column({
    type: 'enum',
    enum: GpsAlertStatus,
    default: GpsAlertStatus.NEW,
  })
  status: GpsAlertStatus;

  @Column({ length: 255 })
  message: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  // Position where alert occurred
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  lat: number;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  lng: number;

  // For overspeed alerts
  @Column({ name: 'speed_recorded', nullable: true })
  speedRecorded: number;

  @Column({ name: 'speed_limit', nullable: true })
  speedLimit: number;

  // External alarm ID from WhatsGPS
  @Column({ name: 'external_id', type: 'integer', nullable: true })
  externalId: number;

  @Column({ name: 'alert_time', type: 'timestamp' })
  alertTime: Date;

  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true })
  acknowledgedAt: Date;

  @Column({ name: 'acknowledged_by', nullable: true })
  acknowledgedBy: string;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string;

  @Column({ type: 'text', nullable: true })
  resolution: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
