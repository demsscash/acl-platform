import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Camion } from './camion.entity';
import { Chauffeur } from './chauffeur.entity';
import { User } from './user.entity';

export enum TypePanne {
  MECANIQUE = 'MECANIQUE',
  ELECTRIQUE = 'ELECTRIQUE',
  PNEUMATIQUE = 'PNEUMATIQUE',
  HYDRAULIQUE = 'HYDRAULIQUE',
  CARROSSERIE = 'CARROSSERIE',
  ACCIDENT = 'ACCIDENT',
  AUTRE = 'AUTRE',
}

export enum PrioritePanne {
  URGENTE = 'URGENTE',
  HAUTE = 'HAUTE',
  NORMALE = 'NORMALE',
  BASSE = 'BASSE',
}

export enum StatutPanne {
  DECLAREE = 'DECLAREE',
  EN_DIAGNOSTIC = 'EN_DIAGNOSTIC',
  EN_ATTENTE_PIECES = 'EN_ATTENTE_PIECES',
  EN_REPARATION = 'EN_REPARATION',
  REPAREE = 'REPAREE',
  CLOTUREE = 'CLOTUREE',
}

export enum TypeReparation {
  INTERNE = 'INTERNE',
  EXTERNE = 'EXTERNE',
}

@Entity('pannes')
export class Panne {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'numero_panne', length: 50, unique: true })
  numeroPanne: string;

  @Column({ name: 'camion_id' })
  camionId: number;

  @ManyToOne(() => Camion)
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({ name: 'chauffeur_id', type: 'integer', nullable: true })
  chauffeurId: number;

  @ManyToOne(() => Chauffeur, { nullable: true })
  @JoinColumn({ name: 'chauffeur_id' })
  chauffeur: Chauffeur;

  @Column({ name: 'date_panne', type: 'timestamp' })
  datePanne: Date;

  @Column({
    name: 'type_panne',
    type: 'enum',
    enum: TypePanne,
    default: TypePanne.MECANIQUE,
  })
  typePanne: TypePanne;

  @Column({
    type: 'enum',
    enum: PrioritePanne,
    default: PrioritePanne.NORMALE,
  })
  priorite: PrioritePanne;

  @Column({
    type: 'enum',
    enum: StatutPanne,
    default: StatutPanne.DECLAREE,
  })
  statut: StatutPanne;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  localisation: string;

  @Column({ name: 'kilometrage_panne', nullable: true })
  kilometragePanne: number;

  @Column({
    name: 'cout_estime',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  coutEstime: number;

  @Column({
    name: 'cout_reel',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  coutReel: number;

  @Column({ name: 'date_debut_reparation', type: 'timestamp', nullable: true })
  dateDebutReparation: Date;

  @Column({ name: 'date_fin_reparation', type: 'timestamp', nullable: true })
  dateFinReparation: Date;

  @Column({
    name: 'type_reparation',
    type: 'enum',
    enum: TypeReparation,
    nullable: true,
  })
  typeReparation: TypeReparation;

  @Column({ name: 'reparateur_interne', type: 'varchar', length: 200, nullable: true })
  reparateurInterne: string;

  @Column({ name: 'reparateur_externe', type: 'varchar', length: 200, nullable: true })
  reparateurExterne: string;

  @Column({ name: 'garage_externe', type: 'varchar', length: 200, nullable: true })
  garageExterne: string;

  @Column({ name: 'telephone_garage', type: 'varchar', length: 50, nullable: true })
  telephoneGarage: string;

  @Column({ name: 'diagnostic', type: 'text', nullable: true })
  diagnostic: string;

  @Column({ name: 'travaux_effectues', type: 'text', nullable: true })
  travauxEffectues: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createur: User;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  modificateur: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
