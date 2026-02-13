import api from './api';

export interface Chauffeur {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  dateNaissance?: string;
  telephone?: string;
  adresse?: string;
  numeroPermis: string;
  typePermis: string;
  dateDelivrancePermis?: string;
  dateExpirationPermis?: string;
  statut: 'DISPONIBLE' | 'EN_MISSION' | 'CONGE' | 'INDISPONIBLE';
  camionAttribueId?: number;
  camionAttribue?: any;
  photoUrl?: string;
  notesDirection?: string;
  evaluationGlobale?: number;
  actif: boolean;
  createdAt?: string;
  updatedAt?: string;
  nombreVoyages?: number;
}

export interface CreateChauffeurDto {
  matricule: string;
  nom: string;
  prenom: string;
  telephone?: string;
  numeroPermis: string;
  typePermis: string;
  dateExpirationPermis?: string;
  statut?: 'DISPONIBLE' | 'EN_MISSION' | 'CONGE' | 'INDISPONIBLE';
}

export const chauffeursService = {
  async getAll(): Promise<Chauffeur[]> {
    const response = await api.get<Chauffeur[]>('/chauffeurs');
    return response.data;
  },

  async getById(id: number): Promise<Chauffeur> {
    const response = await api.get<Chauffeur>(`/chauffeurs/${id}`);
    return response.data;
  },

  async create(data: CreateChauffeurDto): Promise<Chauffeur> {
    const response = await api.post<Chauffeur>('/chauffeurs', data);
    return response.data;
  },

  async update(id: number, data: Partial<CreateChauffeurDto>): Promise<Chauffeur> {
    const response = await api.put<Chauffeur>(`/chauffeurs/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/chauffeurs/${id}`);
  },

  async getDisponibles(): Promise<Chauffeur[]> {
    const response = await api.get<Chauffeur[]>('/chauffeurs?statut=DISPONIBLE');
    return response.data;
  },

  async getHistorique(id: number): Promise<any> {
    const response = await api.get(`/chauffeurs/${id}/historique`);
    return response.data;
  },
};

export default chauffeursService;
