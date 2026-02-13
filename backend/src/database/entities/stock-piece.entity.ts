import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { CataloguePiece } from './catalogue-piece.entity';

@Entity('stock_pieces')
@Unique(['pieceId', 'emplacement'])
export class StockPiece {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'piece_id' })
  pieceId: number;

  @ManyToOne(() => CataloguePiece)
  @JoinColumn({ name: 'piece_id' })
  piece: CataloguePiece;

  @Column({ name: 'quantite_disponible', default: 0 })
  quantiteDisponible: number;

  @Column({ name: 'quantite_reservee', default: 0 })
  quantiteReservee: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  emplacement: string;

  @Column({ name: 'dernier_mouvement_at', type: 'timestamp', nullable: true })
  dernierMouvementAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
