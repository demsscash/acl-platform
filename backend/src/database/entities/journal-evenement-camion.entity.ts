import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Camion } from './camion.entity';
import { Chauffeur } from './chauffeur.entity';
import { Mission } from './mission.entity';
import { User } from './user.entity';

export enum TypeEvenementCamion {
  MISE_EN_SERVICE = 'MISE_EN_SERVICE',
  AFFECTATION_CHAUFFEUR = 'AFFECTATION_CHAUFFEUR',
  DEBUT_MISSION = 'DEBUT_MISSION',
  FIN_MISSION = 'FIN_MISSION',
  MAINTENANCE_PREVENTIVE = 'MAINTENANCE_PREVENTIVE',
  REPARATION = 'REPARATION',
  INCIDENT = 'INCIDENT',
  ACCIDENT = 'ACCIDENT',
  PANNE = 'PANNE',
  CONTROLE_TECHNIQUE = 'CONTROLE_TECHNIQUE',
  RENOUVELLEMENT_ASSURANCE = 'RENOUVELLEMENT_ASSURANCE',
  RENOUVELLEMENT_DOCUMENT = 'RENOUVELLEMENT_DOCUMENT',
  MODIFICATION_TECHNIQUE = 'MODIFICATION_TECHNIQUE',
  CHANGEMENT_PNEUMATIQUE = 'CHANGEMENT_PNEUMATIQUE',
  PLEIN_CARBURANT = 'PLEIN_CARBURANT',
  MISE_EN_MAINTENANCE = 'MISE_EN_MAINTENANCE',
  REMISE_EN_SERVICE = 'REMISE_EN_SERVICE',
  MISE_HORS_SERVICE = 'MISE_HORS_SERVICE',
  REFORME = 'REFORME',
  AUTRE = 'AUTRE',
}

export enum GraviteEvenement {
  INFO = 'INFO',
  MINEUR = 'MINEUR',
  MODERE = 'MODERE',
  MAJEUR = 'MAJEUR',
  CRITIQUE = 'CRITIQUE',
}

@Entity('journal_evenements_camion')
export class JournalEvenementCamion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'camion_id' })
  camionId: number;

  @ManyToOne(() => Camion)
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({
    type: 'enum',
    enum: TypeEvenementCamion,
  })
  typeEvenement: TypeEvenementCamion;

  @Column({
    type: 'enum',
    enum: GraviteEvenement,
    default: GraviteEvenement.INFO,
  })
  gravite: GraviteEvenement;

  @Column({ name: 'date_evenement', type: 'timestamp' })
  dateEvenement: Date;

  @Column({ type: 'integer', nullable: true })
  kilometrage: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  lieu: string | null;

  @Column({ name: 'mission_id', type: 'integer', nullable: true })
  missionId: number | null;

  @ManyToOne(() => Mission, { nullable: true })
  @JoinColumn({ name: 'mission_id' })
  mission: Mission | null;

  @Column({ name: 'chauffeur_id', type: 'integer', nullable: true })
  chauffeurId: number | null;

  @ManyToOne(() => Chauffeur, { nullable: true })
  @JoinColumn({ name: 'chauffeur_id' })
  chauffeur: Chauffeur | null;

  @Column({ length: 200 })
  titre: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'actions_prises', type: 'text', nullable: true })
  actionsPrises: string | null;

  @Column({ name: 'cout_estime', type: 'decimal', precision: 15, scale: 2, nullable: true })
  coutEstime: number | null;

  @Column({ name: 'cout_reel', type: 'decimal', precision: 15, scale: 2, nullable: true })
  coutReel: number | null;

  @Column({ name: 'necessite_suivi', default: false })
  necessiteSuivi: boolean;

  @Column({ name: 'date_suivi_prevu', type: 'date', nullable: true })
  dateSuiviPrevu: Date | null;

  @Column({ name: 'suivi_effectue', default: false })
  suiviEffectue: boolean;

  @Column({ name: 'reference_externe', type: 'varchar', length: 100, nullable: true })
  referenceExterne: string | null;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createur: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
