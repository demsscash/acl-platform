import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Caisse } from './caisse.entity';

export enum TypeMouvement {
  ENTREE = 'ENTREE',
  SORTIE = 'SORTIE',
  VIREMENT_INTERNE = 'VIREMENT_INTERNE',
}

// Modes de paiement pour les entrées
export enum ModeEntree {
  VIREMENT = 'VIREMENT',
  CHEQUE = 'CHEQUE',
  ESPECE = 'ESPECE',
  AUTRE = 'AUTRE',
}

// Modes de paiement pour les sorties
export enum ModeSortie {
  ORANGE_MONEY = 'ORANGE_MONEY',
  WAVE = 'WAVE',
  FREE_MONEY = 'FREE_MONEY',
  MOBILE_MONEY_AUTRE = 'MOBILE_MONEY_AUTRE',
  ESPECE = 'ESPECE',
  VIREMENT = 'VIREMENT',
  CHEQUE = 'CHEQUE',
  AUTRE = 'AUTRE',
}

@Entity('mouvements_caisse')
export class MouvementCaisse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'caisse_id' })
  caisseId: number;

  @ManyToOne(() => Caisse)
  @JoinColumn({ name: 'caisse_id' })
  caisse: Caisse;

  @Column({
    type: 'enum',
    enum: TypeMouvement,
  })
  type: TypeMouvement;

  @Column({ length: 255 })
  nature: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  montant: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  beneficiaire: string;

  @Column({ name: 'mode_paiement', type: 'varchar', length: 50, nullable: true })
  modePaiement: string;

  @Column({ name: 'numero_reference', type: 'varchar', length: 100, nullable: true })
  numeroReference: string; // Numéro de chèque, référence virement, numéro transaction mobile money

  @Column({ name: 'caisse_destination_id', type: 'integer', nullable: true })
  caisseDestinationId: number;

  @ManyToOne(() => Caisse, { nullable: true })
  @JoinColumn({ name: 'caisse_destination_id' })
  caisseDestination: Caisse;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'reference_externe', type: 'varchar', length: 100, nullable: true })
  referenceExterne: string;

  @Column({ name: 'preuve_url', type: 'varchar', length: 500, nullable: true })
  preuveUrl: string; // URL vers justificatif (capture, reçu, photo...)

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
