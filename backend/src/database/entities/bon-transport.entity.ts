import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { Camion } from './camion.entity';
import { Chauffeur } from './chauffeur.entity';
import { User } from './user.entity';

export enum NatureChargement {
  CONTENEUR_20 = 'CONTENEUR_20',
  CONTENEUR_40 = 'CONTENEUR_40',
  CONTENEUR_40_HC = 'CONTENEUR_40_HC',
  CONTENEUR_2X20 = 'CONTENEUR_2X20',
  VRAC = 'VRAC',
  PALETTE = 'PALETTE',
  COLIS = 'COLIS',
  VEHICULE = 'VEHICULE',
  MATERIEL_BTP = 'MATERIEL_BTP',
  ENGIN = 'ENGIN',
  PORTE_ENGIN = 'PORTE_ENGIN',
  AUTRE = 'AUTRE',
}

export enum StatutBon {
  BROUILLON = 'BROUILLON',
  EN_COURS = 'EN_COURS',
  LIVRE = 'LIVRE',
  TERMINE = 'TERMINE',
  ANNULE = 'ANNULE',
  FACTURE = 'FACTURE',
}

@Entity('bons_transport')
export class BonTransport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  numero: string;

  @Column({ name: 'date_creation', type: 'date', default: () => 'CURRENT_DATE' })
  dateCreation: Date;

  @Column({ name: 'client_id', type: 'integer', nullable: true })
  clientId: number;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'camion_id', type: 'integer', nullable: true })
  camionId: number;

  @ManyToOne(() => Camion, { nullable: true })
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({ name: 'chauffeur_id', type: 'integer', nullable: true })
  chauffeurId: number;

  @ManyToOne(() => Chauffeur, { nullable: true })
  @JoinColumn({ name: 'chauffeur_id' })
  chauffeur: Chauffeur;

  @Column({
    name: 'nature_chargement',
    type: 'enum',
    enum: NatureChargement,
    nullable: true,
  })
  natureChargement: NatureChargement;

  @Column({ name: 'lieu_chargement', type: 'text', nullable: true })
  lieuChargement: string;

  @Column({ name: 'lieu_dechargement', type: 'text', nullable: true })
  lieuDechargement: string;

  @Column({ name: 'date_chargement', type: 'timestamp', nullable: true })
  dateChargement: Date;

  @Column({ name: 'date_livraison', type: 'timestamp', nullable: true })
  dateLivraison: Date;

  @Column({ name: 'poids_kg', type: 'decimal', precision: 10, scale: 2, nullable: true })
  poidsKg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tonnage: number;

  @Column({ name: 'prix_tonne', type: 'decimal', precision: 12, scale: 2, nullable: true })
  prixTonne: number;

  @Column({ name: 'montant_ht', type: 'decimal', precision: 15, scale: 2, nullable: true })
  montantHt: number;

  // Frais de route et dépenses du voyage
  @Column({ name: 'frais_route', type: 'decimal', precision: 12, scale: 2, default: 0 })
  fraisRoute: number;

  @Column({ name: 'frais_depannage', type: 'decimal', precision: 12, scale: 2, default: 0 })
  fraisDepannage: number;

  @Column({ name: 'frais_autres', type: 'decimal', precision: 12, scale: 2, default: 0 })
  fraisAutres: number;

  @Column({ name: 'frais_autres_description', type: 'text', nullable: true })
  fraisAutresDescription: string;

  @Column({
    type: 'enum',
    enum: StatutBon,
    default: StatutBon.BROUILLON,
  })
  statut: StatutBon;

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
