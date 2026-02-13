import api from './api';
import type { Caisse, MouvementCaisse, TypeCaisse, TypeMouvement } from '../types';

export interface CreateCaisseDto {
  nom: string;
  type: TypeCaisse;
  soldeInitial?: number;
  actif?: boolean;
}

export interface UpdateCaisseDto {
  nom?: string;
  type?: TypeCaisse;
  actif?: boolean;
}

export interface CreateMouvementDto {
  type: TypeMouvement;
  nature: string;
  montant: number;
  beneficiaire?: string;
  modePaiement?: string;
  numeroReference?: string;
  caisseDestinationId?: number;
  date?: string;
  notes?: string;
  referenceExterne?: string;
  preuveUrl?: string;
}

export interface VirementDto {
  caisseSourceId: number;
  caisseDestinationId: number;
  montant: number;
  nature: string;
  date?: string;
  notes?: string;
}

export interface CaisseStats {
  totalCaisses: number;
  soldeTotalCentrale: number;
  soldeTotalLogistique: number;
  soldeGeneral: number;
  mouvementsAujourdhui: number;
}

export const caissesService = {
  // Caisses
  getAll: async (): Promise<Caisse[]> => {
    const response = await api.get('/caisses');
    return response.data;
  },

  getOne: async (id: number): Promise<Caisse> => {
    const response = await api.get(`/caisses/${id}`);
    return response.data;
  },

  create: async (data: CreateCaisseDto): Promise<Caisse> => {
    const response = await api.post('/caisses', data);
    return response.data;
  },

  update: async (id: number, data: UpdateCaisseDto): Promise<Caisse> => {
    const response = await api.put(`/caisses/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/caisses/${id}`);
  },

  getStats: async (): Promise<CaisseStats> => {
    const response = await api.get('/caisses/stats');
    return response.data;
  },

  // Mouvements
  getMouvements: async (caisseId: number, startDate?: string, endDate?: string): Promise<MouvementCaisse[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(`/caisses/${caisseId}/mouvements${query}`);
    return response.data;
  },

  getAllMouvements: async (startDate?: string, endDate?: string): Promise<MouvementCaisse[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(`/caisses/mouvements${query}`);
    return response.data;
  },

  addMouvement: async (caisseId: number, data: CreateMouvementDto): Promise<MouvementCaisse> => {
    const response = await api.post(`/caisses/${caisseId}/mouvements`, data);
    return response.data;
  },

  virement: async (data: VirementDto): Promise<MouvementCaisse> => {
    const response = await api.post('/caisses/virement', data);
    return response.data;
  },

  recalculerSolde: async (caisseId: number): Promise<Caisse> => {
    const response = await api.post(`/caisses/${caisseId}/recalculer-solde`);
    return response.data;
  },
};

export default caissesService;
