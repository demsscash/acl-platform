import api from './api';

export type TypePanne = 'MECANIQUE' | 'ELECTRIQUE' | 'PNEUMATIQUE' | 'HYDRAULIQUE' | 'CARROSSERIE' | 'ACCIDENT' | 'AUTRE';
export type PrioritePanne = 'URGENTE' | 'HAUTE' | 'NORMALE' | 'BASSE';
export type StatutPanne = 'DECLAREE' | 'EN_DIAGNOSTIC' | 'EN_ATTENTE_PIECES' | 'EN_REPARATION' | 'REPAREE' | 'CLOTUREE';
export type TypeReparation = 'INTERNE' | 'EXTERNE';

export interface Panne {
  id: number;
  numeroPanne: string;
  camionId: number;
  camion?: {
    id: number;
    immatriculation: string;
    marque: string;
  };
  chauffeurId?: number;
  chauffeur?: {
    id: number;
    nom: string;
    prenom: string;
    telephone?: string;
  };
  datePanne: string;
  typePanne: TypePanne;
  priorite: PrioritePanne;
  statut: StatutPanne;
  description: string;
  localisation?: string;
  kilometragePanne?: number;
  coutEstime?: number;
  coutReel?: number;
  dateDebutReparation?: string;
  dateFinReparation?: string;
  typeReparation?: TypeReparation;
  reparateurInterne?: string;
  reparateurExterne?: string;
  garageExterne?: string;
  telephoneGarage?: string;
  diagnostic?: string;
  travauxEffectues?: string;
  notes?: string;
  createdAt: string;
}

export interface CreatePanneDto {
  camionId: number;
  chauffeurId?: number;
  datePanne: string;
  typePanne: TypePanne;
  priorite: PrioritePanne;
  description: string;
  localisation?: string;
  kilometragePanne?: number;
}

export interface UpdatePanneDto {
  statut?: StatutPanne;
  diagnostic?: string;
  travauxEffectues?: string;
  coutEstime?: number;
  coutReel?: number;
  typeReparation?: TypeReparation;
  reparateurInterne?: string;
  reparateurExterne?: string;
  garageExterne?: string;
  telephoneGarage?: string;
  dateDebutReparation?: string;
  dateFinReparation?: string;
  notes?: string;
}

export const pannesService = {
  async getAll(): Promise<Panne[]> {
    const response = await api.get<Panne[]>('/pannes');
    return response.data;
  },

  async getEnCours(): Promise<Panne[]> {
    const response = await api.get<Panne[]>('/pannes/en-cours');
    return response.data;
  },

  async getByCamion(camionId: number): Promise<Panne[]> {
    const response = await api.get<Panne[]>(`/pannes/camion/${camionId}`);
    return response.data;
  },

  async getById(id: number): Promise<Panne> {
    const response = await api.get<Panne>(`/pannes/${id}`);
    return response.data;
  },

  async getStats(): Promise<{
    total: number;
    enCours: number;
    parStatut: Record<string, number>;
    parType: Record<string, number>;
    coutTotal: number;
  }> {
    const response = await api.get('/pannes/stats');
    return response.data;
  },

  async create(data: CreatePanneDto): Promise<Panne> {
    const response = await api.post<Panne>('/pannes', data);
    return response.data;
  },

  async update(id: number, data: UpdatePanneDto): Promise<Panne> {
    const response = await api.put<Panne>(`/pannes/${id}`, data);
    return response.data;
  },

  async updateStatut(id: number, statut: StatutPanne): Promise<Panne> {
    const response = await api.put<Panne>(`/pannes/${id}/statut`, { statut });
    return response.data;
  },
};

export default pannesService;
