import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';

@Entity('contacts_clients')
export class ContactClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'client_id' })
  clientId: number;

  @ManyToOne(() => Client, (client) => client.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  prenom: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fonction: string; // Directeur, Commercial, Comptable, etc.

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string;

  @Column({ name: 'telephone_2', type: 'varchar', length: 20, nullable: true })
  telephone2: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ name: 'est_principal', default: false })
  estPrincipal: boolean; // Contact principal du client

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
