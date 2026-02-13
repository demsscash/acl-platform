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
import { Fournisseur } from './fournisseur.entity';
import { Camion } from './camion.entity';
import { User } from './user.entity';

export enum TypeEntree {
  ACHAT = 'ACHAT',
  RETOUR = 'RETOUR',
  TRANSFERT = 'TRANSFERT',
  INVENTAIRE = 'INVENTAIRE',
  RECUPERATION_CAMION = 'RECUPERATION_CAMION', // Pièces récupérées d'un camion dépiécé
  AUTRE = 'AUTRE',
}

@Entity('entrees_stock')
export class EntreeStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'numero_bon', length: 50, unique: true })
  numeroBon: string;

  @Column({ name: 'date_entree', type: 'date', default: () => 'CURRENT_DATE' })
  dateEntree: Date;

  @Column({
    name: 'type_entree',
    type: 'enum',
    enum: TypeEntree,
    default: TypeEntree.ACHAT,
  })
  typeEntree: TypeEntree;

  @Column({ name: 'fournisseur_id', type: 'integer', nullable: true })
  fournisseurId: number;

  @ManyToOne(() => Fournisseur, { nullable: true })
  @JoinColumn({ name: 'fournisseur_id' })
  fournisseur: Fournisseur;

  @Column({ name: 'fournisseur_autre', type: 'varchar', length: 200, nullable: true })
  fournisseurAutre: string;

  // Pour les pièces récupérées d'un camion dépiécé
  @Column({ name: 'camion_origine_id', type: 'integer', nullable: true })
  camionOrigineId: number;

  @ManyToOne(() => Camion, { nullable: true })
  @JoinColumn({ name: 'camion_origine_id' })
  camionOrigine: Camion;

  @Column({ name: 'numero_facture', type: 'varchar', length: 100, nullable: true })
  numeroFacture: string;

  @Column({ name: 'numero_bl', type: 'varchar', length: 100, nullable: true })
  numeroBL: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'facture_seule', default: false })
  factureSeule: boolean;

  @Column({ name: 'facture_url', type: 'varchar', length: 500, nullable: true })
  factureUrl: string;

  @OneToMany('LigneEntreeStock', 'entree', { cascade: true })
  lignes: any[];

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
