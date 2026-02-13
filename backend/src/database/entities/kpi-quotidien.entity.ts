import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('kpis_quotidiens')
export class KpiQuotidien {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'date_kpi', type: 'date', unique: true })
  dateKpi: Date;

  // Flotte
  @Column({ name: 'nb_camions_total', type: 'integer', nullable: true })
  nbCamionsTotal: number | null;

  @Column({ name: 'nb_camions_disponibles', type: 'integer', nullable: true })
  nbCamionsDisponibles: number | null;

  @Column({ name: 'nb_camions_en_mission', type: 'integer', nullable: true })
  nbCamionsEnMission: number | null;

  @Column({ name: 'nb_camions_maintenance', type: 'integer', nullable: true })
  nbCamionsMaintenance: number | null;

  @Column({ name: 'taux_disponibilite', type: 'decimal', precision: 5, scale: 2, nullable: true })
  tauxDisponibilite: number | null;

  // Missions
  @Column({ name: 'nb_missions_jour', type: 'integer', nullable: true })
  nbMissionsJour: number | null;

  @Column({ name: 'nb_missions_terminees', type: 'integer', nullable: true })
  nbMissionsTerminees: number | null;

  @Column({ name: 'nb_missions_en_cours', type: 'integer', nullable: true })
  nbMissionsEnCours: number | null;

  @Column({ name: 'nb_retards', type: 'integer', nullable: true })
  nbRetards: number | null;

  @Column({ name: 'taux_ponctualite', type: 'decimal', precision: 5, scale: 2, nullable: true })
  tauxPonctualite: number | null;

  // Carburant
  @Column({ name: 'litres_consommes', type: 'decimal', precision: 12, scale: 2, nullable: true })
  litresConsommes: number | null;

  @Column({ name: 'cout_carburant', type: 'decimal', precision: 15, scale: 2, nullable: true })
  coutCarburant: number | null;

  @Column({ name: 'niveau_cuves_pourcent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  niveauCuvesPourcent: number | null;

  // Alertes
  @Column({ name: 'nb_alertes_critiques', type: 'integer', nullable: true })
  nbAlertesCritiques: number | null;

  @Column({ name: 'nb_alertes_warning', type: 'integer', nullable: true })
  nbAlertesWarning: number | null;

  @Column({ name: 'nb_documents_expirant_30j', type: 'integer', nullable: true })
  nbDocumentsExpirant30j: number | null;

  // Financier
  @Column({ name: 'revenus_jour', type: 'decimal', precision: 15, scale: 2, nullable: true })
  revenusJour: number | null;

  @Column({ name: 'couts_jour', type: 'decimal', precision: 15, scale: 2, nullable: true })
  coutsJour: number | null;

  @Column({ name: 'marge_jour', type: 'decimal', precision: 15, scale: 2, nullable: true })
  margeJour: number | null;

  // Satisfaction
  @Column({ name: 'note_moyenne_clients', type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteMoyenneClients: number | null;

  @Column({ name: 'nb_reclamations_ouvertes', type: 'integer', nullable: true })
  nbReclamationsOuvertes: number | null;

  @CreateDateColumn({ name: 'calcule_at' })
  calculeAt: Date;
}
