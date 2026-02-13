import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('fournisseurs')
export class Fournisseur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({ name: 'raison_sociale', length: 200 })
  raisonSociale: string;

  @Column({ type: 'text', nullable: true })
  adresse: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ name: 'contact_nom', type: 'varchar', length: 100, nullable: true })
  contactNom: string;

  @Column({ name: 'conditions_paiement', type: 'varchar', length: 100, nullable: true })
  conditionsPaiement: string;

  @Column({ name: 'delai_livraison_jours', type: 'integer', nullable: true })
  delaiLivraisonJours: number;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
