import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Mission } from './mission.entity';
import { User } from './user.entity';

export enum TypeCoutMission {
  CARBURANT = 'CARBURANT',
  PEAGE = 'PEAGE',
  PARKING = 'PARKING',
  HEBERGEMENT = 'HEBERGEMENT',
  REPAS = 'REPAS',
  REPARATION_URGENTE = 'REPARATION_URGENTE',
  AMENDE = 'AMENDE',
  MANUTENTION = 'MANUTENTION',
  FRAIS_DOUANE = 'FRAIS_DOUANE',
  ASSURANCE_VOYAGE = 'ASSURANCE_VOYAGE',
  AUTRE = 'AUTRE',
}

@Entity('couts_mission')
export class CoutMission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'mission_id' })
  missionId: number;

  @ManyToOne(() => Mission)
  @JoinColumn({ name: 'mission_id' })
  mission: Mission;

  @Column({
    type: 'enum',
    enum: TypeCoutMission,
  })
  typeCout: TypeCoutMission;

  @Column({ length: 200 })
  libelle: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  montant: number;

  @Column({ length: 3, default: 'XOF' })
  devise: string;

  @Column({ name: 'date_depense', type: 'date' })
  dateDepense: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  lieu: string | null;

  @Column({ name: 'numero_justificatif', type: 'varchar', length: 100, nullable: true })
  numeroJustificatif: string | null;

  @Column({ name: 'justificatif_joint', default: false })
  justificatifJoint: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createur: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
