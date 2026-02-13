import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { TrackerGps } from './tracker-gps.entity';

export enum GeofenceType {
  CIRCLE = 'circle',
  POLYGON = 'polygon',
}

export enum GeofenceAlertType {
  ENTER = 'enter',
  EXIT = 'exit',
  BOTH = 'both',
}

@Entity('gps_geofences')
export class GpsGeofence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: GeofenceType,
    default: GeofenceType.CIRCLE,
  })
  type: GeofenceType;

  // For circle type: center coordinates
  @Column({
    name: 'center_lat',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  centerLat: number;

  @Column({
    name: 'center_lng',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  centerLng: number;

  // For circle type: radius in meters
  @Column({ type: 'int', nullable: true })
  radius: number;

  // For polygon type: JSON array of coordinates [{lat, lng}, ...]
  @Column({ type: 'jsonb', nullable: true })
  coordinates: { lat: number; lng: number }[];

  @Column({
    name: 'alert_type',
    type: 'enum',
    enum: GeofenceAlertType,
    default: GeofenceAlertType.BOTH,
  })
  alertType: GeofenceAlertType;

  @Column({ default: true })
  actif: boolean;

  // WhatsGPS fence ID if synced from external platform
  @Column({ name: 'external_id', type: 'integer', nullable: true })
  externalId: number;

  // Color for map display
  @Column({ length: 20, default: '#FF5722' })
  couleur: string;

  @ManyToMany(() => TrackerGps)
  @JoinTable({
    name: 'gps_geofence_trackers',
    joinColumn: { name: 'geofence_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tracker_id', referencedColumnName: 'id' },
  })
  trackers: TrackerGps[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
