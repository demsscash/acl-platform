import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { StockPneumatique } from './stock-pneumatique.entity';
import type { StatutPneu } from './stock-pneumatique.entity';
import { User } from './user.entity';

@Entity('controles_pneumatiques')
export class ControlePneumatique {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'pneu_id' })
  pneuId: number;

  @ManyToOne(() => StockPneumatique)
  @JoinColumn({ name: 'pneu_id' })
  pneu: StockPneumatique;

  @Column({ name: 'date_controle', type: 'date' })
  dateControle: Date;

  @Column({ type: 'int', nullable: true })
  kilometrage: number;

  @Column({ name: 'profondeur_mesuree_mm', type: 'decimal', precision: 4, scale: 2, nullable: true })
  profondeurMesureeMm: number;

  @Column({ name: 'pression_bar', type: 'decimal', precision: 4, scale: 2, nullable: true })
  pressionBar: number;

  @Column({ name: 'etat_visuel', type: 'varchar', length: 20, nullable: true })
  etatVisuel: StatutPneu;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ name: 'controleur_id', type: 'integer', nullable: true })
  controleurId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'controleur_id' })
  controleur: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
