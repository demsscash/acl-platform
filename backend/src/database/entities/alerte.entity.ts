import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Camion } from './camion.entity';
import { User } from './user.entity';

export enum TypeAlerte {
  PIECE = 'PIECE',
  PNEU = 'PNEU',
  CARBURANT = 'CARBURANT',
  DOCUMENT = 'DOCUMENT',
  MAINTENANCE = 'MAINTENANCE',
  GPS = 'GPS',
  STOCK = 'STOCK',
}

export enum NiveauAlerte {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum StatutAlerte {
  ACTIVE = 'ACTIVE',
  ACQUITTEE = 'ACQUITTEE',
  RESOLUE = 'RESOLUE',
}

@Entity('alertes')
export class Alerte {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'type_alerte',
    type: 'enum',
    enum: TypeAlerte,
  })
  typeAlerte: TypeAlerte;

  @Column({
    type: 'enum',
    enum: NiveauAlerte,
  })
  niveau: NiveauAlerte;

  @Column({ name: 'camion_id', type: 'integer', nullable: true })
  camionId: number;

  @ManyToOne(() => Camion, { nullable: true })
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({ length: 200 })
  titre: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'reference_id', type: 'integer', nullable: true })
  referenceId: number;

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType: string;

  @Column({
    type: 'enum',
    enum: StatutAlerte,
    default: StatutAlerte.ACTIVE,
  })
  statut: StatutAlerte;

  @Column({ name: 'acquittee_par', nullable: true })
  acquitteePar: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'acquittee_par' })
  utilisateurAcquittement: User;

  @Column({ name: 'acquittee_at', type: 'timestamp', nullable: true })
  acquitteeAt: Date;

  @Column({ name: 'resolue_at', type: 'timestamp', nullable: true })
  resolueAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
