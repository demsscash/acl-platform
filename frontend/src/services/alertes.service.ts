import api from './api';

export interface Alerte {
  id: number;
  typeAlerte: 'PIECE' | 'PNEU' | 'CARBURANT' | 'DOCUMENT' | 'MAINTENANCE' | 'GPS';
  niveau: 'INFO' | 'WARNING' | 'CRITICAL';
  camionId?: number;
  camion?: any;
  titre: string;
  message?: string;
  statut: 'ACTIVE' | 'ACQUITTEE' | 'RESOLUE';
  acquitteePar?: number;
  acquitteeAt?: string;
  resolueAt?: string;
  createdAt: string;
}

export interface DocumentExpiration {
  type: 'camion' | 'chauffeur';
  entityId: number;
  entityName: string;
  documentType: string;
  expirationDate: string;
  daysUntilExpiration: number;
}

export const alertesService = {
  async getAll(statut?: string): Promise<Alerte[]> {
    const params = statut ? { statut } : {};
    const response = await api.get<Alerte[]>('/alertes', { params });
    return response.data;
  },

  async getActives(): Promise<Alerte[]> {
    const response = await api.get<Alerte[]>('/alertes/actives');
    return response.data;
  },

  async getOne(id: number): Promise<Alerte> {
    const response = await api.get<Alerte>(`/alertes/${id}`);
    return response.data;
  },

  async create(data: Partial<Alerte>): Promise<Alerte> {
    const response = await api.post<Alerte>('/alertes', data);
    return response.data;
  },

  async acquitter(id: number): Promise<Alerte> {
    const response = await api.put<Alerte>(`/alertes/${id}/acquitter`);
    return response.data;
  },

  async resoudre(id: number): Promise<Alerte> {
    const response = await api.put<Alerte>(`/alertes/${id}/resoudre`);
    return response.data;
  },

  async getStats(): Promise<{
    actives: number;
    acquittees: number;
    resolues: number;
    critiques: number;
    total: number;
  }> {
    const response = await api.get('/alertes/stats');
    return response.data;
  },

  async getByType(): Promise<{ type: string; count: number }[]> {
    const response = await api.get('/alertes/by-type');
    return response.data;
  },

  async getExpiringDocuments(days: number = 30): Promise<DocumentExpiration[]> {
    const response = await api.get<DocumentExpiration[]>('/alertes/documents/expirations', {
      params: { days },
    });
    return response.data;
  },

  async checkDocuments(): Promise<{ alertesCreees: number; documentsExpirants: DocumentExpiration[] }> {
    const response = await api.post('/alertes/documents/check');
    return response.data;
  },
};

export default alertesService;
