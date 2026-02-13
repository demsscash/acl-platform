import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('config_systeme')
export class ConfigSysteme {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  cle: string;

  @Column({ type: 'text' })
  valeur: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  modificateur: User;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
