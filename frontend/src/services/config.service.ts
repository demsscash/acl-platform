import api from './api';

export interface ConfigSysteme {
  id: number;
  cle: string;
  valeur: string;
  description?: string;
  updatedBy?: number;
  modificateur?: {
    id: number;
    nom: string;
    prenom: string;
  };
  updatedAt: string;
}

export const CONFIG_KEYS = {
  PRIX_CARBURANT_LITRE: 'PRIX_CARBURANT_LITRE',
} as const;

export const configService = {
  // Get all configurations
  async getAll(): Promise<ConfigSysteme[]> {
    const response = await api.get<ConfigSysteme[]>('/config');
    return response.data;
  },

  // Get a specific configuration by key
  async getByCle(cle: string): Promise<ConfigSysteme> {
    const response = await api.get<ConfigSysteme>(`/config/${cle}`);
    return response.data;
  },

  // Set a configuration value
  async setValue(cle: string, valeur: string): Promise<ConfigSysteme> {
    const response = await api.put<ConfigSysteme>(`/config/${cle}`, { valeur });
    return response.data;
  },

  // Get fuel price
  async getPrixCarburant(): Promise<number> {
    const response = await api.get<number>('/config/carburant/prix');
    return response.data;
  },

  // Set fuel price
  async setPrixCarburant(prix: number): Promise<ConfigSysteme> {
    const response = await api.put<ConfigSysteme>('/config/carburant/prix', { prix });
    return response.data;
  },
};

export default configService;
