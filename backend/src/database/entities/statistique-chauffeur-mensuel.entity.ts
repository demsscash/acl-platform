import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Chauffeur } from './chauffeur.entity';

@Entity('statistiques_chauffeur_mensuel')
export class StatistiqueChauffeurMensuel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chauffeur_id' })
  chauffeurId: number;

  @ManyToOne(() => Chauffeur)
  @JoinColumn({ name: 'chauffeur_id' })
  chauffeur: Chauffeur;

  @Column()
  annee: number;

  @Column()
  mois: number;

  // Activité
  @Column({ name: 'nb_missions', default: 0 })
  nbMissions: number;

  @Column({ name: 'nb_missions_terminees', default: 0 })
  nbMissionsTerminees: number;

  @Column({ name: 'nb_missions_annulees', default: 0 })
  nbMissionsAnnulees: number;

  @Column({ name: 'nb_jours_travailles', default: 0 })
  nbJoursTravailles: number;

  // Distances
  @Column({ name: 'km_parcourus', default: 0 })
  kmParcourus: number;

  // Temps
  @Column({ name: 'heures_conduite', type: 'decimal', precision: 10, scale: 2, default: 0 })
  heuresConduite: number;

  @Column({ name: 'heures_attente', type: 'decimal', precision: 10, scale: 2, default: 0 })
  heuresAttente: number;

  // Carburant
  @Column({ name: 'litres_consommes', type: 'decimal', precision: 10, scale: 2, default: 0 })
  litresConsommes: number;

  @Column({ name: 'consommation_moyenne', type: 'decimal', precision: 5, scale: 2, nullable: true })
  consommationMoyenne: number | null;

  // Qualité
  @Column({ name: 'nb_incidents', default: 0 })
  nbIncidents: number;

  @Column({ name: 'nb_retards', default: 0 })
  nbRetards: number;

  @Column({ name: 'nb_reclamations_client', default: 0 })
  nbReclamationsClient: number;

  @Column({ name: 'note_moyenne_client', type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteMoyenneClient: number | null;

  // Coûts générés
  @Column({ name: 'total_carburant', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCarburant: number;

  @Column({ name: 'total_peages', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPeages: number;

  @Column({ name: 'total_frais', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalFrais: number;

  @Column({ name: 'total_amendes', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmendes: number;

  // Score performance
  @Column({ name: 'score_performance', type: 'integer', nullable: true })
  scorePerformance: number | null;

  @CreateDateColumn({ name: 'calcule_at' })
  calculeAt: Date;
}
