import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Camion } from './camion.entity';

@Entity('trackers_gps')
export class TrackerGps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'camion_id', unique: true, nullable: true })
  camionId: number;

  @OneToOne(() => Camion, { nullable: true })
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({ length: 20, unique: true })
  imei: string;

  @Column({ name: 'sim_numero', type: 'varchar', length: 20, nullable: true })
  simNumero: string;

  @Column({ name: 'sim_operateur', type: 'varchar', length: 50, nullable: true })
  simOperateur: string;

  @Column({ name: 'modele_tracker', type: 'varchar', length: 100, nullable: true })
  modeleTracker: string;

  @Column({ name: 'firmware_version', type: 'varchar', length: 50, nullable: true })
  firmwareVersion: string;

  @Column({ default: true })
  actif: boolean;

  @Column({
    name: 'derniere_position_lat',
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
  })
  dernierePositionLat: number;

  @Column({
    name: 'derniere_position_lng',
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
  })
  dernierePositionLng: number;

  @Column({ name: 'derniere_position_date', type: 'timestamp', nullable: true })
  dernierePositionDate: Date;

  @Column({ name: 'vitesse_actuelle', type: 'integer', nullable: true })
  vitesseActuelle: number;

  @Column({ type: 'integer', nullable: true })
  cap: number;

  @Column({ type: 'integer', nullable: true })
  altitude: number;

  @Column({ name: 'en_ligne', default: false })
  enLigne: boolean;

  @Column({ name: 'derniere_connexion', type: 'timestamp', nullable: true })
  derniereConnexion: Date;

  @Column({ name: 'alerte_survitesse_seuil', default: 100 })
  alerteSurvitesseSeuil: number;

  @Column({ name: 'alerte_geofence_active', default: false })
  alerteGeofenceActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
