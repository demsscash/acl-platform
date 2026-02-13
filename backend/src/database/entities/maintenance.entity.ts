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
import { User } from './user.entity';

export enum TypeMaintenance {
  PREVENTIVE = 'PREVENTIVE',       // Entretien programmé
  CORRECTIVE = 'CORRECTIVE',       // Suite à une panne
  REVISION = 'REVISION',           // Révision périodique
  CONTROLE_TECHNIQUE = 'CONTROLE_TECHNIQUE',
  VIDANGE = 'VIDANGE',
  FREINS = 'FREINS',
  PNEUS = 'PNEUS',
  AUTRE = 'AUTRE',
}

export enum StatutMaintenance {
  PLANIFIE = 'PLANIFIE',           // Programmé
  EN_ATTENTE_PIECES = 'EN_ATTENTE_PIECES', // Attente de pièces
  EN_COURS = 'EN_COURS',           // En cours d'exécution
  TERMINE = 'TERMINE',             // Terminé
  ANNULE = 'ANNULE',               // Annulé
}

export enum PrioriteMaintenance {
  BASSE = 'BASSE',
  NORMALE = 'NORMALE',
  HAUTE = 'HAUTE',
  URGENTE = 'URGENTE',
}

@Entity('maintenances')
export class Maintenance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  numero: string; // ex: MAINT-202601-0001

  @Column({ name: 'type_maintenance', type: 'enum', enum: TypeMaintenance })
  type: TypeMaintenance;

  @Column({ type: 'enum', enum: StatutMaintenance, default: StatutMaintenance.PLANIFIE })
  statut: StatutMaintenance;

  @Column({ type: 'enum', enum: PrioriteMaintenance, default: PrioriteMaintenance.NORMALE })
  priorite: PrioriteMaintenance;

  @Column({ length: 255 })
  titre: string;

  @Column({ name: 'description_travaux', type: 'text', nullable: true })
  description: string;

  // Camion concerné
  @Column({ name: 'camion_id' })
  camionId: number;

  @ManyToOne(() => Camion)
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  // Dates
  @Column({ name: 'date_planifiee', type: 'date' })
  datePlanifiee: Date;

  @Column({ name: 'date_debut', type: 'timestamp', nullable: true })
  dateDebut: Date;

  @Column({ name: 'date_fin', type: 'timestamp', nullable: true })
  dateFin: Date;

  // Kilométrage au moment de l'entretien
  @Column({ name: 'kilometrage_actuel', nullable: true })
  kilometrageActuel: number;

  // Prochain entretien prévu (kilométrage)
  @Column({ name: 'prochain_kilometrage', nullable: true })
  prochainKilometrage: number;

  // Coûts
  @Column({ name: 'cout_pieces', type: 'decimal', precision: 10, scale: 2, default: 0 })
  coutPieces: number;

  @Column({ name: 'cout_main_oeuvre', type: 'decimal', precision: 10, scale: 2, default: 0 })
  coutMainOeuvre: number;

  @Column({ name: 'cout_externe', type: 'decimal', precision: 10, scale: 2, default: 0 })
  coutExterne: number; // Si sous-traitance

  // Pièces utilisées (JSON array)
  @Column({ name: 'pieces_utilisees', type: 'jsonb', nullable: true })
  piecesUtilisees: {
    pieceId: number;
    reference: string;
    designation: string;
    quantite: number;
    prixUnitaire: number;
    source: string; // MAGASIN, FOURNISSEUR, AUTRE_CAMION, AUTRE
    sourceDetail?: string; // Nom fournisseur ou immatriculation camion d'origine
  }[];

  // Technicien assigné
  @Column({ name: 'technicien_id', type: 'integer', nullable: true })
  technicienId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'technicien_id' })
  technicien: User;

  // Prestataire externe (si applicable)
  @Column({ name: 'prestataire_externe', type: 'varchar', length: 255, nullable: true })
  prestataireExterne: string;

  // Notes et observations
  @Column({ type: 'text', nullable: true })
  observations: string;

  // Travaux effectués
  @Column({ name: 'travaux_effectues', type: 'text', nullable: true })
  travauxEffectues: string;

  // Référence à une panne (si maintenance corrective)
  @Column({ name: 'panne_id', type: 'integer', nullable: true })
  panneId: number;

  // Créateur
  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  modificateur: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed: coût total
  get coutTotal(): number {
    return Number(this.coutPieces) + Number(this.coutMainOeuvre) + Number(this.coutExterne);
  }
}
