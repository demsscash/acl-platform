import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stations_partenaires')
export class StationPartenaire {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({ length: 200 })
  nom: string;

  @Column({ type: 'text', nullable: true })
  adresse: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ville: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ name: 'contact_nom', type: 'varchar', length: 100, nullable: true })
  contactNom: string;

  @Column({
    name: 'tarif_negocie',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Prix négocié par litre en FCFA',
  })
  tarifNegocie: number;

  @Column({
    name: 'volume_mensuel_alloue',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Volume mensuel alloué en litres',
  })
  volumeMensuelAlloue: number;

  @Column({
    name: 'type_carburant',
    type: 'enum',
    enum: ['DIESEL', 'ESSENCE', 'TOUS'],
    default: 'DIESEL',
  })
  typeCarburant: 'DIESEL' | 'ESSENCE' | 'TOUS';

  @Column({ type: 'text', nullable: true })
  observations: string;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
