import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Mission } from './mission.entity';
import { Client } from './client.entity';

@Entity('evaluations_client')
export class EvaluationClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'mission_id' })
  missionId: number;

  @ManyToOne(() => Mission)
  @JoinColumn({ name: 'mission_id' })
  mission: Mission;

  @Column({ name: 'client_id' })
  clientId: number;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'date_evaluation', type: 'date' })
  dateEvaluation: Date;

  // Notes sur 5
  @Column({ name: 'note_ponctualite', type: 'integer', nullable: true })
  notePonctualite: number | null;

  @Column({ name: 'note_etat_marchandise', type: 'integer', nullable: true })
  noteEtatMarchandise: number | null;

  @Column({ name: 'note_comportement_chauffeur', type: 'integer', nullable: true })
  noteComportementChauffeur: number | null;

  @Column({ name: 'note_communication', type: 'integer', nullable: true })
  noteCommunication: number | null;

  @Column({ name: 'note_globale', type: 'integer', nullable: true })
  noteGlobale: number | null;

  // Commentaires
  @Column({ type: 'text', nullable: true })
  pointsPositifs: string | null;

  @Column({ type: 'text', nullable: true })
  pointsNegatifs: string | null;

  @Column({ type: 'text', nullable: true })
  suggestions: string | null;

  // Recommandation
  @Column({ type: 'integer', nullable: true })
  recommanderait: boolean | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
