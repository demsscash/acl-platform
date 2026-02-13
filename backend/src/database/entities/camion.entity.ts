import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum StatutCamion {
  DISPONIBLE = 'DISPONIBLE',
  EN_MISSION = 'EN_MISSION',
  EN_MAINTENANCE = 'EN_MAINTENANCE',
  HORS_SERVICE = 'HORS_SERVICE',
}

export enum TypeCamion {
  PLATEAU = 'PLATEAU',
  GRUE = 'GRUE',
  BENNE = 'BENNE',
  PORTE_CONTENEUR = 'PORTE_CONTENEUR',
  CITERNE = 'CITERNE',
  FRIGORIFIQUE = 'FRIGORIFIQUE',
  TRACTEUR = 'TRACTEUR',
  PORTE_CHAR = 'PORTE_CHAR',
  VRAC = 'VRAC',
  AUTRE = 'AUTRE',
}

export enum TypeCarburant {
  DIESEL = 'DIESEL',
  ESSENCE = 'ESSENCE',
}

@Entity('camions')
export class Camion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'numero_interne', length: 20, unique: true, nullable: true })
  numeroInterne: string;

  @Column({ length: 20, unique: true })
  immatriculation: string;

  @Column({
    name: 'type_camion',
    type: 'enum',
    enum: TypeCamion,
    default: TypeCamion.PLATEAU,
  })
  typeCamion: TypeCamion;

  @Column({ length: 50 })
  marque: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  modele: string;

  @Column({ name: 'annee_mise_circulation', type: 'integer', nullable: true })
  anneeMiseCirculation: number;

  @Column({
    name: 'type_carburant',
    type: 'enum',
    enum: TypeCarburant,
    default: TypeCarburant.DIESEL,
  })
  typeCarburant: TypeCarburant;

  @Column({
    name: 'capacite_reservoir_litres',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  capaciteReservoirLitres: number;

  @Column({ name: 'kilometrage_actuel', default: 0 })
  kilometrageActuel: number;

  @Column({ name: 'date_derniere_revision', type: 'date', nullable: true })
  dateDerniereRevision: Date;

  @Column({ name: 'date_prochaine_revision', type: 'date', nullable: true })
  dateProchaineRevision: Date;

  // Documents réglementaires
  @Column({ name: 'date_expiration_assurance', type: 'date', nullable: true })
  dateExpirationAssurance: Date;

  @Column({ name: 'date_expiration_visite_technique', type: 'date', nullable: true })
  dateExpirationVisiteTechnique: Date;

  @Column({ name: 'date_expiration_licence', type: 'date', nullable: true })
  dateExpirationLicence: Date;

  @Column({ name: 'date_mise_en_circulation', type: 'date', nullable: true })
  dateMiseEnCirculation: Date;

  @Column({ name: 'numero_carte_grise', type: 'varchar', length: 50, nullable: true })
  numeroCarteGrise: string;

  @Column({
    type: 'enum',
    enum: StatutCamion,
    default: StatutCamion.DISPONIBLE,
  })
  statut: StatutCamion;

  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: true })
  actif: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @ManyToOne(() => User, { nullable: true })
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
