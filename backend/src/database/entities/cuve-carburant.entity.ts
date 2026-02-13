import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TypeCarburant } from './camion.entity';

@Entity('cuves_carburant')
export class CuveCarburant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nom: string;

  @Column({
    name: 'type_carburant',
    type: 'enum',
    enum: TypeCarburant,
  })
  typeCarburant: TypeCarburant;

  @Column({
    name: 'capacite_litres',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  capaciteLitres: number;

  @Column({
    name: 'niveau_actuel_litres',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  niveauActuelLitres: number;

  @Column({
    name: 'seuil_alerte_bas',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 2000,
  })
  seuilAlerteBas: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  emplacement: string;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
