import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ContactClient } from './contact-client.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  code: string;

  @Column({ name: 'raison_sociale', length: 200 })
  raisonSociale: string;

  @Column({ type: 'text', nullable: true })
  adresse: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ name: 'contact_nom', type: 'varchar', length: 100, nullable: true })
  contactNom: string; // Contact principal (legacy, garder pour compatibilité)

  // Contacts multiples
  @OneToMany(() => ContactClient, (contact) => contact.client, { cascade: true })
  contacts: ContactClient[];

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
