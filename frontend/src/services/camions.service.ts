import api from './api';
import type { Camion } from '../types';

// DTO pour création de camion
export interface CreateCamionDto {
  immatriculation: string;
  marque: string;
  modele?: string;
  typeCamion: string;
  typeCarburant?: string;
  capaciteReservoirLitres?: number;
  numeroInterne?: string;
  anneeMiseCirculation?: number;
}

export interface UpdateCamionDto extends Partial<CreateCamionDto> {
  statut?: string;
  kilometrageActuel?: number;
  dateExpirationAssurance?: string;
  dateExpirationVisiteTechnique?: string;
  dateExpirationPatente?: string;
}

export const camionsService = {
  async getAll(): Promise<Camion[]> {
    const response = await api.get<Camion[]>('/camions');
    return response.data;
  },

  async getById(id: number): Promise<Camion> {
    const response = await api.get<Camion>(`/camions/${id}`);
    return response.data;
  },

  async create(data: CreateCamionDto): Promise<Camion> {
    const response = await api.post<Camion>('/camions', data);
    return response.data;
  },

  async update(id: number, data: UpdateCamionDto): Promise<Camion> {
    const response = await api.put<Camion>(`/camions/${id}`, data);
    return response.data;
  },

  async updateKilometrage(id: number, kilometrage: number): Promise<Camion> {
    const response = await api.put<Camion>(`/camions/${id}/kilometrage`, { kilometrageActuel: kilometrage });
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/camions/${id}`);
  },

  async getHistorique(id: number): Promise<any> {
    const response = await api.get(`/camions/${id}/historique`);
    return response.data;
  },
};

export default camionsService;
