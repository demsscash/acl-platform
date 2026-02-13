import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Camion } from './camion.entity';

export enum StatutChauffeur {
  DISPONIBLE = 'DISPONIBLE',
  EN_MISSION = 'EN_MISSION',
  CONGE = 'CONGE',
  INDISPONIBLE = 'INDISPONIBLE',
}

export enum TypePermis {
  B = 'B',
  C = 'C',
  D = 'D',
  EC = 'EC',
  ED = 'ED',
}

@Entity('chauffeurs')
export class Chauffeur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  matricule: string;

  @Column({ length: 100 })
  nom: string;

  @Column({ length: 100 })
  prenom: string;

  @Column({ name: 'date_naissance', type: 'date', nullable: true })
  dateNaissance: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string;

  @Column({ type: 'text', nullable: true })
  adresse: string;

  @Column({ name: 'numero_permis', length: 50 })
  numeroPermis: string;

  @Column({
    name: 'type_permis',
    type: 'enum',
    enum: TypePermis,
  })
  typePermis: TypePermis;

  @Column({ name: 'date_delivrance_permis', type: 'date', nullable: true })
  dateDelivrancePermis: Date;

  @Column({ name: 'date_expiration_permis', type: 'date', nullable: true })
  dateExpirationPermis: Date;

  @Column({ name: 'camion_attribue_id', type: 'integer', nullable: true })
  camionAttribueId: number;

  @ManyToOne(() => Camion, { nullable: true })
  @JoinColumn({ name: 'camion_attribue_id' })
  camionAttribue: Camion;

  @Column({
    type: 'enum',
    enum: StatutChauffeur,
    default: StatutChauffeur.DISPONIBLE,
  })
  statut: StatutChauffeur;

  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl: string;

  @Column({ name: 'notes_direction', type: 'text', nullable: true })
  notesDirection: string;

  @Column({ name: 'evaluation_globale', type: 'integer', nullable: true })
  evaluationGlobale: number;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
