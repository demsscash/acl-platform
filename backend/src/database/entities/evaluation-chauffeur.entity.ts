import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Chauffeur } from './chauffeur.entity';
import { User } from './user.entity';

@Entity('evaluations_chauffeur')
export class EvaluationChauffeur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chauffeur_id' })
  chauffeurId: number;

  @ManyToOne(() => Chauffeur)
  @JoinColumn({ name: 'chauffeur_id' })
  chauffeur: Chauffeur;

  @Column({ name: 'evaluateur_id' })
  evaluateurId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'evaluateur_id' })
  evaluateur: User;

  @Column({ name: 'date_evaluation', type: 'date' })
  dateEvaluation: Date;

  @Column({ name: 'periode_debut', type: 'date' })
  periodeDebut: Date;

  @Column({ name: 'periode_fin', type: 'date' })
  periodeFin: Date;

  // Notes sur 5
  @Column({ name: 'note_ponctualite', type: 'decimal', precision: 3, scale: 2, nullable: true })
  notePonctualite: number | null;

  @Column({ name: 'note_conduite', type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteConduite: number | null;

  @Column({ name: 'note_entretien_vehicule', type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteEntretienVehicule: number | null;

  @Column({ name: 'note_relation_client', type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteRelationClient: number | null;

  @Column({ name: 'note_respect_consignes', type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteRespectConsignes: number | null;

  @Column({ name: 'note_globale', type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteGlobale: number | null;

  // Commentaires
  @Column({ type: 'text', nullable: true })
  pointsForts: string | null;

  @Column({ name: 'points_amelioration', type: 'text', nullable: true })
  pointsAmelioration: string | null;

  @Column({ type: 'text', nullable: true })
  objectifs: string | null;

  @Column({ name: 'commentaire_general', type: 'text', nullable: true })
  commentaireGeneral: string | null;

  // Validation
  @Column({ name: 'valide_par_direction', default: false })
  valideParDirection: boolean;

  @Column({ name: 'date_validation', type: 'date', nullable: true })
  dateValidation: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
