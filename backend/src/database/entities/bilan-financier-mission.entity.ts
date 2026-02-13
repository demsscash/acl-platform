import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Mission } from './mission.entity';

@Entity('bilan_financier_mission')
export class BilanFinancierMission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'mission_id', unique: true })
  missionId: number;

  @ManyToOne(() => Mission)
  @JoinColumn({ name: 'mission_id' })
  mission: Mission;

  // Revenus
  @Column({ name: 'montant_facture', type: 'decimal', precision: 15, scale: 2, default: 0 })
  montantFacture: number;

  @Column({ name: 'montant_supplements', type: 'decimal', precision: 15, scale: 2, default: 0 })
  montantSupplements: number;

  @Column({ name: 'montant_penalites', type: 'decimal', precision: 15, scale: 2, default: 0 })
  montantPenalites: number;

  // Coûts
  @Column({ name: 'cout_carburant', type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutCarburant: number;

  @Column({ name: 'cout_peages', type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutPeages: number;

  @Column({ name: 'cout_autres', type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutAutres: number;

  @Column({ name: 'cout_maintenance', type: 'decimal', precision: 15, scale: 2, default: 0 })
  coutMaintenance: number;

  // Indicateurs
  @Column({ name: 'cout_par_km', type: 'decimal', precision: 10, scale: 2, nullable: true })
  coutParKm: number | null;

  @Column({ name: 'rentabilite_pourcent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  rentabilitePourcent: number | null;

  @CreateDateColumn({ name: 'calcule_at' })
  calculeAt: Date;
}
