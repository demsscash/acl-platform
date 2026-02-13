import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TrackerGps } from './tracker-gps.entity';

@Entity('gps_position_history')
@Index(['trackerId', 'timestamp'])
@Index(['timestamp'])
export class GpsPositionHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tracker_id' })
  trackerId: number;

  @ManyToOne(() => TrackerGps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tracker_id' })
  tracker: TrackerGps;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
  })
  lat: number;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
  })
  lng: number;

  @Column({ nullable: true })
  vitesse: number;

  @Column({ nullable: true })
  cap: number;

  @Column({ nullable: true })
  altitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  mileage: number;

  @Column({ name: 'en_ligne', default: true })
  enLigne: boolean;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  // Store raw point type from WhatsGPS if available
  @Column({ name: 'point_type', nullable: true })
  pointType: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
