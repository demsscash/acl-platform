import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum RoleUtilisateur {
  ADMIN = 'ADMIN',
  DIRECTION = 'DIRECTION',
  RESPONSABLE_LOGISTIQUE = 'RESPONSABLE_LOGISTIQUE',
  COORDINATEUR = 'COORDINATEUR',
  MAGASINIER = 'MAGASINIER',
  COMPTABLE = 'COMPTABLE',
  MAINTENANCIER = 'MAINTENANCIER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ length: 100 })
  nom: string;

  @Column({ length: 100 })
  prenom: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string;

  @Column({
    type: 'enum',
    enum: RoleUtilisateur,
    default: RoleUtilisateur.COORDINATEUR,
  })
  role: RoleUtilisateur;

  @Column({ default: true })
  actif: boolean;

  @Column({ name: 'derniere_connexion', type: 'timestamp', nullable: true })
  derniereConnexion: Date;

  @Column({ name: 'refresh_token', nullable: true, length: 500 })
  refreshToken: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
