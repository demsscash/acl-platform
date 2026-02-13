import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Fournisseur } from './fournisseur.entity';
import { User } from './user.entity';

@Entity('catalogue_pieces')
export class CataloguePiece {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'numero_piece', length: 50, unique: true, nullable: true })
  numeroPiece: string;

  @Column({ length: 50, unique: true })
  reference: string;

  @Column({ length: 200 })
  designation: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  source: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  categorie: string;

  @Column({ name: 'unite_mesure', length: 20, default: 'UNITE' })
  uniteMesure: string;

  @Column({
    name: 'prix_unitaire_moyen',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  prixUnitaireMoyen: number;

  @Column({ name: 'stock_minimum', default: 5 })
  stockMinimum: number;

  @Column({ name: 'stock_maximum', default: 100 })
  stockMaximum: number;

  @Column({ name: 'emplacement_defaut', type: 'varchar', length: 50, nullable: true })
  emplacementDefaut: string;

  @Column({ name: 'fournisseur_principal_id', type: 'integer', nullable: true })
  fournisseurPrincipalId: number;

  @ManyToOne(() => Fournisseur, { nullable: true })
  @JoinColumn({ name: 'fournisseur_principal_id' })
  fournisseurPrincipal: Fournisseur;

  @Column({ name: 'duree_vie_km', type: 'integer', nullable: true })
  dureeVieKm: number;

  @Column({ name: 'duree_vie_mois', type: 'integer', nullable: true })
  dureeVieMois: number;

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
