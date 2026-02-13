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
import { StatutBon } from './bon-transport.entity';

export enum TypeTarif {
  JOURNALIER = 'JOURNALIER',
  MENSUEL = 'MENSUEL',
}

@Entity('bons_location')
export class BonLocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  numero: string;

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

  @Column({ name: 'date_debut', type: 'timestamp', nullable: true })
  dateDebut: Date;

  @Column({ name: 'date_fin_prevue', type: 'timestamp', nullable: true })
  dateFinPrevue: Date;

  @Column({ name: 'date_fin_reelle', type: 'timestamp', nullable: true })
  dateFinReelle: Date;

  @Column({
    name: 'type_tarif',
    type: 'enum',
    enum: TypeTarif,
    default: TypeTarif.JOURNALIER,
  })
  typeTarif: TypeTarif;

  @Column({
    name: 'tarif_journalier',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  tarifJournalier: number;

  @Column({
    name: 'tarif_mensuel',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  tarifMensuel: number;

  @Column({ name: 'nb_jours_location', type: 'integer', nullable: true })
  nbJoursLocation: number;

  @Column({ name: 'carburant_inclus', default: false })
  carburantInclus: boolean;

  @Column({
    name: 'litres_carburant_inclus',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  litresCarburantInclus: number;

  @Column({
    name: 'supplement_carburant',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  supplementCarburant: number;

  @Column({
    name: 'prix_carburant_inclus',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  prixCarburantInclus: number;

  @Column({ name: 'km_depart', type: 'integer', nullable: true })
  kmDepart: number;

  @Column({ name: 'km_retour', type: 'integer', nullable: true })
  kmRetour: number;

  @Column({
    name: 'montant_total',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  montantTotal: number;

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
