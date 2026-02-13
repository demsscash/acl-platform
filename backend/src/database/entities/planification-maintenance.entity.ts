import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Camion } from './camion.entity';

export enum TypePlanificationMaintenance {
  VIDANGE = 'VIDANGE',
  REVISION_MINEURE = 'REVISION_MINEURE',
  REVISION_MAJEURE = 'REVISION_MAJEURE',
  CONTROLE_TECHNIQUE = 'CONTROLE_TECHNIQUE',
  CONTROLE_FREINS = 'CONTROLE_FREINS',
  CONTROLE_PNEUS = 'CONTROLE_PNEUS',
  GEOMETRIE = 'GEOMETRIE',
  CLIMATISATION = 'CLIMATISATION',
  AUTRE = 'AUTRE',
}

export enum PeriodiciteMaintenance {
  KM = 'KM',
  JOURS = 'JOURS',
  MIXTE = 'MIXTE',
}

@Entity('planification_maintenance')
export class PlanificationMaintenance {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column({ length: 200 })
  libelle: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: PeriodiciteMaintenance,
  })
  periodicite: PeriodiciteMaintenance;

  @Column({ name: 'intervalle_km', type: 'integer', nullable: true })
  intervalleKm: number | null;

  @Column({ name: 'intervalle_jours', type: 'integer', nullable: true })
  intervalleJours: number | null;

  @Column({ name: 'derniere_execution_date', type: 'date', nullable: true })
  derniereExecutionDate: Date | null;

  @Column({ name: 'derniere_execution_km', type: 'integer', nullable: true })
  derniereExecutionKm: number | null;

  @Column({ name: 'prochaine_echeance_date', type: 'date', nullable: true })
  prochaineEcheanceDate: Date | null;

  @Column({ name: 'prochaine_echeance_km', type: 'integer', nullable: true })
  prochaineEcheanceKm: number | null;

  @Column({ name: 'alerte_jours_avant', default: 7 })
  alerteJoursAvant: number;

  @Column({ name: 'alerte_km_avant', default: 1000 })
  alerteKmAvant: number;

  @Column({ name: 'duree_estimee_heures', type: 'decimal', precision: 4, scale: 2, nullable: true })
  dureeEstimeeHeures: number | null;

  @Column({ name: 'cout_estime', type: 'decimal', precision: 15, scale: 2, nullable: true })
  coutEstime: number | null;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
