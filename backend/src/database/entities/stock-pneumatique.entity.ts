import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { CataloguePneu } from './catalogue-pneu.entity';
import { Fournisseur } from './fournisseur.entity';
import { Camion } from './camion.entity';

export type StatutPneu = 'NEUF' | 'BON' | 'USE' | 'A_REMPLACER' | 'REFORME';
export type PositionPneu = 'AVG' | 'AVD' | 'ARG_EXT' | 'ARG_INT' | 'ARD_EXT' | 'ARD_INT' | 'SECOURS';

@Entity('stock_pneumatiques')
export class StockPneumatique {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'catalogue_id', type: 'integer', nullable: true })
  catalogueId: number;

  @ManyToOne(() => CataloguePneu)
  @JoinColumn({ name: 'catalogue_id' })
  catalogue: CataloguePneu;

  @Column({ name: 'numero_serie', type: 'varchar', length: 50, unique: true })
  numeroSerie: string;

  @Column({ name: 'date_achat', type: 'date', nullable: true })
  dateAchat: Date;

  @Column({ name: 'fournisseur_id', type: 'integer', nullable: true })
  fournisseurId: number;

  @ManyToOne(() => Fournisseur)
  @JoinColumn({ name: 'fournisseur_id' })
  fournisseur: Fournisseur;

  @Column({ type: 'varchar', length: 20, default: 'NEUF' })
  statut: StatutPneu;

  @Column({ name: 'camion_id', type: 'integer', nullable: true })
  camionId: number;

  @ManyToOne(() => Camion)
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({ name: 'position_actuelle', type: 'varchar', length: 20, nullable: true })
  positionActuelle: PositionPneu;

  @Column({ name: 'km_installation', type: 'int', nullable: true })
  kmInstallation: number;

  @Column({ name: 'km_actuel', type: 'int', nullable: true })
  kmActuel: number;

  @Column({ name: 'profondeur_actuelle_mm', type: 'decimal', precision: 4, scale: 2, nullable: true })
  profondeurActuelleMm: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
