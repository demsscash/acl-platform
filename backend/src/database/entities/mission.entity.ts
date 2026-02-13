import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BonTransport } from './bon-transport.entity';
import { BonLocation } from './bon-location.entity';
import { Client } from './client.entity';
import { Camion } from './camion.entity';
import { Chauffeur } from './chauffeur.entity';
import { User } from './user.entity';

export enum StatutMission {
  PLANIFIEE = 'PLANIFIEE',
  EN_PREPARATION = 'EN_PREPARATION',
  EN_ROUTE = 'EN_ROUTE',
  LIVRAISON = 'LIVRAISON',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE',
  INCIDENT = 'INCIDENT',
}

export enum TypeMission {
  TRANSPORT_MARCHANDISE = 'TRANSPORT_MARCHANDISE',
  TRANSPORT_MATERIEL = 'TRANSPORT_MATERIEL',
  LOCATION_COURTE = 'LOCATION_COURTE',
  LOCATION_LONGUE = 'LOCATION_LONGUE',
  TRANSFERT_INTERNE = 'TRANSFERT_INTERNE',
  RETOUR_VIDE = 'RETOUR_VIDE',
}

@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  numero: string;

  @Column({
    type: 'enum',
    enum: TypeMission,
  })
  typeMission: TypeMission;

  @Column({
    type: 'enum',
    enum: StatutMission,
    default: StatutMission.PLANIFIEE,
  })
  statut: StatutMission;

  @Column({ name: 'bon_transport_id', type: 'integer', nullable: true })
  bonTransportId: number | null;

  @ManyToOne(() => BonTransport, { nullable: true })
  @JoinColumn({ name: 'bon_transport_id' })
  bonTransport: BonTransport | null;

  @Column({ name: 'bon_location_id', type: 'integer', nullable: true })
  bonLocationId: number | null;

  @ManyToOne(() => BonLocation, { nullable: true })
  @JoinColumn({ name: 'bon_location_id' })
  bonLocation: BonLocation | null;

  @Column({ name: 'client_id', type: 'integer', nullable: true })
  clientId: number | null;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  @Column({ name: 'camion_id' })
  camionId: number;

  @ManyToOne(() => Camion)
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({ name: 'chauffeur_id' })
  chauffeurId: number;

  @ManyToOne(() => Chauffeur)
  @JoinColumn({ name: 'chauffeur_id' })
  chauffeur: Chauffeur;

  @Column({ name: 'date_planifiee', type: 'date' })
  datePlanifiee: Date;

  @Column({ name: 'heure_depart_prevue', type: 'time', nullable: true })
  heureDepartPrevue: Date | null;

  @Column({ name: 'heure_arrivee_prevue', type: 'time', nullable: true })
  heureArriveePrevu: Date | null;

  @Column({ name: 'date_depart_reel', type: 'timestamp', nullable: true })
  dateDepartReel: Date | null;

  @Column({ name: 'date_arrivee_reel', type: 'timestamp', nullable: true })
  dateArriveeReel: Date | null;

  @Column({ name: 'lieu_depart', type: 'text' })
  lieuDepart: string;

  @Column({ name: 'lieu_arrivee', type: 'text' })
  lieuArrivee: string;

  @Column({ type: 'jsonb', nullable: true })
  etapes: Record<string, any>[] | null;

  @Column({ name: 'distance_prevue_km', type: 'integer', nullable: true })
  distancePrevueKm: number | null;

  @Column({ name: 'distance_reelle_km', type: 'integer', nullable: true })
  distanceReelleKm: number | null;

  @Column({ name: 'km_depart', type: 'integer', nullable: true })
  kmDepart: number | null;

  @Column({ name: 'km_arrivee', type: 'integer', nullable: true })
  kmArrivee: number | null;

  @Column({ name: 'nature_chargement', type: 'text', nullable: true })
  natureChargement: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  poidsKg: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  volumeM3: number | null;

  @Column({ name: 'nb_colis', type: 'integer', nullable: true })
  nbColis: number | null;

  @Column({ name: 'references_marchandise', type: 'text', nullable: true })
  referencesMarchandise: string | null;

  @Column({ name: 'instructions_speciales', type: 'text', nullable: true })
  instructionsSpeciales: string | null;

  @Column({ name: 'notes_chauffeur', type: 'text', nullable: true })
  notesChauffeur: string | null;

  @Column({ name: 'notes_coordinateur', type: 'text', nullable: true })
  notesCoordinateur: string | null;

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
