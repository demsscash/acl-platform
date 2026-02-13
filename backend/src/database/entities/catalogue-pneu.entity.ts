import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('catalogue_pneus')
export class CataloguePneu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  reference: string;

  @Column({ type: 'varchar', length: 50 })
  marque: string;

  @Column({ type: 'varchar', length: 50 })
  dimension: string;

  @Column({ name: 'type_usage', type: 'varchar', length: 50, nullable: true })
  typeUsage: string;

  @Column({ name: 'duree_vie_km', type: 'int', nullable: true })
  dureeVieKm: number;

  @Column({ name: 'profondeur_initiale_mm', type: 'decimal', precision: 4, scale: 2, nullable: true })
  profondeurInitialeMm: number;

  @Column({ name: 'prix_unitaire', type: 'decimal', precision: 12, scale: 2, nullable: true })
  prixUnitaire: number;

  @Column({ type: 'boolean', default: true })
  actif: boolean;
}
