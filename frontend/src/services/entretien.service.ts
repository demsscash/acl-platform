import api from './api';

export type TypeMaintenance = 'PREVENTIVE' | 'CORRECTIVE' | 'REVISION' | 'CONTROLE_TECHNIQUE' | 'VIDANGE' | 'FREINS' | 'PNEUS' | 'AUTRE';
export type StatutMaintenance = 'PLANIFIE' | 'EN_ATTENTE_PIECES' | 'EN_COURS' | 'TERMINE' | 'ANNULE';
export type PrioriteMaintenance = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';

export type SourcePiece = 'MAGASIN' | 'FOURNISSEUR' | 'AUTRE_CAMION' | 'AUTRE';

export interface PieceUtilisee {
  pieceId: number;
  reference: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  source: SourcePiece | string;
  sourceDetail?: string;
}

export interface Maintenance {
  id: number;
  numero: string;
  type: TypeMaintenance;
  statut: StatutMaintenance;
  priorite: PrioriteMaintenance;
  titre: string;
  description?: string;
  camionId: number;
  camion?: {
    id: number;
    immatriculation: string;
    marque: string;
    modele?: string;
  };
  datePlanifiee: string;
  dateDebut?: string;
  dateFin?: string;
  kilometrageActuel?: number;
  prochainKilometrage?: number;
  coutPieces: number;
  coutMainOeuvre: number;
  coutExterne: number;
  piecesUtilisees?: PieceUtilisee[];
  technicienId?: number;
  technicien?: {
    id: number;
    nom: string;
    prenom: string;
  };
  prestataireExterne?: string;
  observations?: string;
  travauxEffectues?: string;
  panneId?: number;
  createdBy?: number;
  createdByUser?: {
    id: number;
    nom: string;
    prenom: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceDto {
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
  piecesUtilisees?: PieceUtilisee[];
}

export interface UpdateMaintenanceDto extends Partial<CreateMaintenanceDto> {
  statut?: StatutMaintenance;
  dateDebut?: string;
  dateFin?: string;
  coutPieces?: number;
  coutMainOeuvre?: number;
  coutExterne?: number;
  piecesUtilisees?: PieceUtilisee[];
  observations?: string;
  travauxEffectues?: string;
}

export interface MaintenanceStats {
  total: number;
  planifie: number;
  enCours: number;
  termine: number;
  enRetard: number;
  coutTotalMois: number;
}

export interface SearchParams {
  search?: string;
  camionId?: number;
  type?: TypeMaintenance;
  statut?: StatutMaintenance;
  priorite?: PrioriteMaintenance;
  dateDebut?: string;
  dateFin?: string;
}

const entretienService = {
  // Get all maintenances with optional filters
  getAll: async (params?: SearchParams): Promise<Maintenance[]> => {
    const { data } = await api.get('/entretien', { params });
    return data;
  },

  // Get one by ID
  getById: async (id: number): Promise<Maintenance> => {
    const { data } = await api.get(`/entretien/${id}`);
    return data;
  },

  // Get statistics
  getStats: async (): Promise<MaintenanceStats> => {
    const { data } = await api.get('/entretien/stats');
    return data;
  },

  // Get upcoming maintenances
  getUpcoming: async (): Promise<Maintenance[]> => {
    const { data } = await api.get('/entretien/upcoming');
    return data;
  },

  // Get overdue maintenances
  getOverdue: async (): Promise<Maintenance[]> => {
    const { data } = await api.get('/entretien/overdue');
    return data;
  },

  // Get maintenances for a specific camion
  getByCamion: async (camionId: number): Promise<Maintenance[]> => {
    const { data } = await api.get(`/entretien/camion/${camionId}`);
    return data;
  },

  // Create
  create: async (dto: CreateMaintenanceDto): Promise<Maintenance> => {
    const { data } = await api.post('/entretien', dto);
    return data;
  },

  // Update
  update: async (id: number, dto: UpdateMaintenanceDto): Promise<Maintenance> => {
    const { data } = await api.put(`/entretien/${id}`, dto);
    return data;
  },

  // Update status
  updateStatut: async (id: number, statut: StatutMaintenance): Promise<Maintenance> => {
    const { data } = await api.put(`/entretien/${id}/statut`, { statut });
    return data;
  },

  // Delete
  delete: async (id: number): Promise<void> => {
    await api.delete(`/entretien/${id}`);
  },
};

export default entretienService;

// Labels for display
export const TYPE_MAINTENANCE_LABELS: Record<TypeMaintenance, string> = {
  PREVENTIVE: 'Préventive',
  CORRECTIVE: 'Corrective',
  REVISION: 'Révision',
  CONTROLE_TECHNIQUE: 'Contrôle Technique',
  VIDANGE: 'Vidange',
  FREINS: 'Freins',
  PNEUS: 'Pneus',
  AUTRE: 'Autre',
};

export const STATUT_MAINTENANCE_LABELS: Record<StatutMaintenance, string> = {
  PLANIFIE: 'Planifié',
  EN_ATTENTE_PIECES: 'En attente pièces',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  ANNULE: 'Annulé',
};

export const PRIORITE_MAINTENANCE_LABELS: Record<PrioriteMaintenance, string> = {
  BASSE: 'Basse',
  NORMALE: 'Normale',
  HAUTE: 'Haute',
  URGENTE: 'Urgente',
};
