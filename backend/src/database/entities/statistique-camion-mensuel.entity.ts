import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Camion } from './camion.entity';

@Entity('statistiques_camion_mensuel')
export class StatistiqueCamionMensuel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'camion_id' })
  camionId: number;

  @ManyToOne(() => Camion)
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column()
  annee: number;

  @Column()
  mois: number;

  // Utilisation
  @Column({ name: 'nb_missions', default: 0 })
  nbMissions: number;

  @Column({ name: 'nb_jours_en_mission', default: 0 })
  nbJoursEnMission: number;

  @Column({ name: 'nb_jours_maintenance', default: 0 })
  nbJoursMaintenance: number;

  @Column({ name: 'nb_jours_disponible', default: 0 })
  nbJoursDisponible: number;

  @Column({ name: 'taux_utilisation', type: 'decimal', precision: 5, scale: 2, nullable: true })
  tauxUtilisation: number | null;

  // Distances
  @Column({ name: 'km_debut_mois', type: 'integer', nullable: true })
  kmDebutMois: number | null;

  @Column({ name: 'km_fin_mois', type: 'integer', nullable: true })
  kmFinMois: number | null;

  @Column({ name: 'km_parcourus', default: 0 })
  kmParcourus: number;

  // Carburant
  @Column({ name: 'litres_consommes', type: 'decimal', precision: 10, scale: 2, default: 0 })
  litresConsommes: number;

  @Column({ name: 'cout_carburant', type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutCarburant: number;

  @Column({ name: 'consommation_moyenne', type: 'decimal', precision: 5, scale: 2, nullable: true })
  consommationMoyenne: number | null;

  // Maintenance
  @Column({ name: 'cout_pieces', type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutPieces: number;

  @Column({ name: 'cout_main_oeuvre', type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutMainOeuvre: number;

  @Column({ name: 'cout_pneus', type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutPneus: number;

  @Column({ name: 'nb_interventions', default: 0 })
  nbInterventions: number;

  // Incidents
  @Column({ name: 'nb_pannes', default: 0 })
  nbPannes: number;

  @Column({ name: 'nb_accidents', default: 0 })
  nbAccidents: number;

  @Column({ name: 'cout_incidents', type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutIncidents: number;

  // Revenus
  @Column({ name: 'revenus_transport', type: 'decimal', precision: 15, scale: 2, default: 0 })
  revenusTransport: number;

  @Column({ name: 'revenus_location', type: 'decimal', precision: 15, scale: 2, default: 0 })
  revenusLocation: number;

  // Rentabilité
  @Column({ name: 'marge_brute', type: 'decimal', precision: 15, scale: 2, nullable: true })
  margeBrute: number | null;

  @Column({ name: 'cout_par_km', type: 'decimal', precision: 10, scale: 2, nullable: true })
  coutParKm: number | null;

  @CreateDateColumn({ name: 'calcule_at' })
  calculeAt: Date;
}
