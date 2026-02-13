import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';

export enum TypeCaisse {
  CENTRALE = 'CENTRALE',
  LOGISTIQUE = 'LOGISTIQUE',
}

@Entity('caisses')
export class Caisse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nom: string;

  @Column({
    type: 'enum',
    enum: TypeCaisse,
    default: TypeCaisse.CENTRALE,
  })
  type: TypeCaisse;

  @Column({
    name: 'solde_initial',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  soldeInitial: number;

  @Column({
    name: 'solde_actuel',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  soldeActuel: number;

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
