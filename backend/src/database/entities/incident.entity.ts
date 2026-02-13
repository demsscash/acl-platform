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
import { Chauffeur } from './chauffeur.entity';
import { Mission } from './mission.entity';
import { User } from './user.entity';

export enum TypeIncident {
  PANNE_MECANIQUE = 'PANNE_MECANIQUE',
  PANNE_ELECTRIQUE = 'PANNE_ELECTRIQUE',
  CREVAISON = 'CREVAISON',
  ACCIDENT_CIRCULATION = 'ACCIDENT_CIRCULATION',
  ACCIDENT_CHARGEMENT = 'ACCIDENT_CHARGEMENT',
  VOL = 'VOL',
  AGRESSION = 'AGRESSION',
  RETARD_IMPORTANT = 'RETARD_IMPORTANT',
  MARCHANDISE_ENDOMMAGEE = 'MARCHANDISE_ENDOMMAGEE',
  PROBLEME_DOUANE = 'PROBLEME_DOUANE',
  METEO_DEFAVORABLE = 'METEO_DEFAVORABLE',
  ROUTE_IMPRATICABLE = 'ROUTE_IMPRATICABLE',
  AUTRE = 'AUTRE',
}

export enum StatutIncident {
  DECLARE = 'DECLARE',
  EN_COURS_TRAITEMENT = 'EN_COURS_TRAITEMENT',
  EN_ATTENTE_PIECES = 'EN_ATTENTE_PIECES',
  EN_ATTENTE_ASSURANCE = 'EN_ATTENTE_ASSURANCE',
  RESOLU = 'RESOLU',
  CLOS = 'CLOS',
}

export enum GraviteIncident {
  INFO = 'INFO',
  MINEUR = 'MINEUR',
  MODERE = 'MODERE',
  MAJEUR = 'MAJEUR',
  CRITIQUE = 'CRITIQUE',
}

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  numero: string;

  @Column({
    type: 'enum',
    enum: TypeIncident,
  })
  typeIncident: TypeIncident;

  @Column({
    type: 'enum',
    enum: StatutIncident,
    default: StatutIncident.DECLARE,
  })
  statut: StatutIncident;

  @Column({
    type: 'enum',
    enum: GraviteIncident,
  })
  gravite: GraviteIncident;

  @Column({ name: 'date_incident', type: 'timestamp' })
  dateIncident: Date;

  @Column({ name: 'lieu_incident', type: 'text' })
  lieuIncident: string;

  @Column({ name: 'coordonnees_gps', type: 'varchar', length: 50, nullable: true })
  coordonneesGps: string | null;

  @Column({ name: 'camion_id' })
  camionId: number;

  @ManyToOne(() => Camion)
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({ name: 'chauffeur_id', type: 'integer', nullable: true })
  chauffeurId: number | null;

  @ManyToOne(() => Chauffeur, { nullable: true })
  @JoinColumn({ name: 'chauffeur_id' })
  chauffeur: Chauffeur | null;

  @Column({ name: 'mission_id', type: 'integer', nullable: true })
  missionId: number | null;

  @ManyToOne(() => Mission, { nullable: true })
  @JoinColumn({ name: 'mission_id' })
  mission: Mission | null;

  @Column({ type: 'integer', nullable: true })
  kilometrage: number | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  circonstances: string | null;

  @Column({ type: 'text', nullable: true })
  temoins: string | null;

  @Column({ name: 'dommages_vehicule', type: 'text', nullable: true })
  dommagesVehicule: string | null;

  @Column({ name: 'dommages_marchandise', type: 'text', nullable: true })
  dommagesMarchandise: string | null;

  @Column({ name: 'dommages_tiers', type: 'text', nullable: true })
  dommagesTiers: string | null;

  @Column({ default: false })
  blesses: boolean;

  @Column({ name: 'nb_blesses', default: 0 })
  nbBlesses: number;

  @Column({ name: 'details_blesses', type: 'text', nullable: true })
  detailsBlesses: string | null;

  @Column({ name: 'declaration_assurance', default: false })
  declarationAssurance: boolean;

  @Column({ name: 'numero_sinistre', type: 'varchar', length: 100, nullable: true })
  numeroSinistre: string | null;

  @Column({ name: 'date_declaration_assurance', type: 'date', nullable: true })
  dateDeclarationAssurance: Date | null;

  @Column({ name: 'intervention_police', default: false })
  interventionPolice: boolean;

  @Column({ name: 'numero_pv', type: 'varchar', length: 100, nullable: true })
  numeroPv: string | null;

  @Column({ name: 'constat_amiable', default: false })
  constatAmiable: boolean;

  @Column({ name: 'actions_immediates', type: 'text', nullable: true })
  actionsImmediates: string | null;

  @Column({ name: 'actions_correctives', type: 'text', nullable: true })
  actionsCorrectives: string | null;

  @Column({ name: 'date_resolution', type: 'date', nullable: true })
  dateResolution: Date | null;

  @Column({ name: 'cout_reparation_vehicule', type: 'decimal', precision: 15, scale: 2, nullable: true })
  coutReparationVehicule: number | null;

  @Column({ name: 'cout_reparation_tiers', type: 'decimal', precision: 15, scale: 2, nullable: true })
  coutReparationTiers: number | null;

  @Column({ name: 'cout_marchandise', type: 'decimal', precision: 15, scale: 2, nullable: true })
  coutMarchandise: number | null;

  @Column({ name: 'franchise_assurance', type: 'decimal', precision: 15, scale: 2, nullable: true })
  franchiseAssurance: number | null;

  @Column({ name: 'remboursement_assurance', type: 'decimal', precision: 15, scale: 2, nullable: true })
  remboursementAssurance: number | null;

  @Column({ name: 'cout_total_net', type: 'decimal', precision: 15, scale: 2, nullable: true })
  coutTotalNet: number | null;

  @Column({ name: 'responsabilite_chauffeur', type: 'boolean', nullable: true })
  responsabiliteChauffeur: boolean | null;

  @Column({ name: 'pourcentage_responsabilite', type: 'decimal', precision: 5, scale: 2, nullable: true })
  pourcentageResponsabilite: number | null;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createur: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
