import api from './api';

export interface Client {
  id: number;
  raisonSociale: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  actif: boolean;
}

export interface BonTransport {
  id: number;
  numero: string;
  dateCreation: string;
  clientId?: number;
  client?: Client;
  camionId?: number;
  camion?: any;
  chauffeurId?: number;
  chauffeur?: any;
  natureChargement?: string;
  lieuChargement?: string;
  lieuDechargement?: string;
  dateChargement?: string;
  dateLivraison?: string;
  poidsKg?: number;
  montantHt?: number;
  // Frais de route et dépenses du voyage
  fraisRoute?: number;
  fraisDepannage?: number;
  fraisAutres?: number;
  fraisAutresDescription?: string;
  statut: 'BROUILLON' | 'EN_COURS' | 'LIVRE' | 'TERMINE' | 'ANNULE' | 'FACTURE';
  notes?: string;
}

export interface CreateBonDto {
  clientId?: number;
  camionId?: number;
  chauffeurId?: number;
  natureChargement?: string;
  lieuChargement?: string;
  lieuDechargement?: string;
  dateChargement?: string;
  poidsKg?: number;
  montantHt?: number;
  // Frais de route et dépenses du voyage
  fraisRoute?: number;
  fraisDepannage?: number;
  fraisAutres?: number;
  fraisAutresDescription?: string;
  notes?: string;
}

export const transportService = {
  // Bons de transport
  async getBons(): Promise<BonTransport[]> {
    const response = await api.get<BonTransport[]>('/transport/bons');
    return response.data;
  },

  async getBonById(id: number): Promise<BonTransport> {
    const response = await api.get<BonTransport>(`/transport/bons/${id}`);
    return response.data;
  },

  async createBon(data: CreateBonDto): Promise<BonTransport> {
    const response = await api.post<BonTransport>('/transport/bons', data);
    return response.data;
  },

  async updateBon(id: number, data: Partial<CreateBonDto>): Promise<BonTransport> {
    const response = await api.put<BonTransport>(`/transport/bons/${id}`, data);
    return response.data;
  },

  async updateStatut(id: number, statut: string): Promise<BonTransport> {
    const response = await api.put<BonTransport>(`/transport/bons/${id}/statut`, { statut });
    return response.data;
  },

  async getStats(): Promise<{ total: number; enCours: number; livres: number }> {
    const response = await api.get('/transport/bons/stats');
    return response.data;
  },

  async getRevenueStats(): Promise<{
    parMois: { mois: string; transport: number; location: number; total: number }[];
    parCamion: { camion: string; total: number }[];
    parClient: { client: string; total: number }[];
    totaux: { transport: number; location: number; total: number };
  }> {
    const response = await api.get('/transport/revenus/stats');
    return response.data;
  },

  // Clients
  async getClients(): Promise<Client[]> {
    const response = await api.get<Client[]>('/transport/clients');
    return response.data;
  },

  async createClient(data: Partial<Client>): Promise<Client> {
    const response = await api.post<Client>('/transport/clients', data);
    return response.data;
  },

  async updateClient(id: number, data: Partial<Client>): Promise<Client> {
    const response = await api.put<Client>(`/transport/clients/${id}`, data);
    return response.data;
  },
};

export default transportService;
