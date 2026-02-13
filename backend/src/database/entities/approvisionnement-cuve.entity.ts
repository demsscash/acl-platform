import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CuveCarburant } from './cuve-carburant.entity';
import { Fournisseur } from './fournisseur.entity';
import { User } from './user.entity';

@Entity('approvisionnements_cuves')
export class ApprovisionnementCuve {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'numero_bon', length: 50, unique: true })
  numeroBon: string;

  @Column({ name: 'date_approvisionnement', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateApprovisionnement: Date;

  @Column({ name: 'cuve_id' })
  cuveId: number;

  @ManyToOne(() => CuveCarburant)
  @JoinColumn({ name: 'cuve_id' })
  cuve: CuveCarburant;

  @Column({ name: 'fournisseur_id', type: 'integer', nullable: true })
  fournisseurId: number;

  @ManyToOne(() => Fournisseur)
  @JoinColumn({ name: 'fournisseur_id' })
  fournisseur: Fournisseur;

  @Column({ name: 'fournisseur_autre', type: 'varchar', length: 200, nullable: true })
  fournisseurAutre: string;

  @Column({
    name: 'quantite_litres',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  quantiteLitres: number;

  @Column({
    name: 'prix_unitaire',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  prixUnitaire: number;

  @Column({
    name: 'cout_total',
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  coutTotal: number;

  @Column({ name: 'numero_facture', type: 'varchar', length: 100, nullable: true })
  numeroFacture: string;

  @Column({ name: 'numero_bon_livraison', type: 'varchar', length: 100, nullable: true })
  numeroBonLivraison: string;

  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ name: 'niveau_avant_litres', type: 'decimal', precision: 10, scale: 2 })
  niveauAvantLitres: number;

  @Column({ name: 'niveau_apres_litres', type: 'decimal', precision: 10, scale: 2 })
  niveauApresLitres: number;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createur: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
