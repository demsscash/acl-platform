import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Camion } from './camion.entity';
import { Chauffeur } from './chauffeur.entity';
import { CuveCarburant } from './cuve-carburant.entity';
import { StationPartenaire } from './station-partenaire.entity';
import { User } from './user.entity';

export enum TypeSourceCarburant {
  CUVE_INTERNE = 'CUVE_INTERNE',
  STATION_EXTERNE = 'STATION_EXTERNE',
}

@Entity('dotations_carburant')
export class DotationCarburant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'numero_bon', length: 50, unique: true })
  numeroBon: string;

  @Column({ name: 'date_dotation', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateDotation: Date;

  @Column({ name: 'camion_id' })
  camionId: number;

  @ManyToOne(() => Camion)
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({ name: 'chauffeur_id', type: 'integer', nullable: true })
  chauffeurId: number;

  @ManyToOne(() => Chauffeur, { nullable: true })
  @JoinColumn({ name: 'chauffeur_id' })
  chauffeur: Chauffeur;

  @Column({
    name: 'type_source',
    type: 'enum',
    enum: TypeSourceCarburant,
  })
  typeSource: TypeSourceCarburant;

  @Column({ name: 'cuve_id', type: 'integer', nullable: true })
  cuveId: number;

  @ManyToOne(() => CuveCarburant, { nullable: true })
  @JoinColumn({ name: 'cuve_id' })
  cuve: CuveCarburant;

  @Column({ name: 'station_nom', type: 'varchar', length: 200, nullable: true })
  stationNom: string;

  @Column({ name: 'station_partenaire_id', type: 'integer', nullable: true })
  stationPartenaireId: number;

  @ManyToOne(() => StationPartenaire, { nullable: true })
  @JoinColumn({ name: 'station_partenaire_id' })
  stationPartenaire: StationPartenaire;

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
    nullable: true,
  })
  prixUnitaire: number;

  @Column({
    name: 'cout_total',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  coutTotal: number;

  @Column({ name: 'kilometrage_camion', nullable: true })
  kilometrageCamion: number;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createur: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
