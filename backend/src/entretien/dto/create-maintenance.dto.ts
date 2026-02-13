import { TypeMaintenance, PrioriteMaintenance } from '../../database/entities/maintenance.entity';

export class CreateMaintenanceDto {
  type: TypeMaintenance;
  priorite?: PrioriteMaintenance;
  titre: string;
  description?: string;
  camionId: number;
  datePlanifiee: string;
  kilometrageActuel?: number;
  prochainKilometrage?: number;
  technicienId?: number;
  prestataireExterne?: string;
  panneId?: number;
  piecesUtilisees?: { pieceId: number; reference: string; designation: string; quantite: number; prixUnitaire: number; source: string; sourceDetail?: string }[];
}
