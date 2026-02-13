import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('routes_frequentes')
export class RouteFrequente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ length: 200 })
  nom: string;

  @Column({ name: 'depart_ville', length: 100 })
  departVille: string;

  @Column({ name: 'depart_pays', length: 100, default: 'Sénégal' })
  departPays: string;

  @Column({ name: 'arrivee_ville', length: 100 })
  arriveeVille: string;

  @Column({ name: 'arrivee_pays', length: 100, default: 'Sénégal' })
  arriveePays: string;

  @Column({ name: 'distance_km' })
  distanceKm: number;

  @Column({ name: 'duree_estimee_heures', type: 'decimal', precision: 5, scale: 2, nullable: true })
  dureeEstimeeHeures: number | null;

  @Column({ name: 'peages_estimes', type: 'decimal', precision: 10, scale: 2, default: 0 })
  peagesEstimes: number;

  @Column({ name: 'carburant_estime_litres', type: 'decimal', precision: 10, scale: 2, nullable: true })
  carburantEstimeLitres: number | null;

  @Column({ name: 'points_passage', type: 'text', nullable: true })
  pointsPassage: string | null;

  @Column({ name: 'zones_risque', type: 'text', nullable: true })
  zonesRisque: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'nb_fois_utilisee', default: 0 })
  nbFoisUtilisee: number;

  @Column({ name: 'derniere_utilisation', type: 'date', nullable: true })
  derniereUtilisation: Date | null;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
