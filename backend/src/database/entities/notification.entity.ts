import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User, RoleUtilisateur } from './user.entity';

export enum NotificationType {
  TRANSPORT_CREATED = 'TRANSPORT_CREATED',
  TRANSPORT_UPDATED = 'TRANSPORT_UPDATED',
  LOCATION_CREATED = 'LOCATION_CREATED',
  PANNE_DECLARED = 'PANNE_DECLARED',
  STOCK_LOW = 'STOCK_LOW',
  DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING',
  ALERT = 'ALERT',
  MAINTENANCE_CREATED = 'MAINTENANCE_CREATED',
  MAINTENANCE_STARTED = 'MAINTENANCE_STARTED',
  MAINTENANCE_COMPLETED = 'MAINTENANCE_COMPLETED',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: NotificationType, enumName: 'notification_type', default: NotificationType.ALERT })
  type: NotificationType;

  @Column({ length: 255 })
  titre: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  // User who should receive this notification (null = broadcast to role)
  @Column({ name: 'user_id', type: 'integer', nullable: true })
  userId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Target role for role-based notifications
  @Column({ name: 'target_role', type: 'enum', enum: RoleUtilisateur, enumName: 'role_utilisateur', nullable: true })
  targetRole: RoleUtilisateur;

  // Reference to the related entity (e.g., transport bon ID)
  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType: string; // 'transport', 'location', 'panne', etc.

  @Column({ name: 'reference_id', type: 'integer', nullable: true })
  referenceId: number;

  @Column({ default: false })
  lue: boolean; // read status

  @Column({ name: 'lue_at', type: 'timestamp', nullable: true })
  lueAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
