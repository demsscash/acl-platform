import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Chauffeur } from './chauffeur.entity';
import { Camion } from './camion.entity';
import { User } from './user.entity';

export enum MotifFinAffectation {
  REASSIGNATION = 'REASSIGNATION',
  CONGE = 'CONGE',
  DEMISSION = 'DEMISSION',
  LICENCIEMENT = 'LICENCIEMENT',
  MALADIE = 'MALADIE',
  CAMION_MAINTENANCE = 'CAMION_MAINTENANCE',
  CAMION_REFORME = 'CAMION_REFORME',
  AUTRE = 'AUTRE',
}

@Entity('historique_affectations')
export class HistoriqueAffectation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chauffeur_id' })
  chauffeurId: number;

  @ManyToOne(() => Chauffeur)
  @JoinColumn({ name: 'chauffeur_id' })
  chauffeur: Chauffeur;

  @Column({ name: 'camion_id' })
  camionId: number;

  @ManyToOne(() => Camion)
  @JoinColumn({ name: 'camion_id' })
  camion: Camion;

  @Column({ name: 'date_debut', type: 'date' })
  dateDebut: Date;

  @Column({ name: 'date_fin', type: 'date', nullable: true })
  dateFin: Date | null;

  @Column({
    type: 'enum',
    enum: MotifFinAffectation,
    nullable: true,
  })
  motifFin: MotifFinAffectation | null;

  @Column({ type: 'text', nullable: true })
  commentaire: string | null;

  @Column({ name: 'km_debut', type: 'integer', nullable: true })
  kmDebut: number | null;

  @Column({ name: 'km_fin', type: 'integer', nullable: true })
  kmFin: number | null;

  @Column({ name: 'nb_missions', default: 0 })
  nbMissions: number;

  @Column({ name: 'nb_incidents', default: 0 })
  nbIncidents: number;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createur: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
