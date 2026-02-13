import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum TypeNotification {
  ALERTE_PIECE = 'ALERTE_PIECE',
  ALERTE_PNEU = 'ALERTE_PNEU',
  ALERTE_CARBURANT = 'ALERTE_CARBURANT',
  ALERTE_DOCUMENT = 'ALERTE_DOCUMENT',
  ALERTE_MAINTENANCE = 'ALERTE_MAINTENANCE',
  MISSION_ASSIGNEE = 'MISSION_ASSIGNEE',
  MISSION_TERMINEE = 'MISSION_TERMINEE',
  INCIDENT_DECLARE = 'INCIDENT_DECLARE',
  RECLAMATION = 'RECLAMATION',
  STOCK_BAS = 'STOCK_BAS',
  SYSTEME = 'SYSTEME',
}

export enum CanalNotification {
  APP = 'APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
}

@Entity('preferences_notifications')
export class PreferenceNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: TypeNotification,
  })
  typeNotification: TypeNotification;

  @Column({
    type: 'enum',
    enum: CanalNotification,
  })
  canal: CanalNotification;

  @Column({ default: true })
  actif: boolean;
}
