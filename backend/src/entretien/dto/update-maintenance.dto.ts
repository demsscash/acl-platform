import { TypeMaintenance, StatutMaintenance, PrioriteMaintenance } from '../../database/entities/maintenance.entity';

export class UpdateMaintenanceDto {
  type?: TypeMaintenance;
  priorite?: PrioriteMaintenance;
  titre?: string;
  description?: string;
  camionId?: number;
  datePlanifiee?: string;
  kilometrageActuel?: number;
  prochainKilometrage?: number;
  technicienId?: number;
  prestataireExterne?: string;
  panneId?: number;
  statut?: StatutMaintenance;
  dateDebut?: string;
  dateFin?: string;
  coutPieces?: number;
  coutMainOeuvre?: number;
  coutExterne?: number;
  piecesUtilisees?: { pieceId: number; reference: string; designation: string; quantite: number; prixUnitaire: number; source: string; sourceDetail?: string }[];
  observations?: string;
  travauxEffectues?: string;
}
