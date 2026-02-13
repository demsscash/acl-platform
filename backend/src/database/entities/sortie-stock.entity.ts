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
import { Camion } from './camion.entity';
import { User } from './user.entity';
import { LigneSortieStock } from './ligne-sortie-stock.entity';

export enum MotifSortie {
  MAINTENANCE = 'MAINTENANCE',
  REPARATION = 'REPARATION',
  REMPLACEMENT = 'REMPLACEMENT',
  USURE = 'USURE',
  PANNE = 'PANNE',
  AUTRE = 'AUTRE',
}

@Entity('sorties_stock')
export class SortieStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'numero_bon', length: 50, unique: true })
  numeroBon: string;

  @Column({ name: 'date_sortie', type: 'date', default: () => 'CURRENT_DATE' })
  dateSortie: Date;

  @Column({ name: 'camion_id' })
  camionId: number;

  @ManyToOne(() => Camion)
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({ name: 'kilometrage_camion', nullable: true })
  kilometrageCamion: number;

  @Column({
    type: 'enum',
    enum: MotifSortie,
    default: MotifSortie.MAINTENANCE,
  })
  motif: MotifSortie;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'panne_id', type: 'integer', nullable: true })
  panneId: number;

  @OneToMany(() => LigneSortieStock, (ligne) => ligne.sortie, { cascade: true })
  lignes: LigneSortieStock[];

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
