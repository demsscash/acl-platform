import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { PlanificationMaintenance, TypePlanificationMaintenance } from './planification-maintenance.entity';
import { Camion } from './camion.entity';
import { User } from './user.entity';

@Entity('historique_maintenance')
export class HistoriqueMaintenance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'planification_id', type: 'integer', nullable: true })
  planificationId: number | null;

  @ManyToOne(() => PlanificationMaintenance, { nullable: true })
  @JoinColumn({ name: 'planification_id' })
  planification: PlanificationMaintenance | null;

  @Column({ name: 'camion_id' })
  camionId: number;

  @ManyToOne(() => Camion)
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({
    type: 'enum',
    enum: TypePlanificationMaintenance,
  })
  typeMaintenance: TypePlanificationMaintenance;

  @Column({ name: 'date_debut', type: 'timestamp' })
  dateDebut: Date;

  @Column({ name: 'date_fin', type: 'timestamp', nullable: true })
  dateFin: Date | null;

  @Column()
  kilometrage: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  lieu: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  prestataire: string | null;

  @Column({ name: 'description_travaux', type: 'text', nullable: true })
  descriptionTravaux: string | null;

  @Column({ name: 'pieces_utilisees', type: 'jsonb', nullable: true })
  piecesUtilisees: Record<string, any>[] | null;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @Column({ name: 'cout_pieces', type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutPieces: number;

  @Column({ name: 'cout_main_oeuvre', type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutMainOeuvre: number;

  @Column({ name: 'cout_externe', type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutExterne: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  technicien: string | null;

  @Column({ name: 'valide_par', nullable: true })
  validePar: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'valide_par' })
  validateur: User | null;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createur: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
