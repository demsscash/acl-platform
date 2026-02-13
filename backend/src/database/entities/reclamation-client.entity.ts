import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Mission } from './mission.entity';
import { Client } from './client.entity';
import { User } from './user.entity';

@Entity('reclamations_client')
export class ReclamationClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  numero: string;

  @Column({ name: 'mission_id', type: 'integer', nullable: true })
  missionId: number | null;

  @ManyToOne(() => Mission, { nullable: true })
  @JoinColumn({ name: 'mission_id' })
  mission: Mission | null;

  @Column({ name: 'client_id' })
  clientId: number;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'date_reclamation', type: 'date' })
  dateReclamation: Date;

  @Column({ name: 'type_reclamation', length: 50 })
  typeReclamation: string;

  @Column({ length: 200 })
  objet: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ default: 'OUVERTE', length: 30 })
  statut: string;

  @Column({ default: 'NORMALE', length: 20 })
  priorite: string;

  @Column({ name: 'assigne_a', nullable: true })
  assigneA: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigne_a' })
  assigne: User | null;

  @Column({ name: 'date_resolution', type: 'date', nullable: true })
  dateResolution: Date | null;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({ name: 'compensation_accordee', type: 'decimal', precision: 15, scale: 2, nullable: true })
  compensationAccordee: number | null;

  @Column({ name: 'satisfaction_resolution', type: 'integer', nullable: true })
  satisfactionResolution: number | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createur: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
