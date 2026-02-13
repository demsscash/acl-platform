import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EntreeStock } from './entree-stock.entity';
import { CataloguePiece } from './catalogue-piece.entity';

@Entity('lignes_entrees_stock')
export class LigneEntreeStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'entree_id' })
  entreeId: number;

  @ManyToOne(() => EntreeStock, (entree) => entree.lignes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entree_id' })
  entree: EntreeStock;

  @Column({ name: 'piece_id' })
  pieceId: number;

  @ManyToOne(() => CataloguePiece)
  @JoinColumn({ name: 'piece_id' })
  piece: CataloguePiece;

  @Column()
  quantite: number;

  @Column({
    name: 'prix_unitaire',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  prixUnitaire: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  emplacement: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
