import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

export type TypeFichier = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'PDF';
export type CategorieFichier =
  | 'FACTURE'
  | 'BON_LIVRAISON'
  | 'PIECE_IDENTITE'
  | 'PERMIS_CONDUIRE'
  | 'CARTE_GRISE'
  | 'ASSURANCE'
  | 'CONTROLE_TECHNIQUE'
  | 'PHOTO_PANNE'
  | 'PHOTO_PIECE'
  | 'PHOTO_CAMION'
  | 'PHOTO_CHAUFFEUR'
  | 'AUTRE';

@Entity('fichiers')
export class Fichier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nom_original', type: 'varchar', length: 255 })
  nomOriginal: string;

  @Column({ name: 'nom_stockage', type: 'varchar', length: 255 })
  nomStockage: string;

  @Column({ name: 'chemin', type: 'varchar', length: 500 })
  chemin: string;

  @Column({ name: 'type_mime', type: 'varchar', length: 100 })
  typeMime: string;

  @Column({ name: 'type_fichier', type: 'varchar', length: 20 })
  typeFichier: TypeFichier;

  @Column({ type: 'varchar', length: 50, nullable: true })
  categorie: CategorieFichier;

  @Column({ type: 'int' })
  taille: number;

  // Polymorphic relation
  @Column({ name: 'entite_type', type: 'varchar', length: 50 })
  entiteType: string; // camion, chauffeur, bon_transport, dotation_carburant, etc.

  @Column({ name: 'entite_id', type: 'int' })
  entiteId: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
