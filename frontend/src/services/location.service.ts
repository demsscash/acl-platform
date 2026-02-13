import api from './api';

export interface BonLocation {
  id: number;
  numero: string;
  clientId?: number;
  client?: any;
  camionId?: number;
  camion?: any;
  chauffeurId?: number;
  chauffeur?: any;
  dateDebut?: string;
  dateFinPrevue?: string;
  dateFinReelle?: string;
  tarifJournalier?: number;
  carburantInclus: boolean;
  litresCarburantInclus?: number;
  supplementCarburant?: number;
  kmDepart?: number;
  kmRetour?: number;
  montantTotal?: number;
  statut: 'BROUILLON' | 'EN_COURS' | 'TERMINE' | 'ANNULE';
  notes?: string;
  createdAt: string;
}

export const locationService = {
  async getBons(statut?: string): Promise<BonLocation[]> {
    const params = statut ? { statut } : {};
    const response = await api.get<BonLocation[]>('/location/bons', { params });
    return response.data;
  },

  async getBon(id: number): Promise<BonLocation> {
    const response = await api.get<BonLocation>(`/location/bons/${id}`);
    return response.data;
  },

  async createBon(data: Partial<BonLocation>): Promise<BonLocation> {
    const response = await api.post<BonLocation>('/location/bons', data);
    return response.data;
  },

  async updateBon(id: number, data: Partial<BonLocation>): Promise<BonLocation> {
    const response = await api.put<BonLocation>(`/location/bons/${id}`, data);
    return response.data;
  },

  async updateStatut(id: number, statut: string): Promise<BonLocation> {
    const response = await api.put<BonLocation>(`/location/bons/${id}/statut`, { statut });
    return response.data;
  },

  async calculerMontant(id: number): Promise<BonLocation> {
    const response = await api.post<BonLocation>(`/location/bons/${id}/calculer`);
    return response.data;
  },

  async getStats(): Promise<{
    total: number;
    enCours: number;
    termines: number;
    brouillons: number;
    totalRevenu: number;
  }> {
    const response = await api.get('/location/bons/stats');
    return response.data;
  },

  async getClients(): Promise<any[]> {
    const response = await api.get('/location/clients');
    return response.data;
  },
};

export default locationService;
