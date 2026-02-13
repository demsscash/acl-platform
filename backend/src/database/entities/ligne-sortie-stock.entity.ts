import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SortieStock } from './sortie-stock.entity';
import { CataloguePiece } from './catalogue-piece.entity';

@Entity('lignes_sorties_stock')
export class LigneSortieStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sortie_id' })
  sortieId: number;

  @ManyToOne(() => SortieStock, (sortie) => sortie.lignes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sortie_id' })
  sortie: SortieStock;

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
