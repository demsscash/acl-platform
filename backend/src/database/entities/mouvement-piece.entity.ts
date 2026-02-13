import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Camion } from './camion.entity';
import { CataloguePiece } from './catalogue-piece.entity';
import { User } from './user.entity';

export enum TypeMouvementPiece {
  SORTIE_STOCK = 'SORTIE_STOCK',           // Sortie du stock vers un camion
  RETOUR_STOCK = 'RETOUR_STOCK',           // Retour de pièce au stock
  INTERCHANGE = 'INTERCHANGE',             // Transfert d'un camion à un autre
  INSTALLATION = 'INSTALLATION',           // Installation sur un camion
  DESINSTALLATION = 'DESINSTALLATION',     // Désinstallation d'un camion
}

export enum EtatPiece {
  NEUVE = 'NEUVE',
  BON_ETAT = 'BON_ETAT',
  USEE = 'USEE',
  DEFECTUEUSE = 'DEFECTUEUSE',
  REPAREE = 'REPAREE',
}

@Entity('mouvements_pieces')
export class MouvementPiece {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'numero_mouvement', length: 50, unique: true })
  numeroMouvement: string;

  @Column({
    name: 'type_mouvement',
    type: 'enum',
    enum: TypeMouvementPiece,
  })
  typeMouvement: TypeMouvementPiece;

  @Column({ name: 'date_mouvement', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateMouvement: Date;

  // Pièce concernée
  @Column({ name: 'piece_id' })
  pieceId: number;

  @ManyToOne(() => CataloguePiece)
  @JoinColumn({ name: 'piece_id' })
  piece: CataloguePiece;

  @Column()
  quantite: number;

  @Column({
    name: 'etat_piece',
    type: 'enum',
    enum: EtatPiece,
    default: EtatPiece.NEUVE,
  })
  etatPiece: EtatPiece;

  // Camion source (pour interchange ou désinstallation)
  @Column({ name: 'camion_source_id', type: 'integer', nullable: true })
  camionSourceId: number;

  @ManyToOne(() => Camion, { nullable: true })
  @JoinColumn({ name: 'camion_source_id' })
  camionSource: Camion;

  // Camion destination (pour installation ou interchange)
  @Column({ name: 'camion_destination_id', type: 'integer', nullable: true })
  camionDestinationId: number;

  @ManyToOne(() => Camion, { nullable: true })
  @JoinColumn({ name: 'camion_destination_id' })
  camionDestination: Camion;

  // Kilométrage au moment du mouvement
  @Column({ name: 'kilometrage_source', nullable: true })
  kilometrageSource: number;

  @Column({ name: 'kilometrage_destination', nullable: true })
  kilometrageDestination: number;

  // Référence à la sortie de stock originale (pour traçabilité complète)
  @Column({ name: 'sortie_stock_id', type: 'integer', nullable: true })
  sortieStockId: number;

  // Référence à la maintenance associée
  @Column({ name: 'maintenance_id', type: 'integer', nullable: true })
  maintenanceId: number;

  // Motif et description
  @Column({ type: 'varchar', length: 255, nullable: true })
  motif: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Coût
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  cout: number;

  // Utilisateur qui a effectué le mouvement
  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createur: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
