import api from './api';

export interface Cuve {
  id: number;
  nom: string;
  typeCarburant: 'DIESEL' | 'ESSENCE';
  capaciteLitres: number;
  niveauActuelLitres: number;
  seuilAlerteBas: number;
  emplacement?: string;
  actif: boolean;
}

export interface DotationCarburant {
  id: number;
  numeroBon: string;
  dateDotation: string;
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
  };
  typeSource: 'CUVE_INTERNE' | 'STATION_EXTERNE';
  cuveId?: number;
  cuve?: Cuve;
  stationNom?: string;
  quantiteLitres: number;
  prixUnitaire?: number;
  coutTotal?: number;
  kilometrageCamion?: number;
  observations?: string;
}

export interface CreateDotationDto {
  camionId: number;
  chauffeurId?: number;
  typeSource: 'CUVE_INTERNE' | 'STATION_EXTERNE';
  cuveId?: number;
  stationPartenaireId?: number;
  stationNom?: string;
  quantiteLitres: number;
  prixUnitaire?: number;
  kilometrageCamion?: number;
  dateDotation?: string;
}

export interface Fournisseur {
  id: number;
  code: string;
  raisonSociale: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  contactNom?: string;
  actif: boolean;
}

export interface ApprovisionnementCuve {
  id: number;
  numeroBon: string;
  dateApprovisionnement: string;
  cuveId: number;
  cuve?: Cuve;
  fournisseurId?: number;
  fournisseur?: Fournisseur;
  quantiteLitres: number;
  prixUnitaire: number;
  coutTotal: number;
  numeroFacture?: string;
  numeroBonLivraison?: string;
  observations?: string;
  niveauAvantLitres: number;
  niveauApresLitres: number;
}

export interface CreateApprovisionnementDto {
  cuveId: number;
  fournisseurId?: number;
  quantiteLitres: number;
  prixUnitaire: number;
  numeroFacture?: string;
  numeroBonLivraison?: string;
  observations?: string;
}

export interface StationPartenaire {
  id: number;
  code: string;
  nom: string;
  adresse?: string;
  ville?: string;
  telephone?: string;
  email?: string;
  contactNom?: string;
  tarifNegocie?: number;
  volumeMensuelAlloue?: number;
  typeCarburant: 'DIESEL' | 'ESSENCE' | 'TOUS';
  observations?: string;
  actif: boolean;
}

export interface CreateStationPartenaireDto {
  nom: string;
  adresse?: string;
  ville?: string;
  telephone?: string;
  email?: string;
  contactNom?: string;
  tarifNegocie?: number;
  volumeMensuelAlloue?: number;
  typeCarburant?: 'DIESEL' | 'ESSENCE' | 'TOUS';
  observations?: string;
}

export const carburantService = {
  // Cuves
  async getCuves(): Promise<Cuve[]> {
    const response = await api.get<Cuve[]>('/carburant/cuves');
    return response.data;
  },

  async getCuveStats(id: number): Promise<any> {
    const response = await api.get(`/carburant/cuves/${id}/stats`);
    return response.data;
  },

  async createCuve(data: Partial<Cuve>): Promise<Cuve> {
    const response = await api.post<Cuve>('/carburant/cuves', data);
    return response.data;
  },

  async updateCuve(id: number, data: Partial<Cuve>): Promise<Cuve> {
    const response = await api.put<Cuve>(`/carburant/cuves/${id}`, data);
    return response.data;
  },

  async deleteCuve(id: number): Promise<void> {
    await api.delete(`/carburant/cuves/${id}`);
  },

  // Approvisionnements
  async getApprovisionnements(): Promise<ApprovisionnementCuve[]> {
    const response = await api.get<ApprovisionnementCuve[]>('/carburant/approvisionnements');
    return response.data;
  },

  async getApprovisionnementsByCuve(cuveId: number): Promise<ApprovisionnementCuve[]> {
    const response = await api.get<ApprovisionnementCuve[]>(`/carburant/cuves/${cuveId}/approvisionnements`);
    return response.data;
  },

  async createApprovisionnement(data: CreateApprovisionnementDto): Promise<ApprovisionnementCuve> {
    const response = await api.post<ApprovisionnementCuve>('/carburant/approvisionnements', data);
    return response.data;
  },

  // Fournisseurs
  async getFournisseurs(): Promise<Fournisseur[]> {
    const response = await api.get<Fournisseur[]>('/carburant/fournisseurs');
    return response.data;
  },

  // Dotations
  async getDotations(): Promise<DotationCarburant[]> {
    const response = await api.get<DotationCarburant[]>('/carburant/dotations');
    return response.data;
  },

  async createDotation(data: CreateDotationDto): Promise<DotationCarburant> {
    const response = await api.post<DotationCarburant>('/carburant/dotations', data);
    return response.data;
  },

  // Stations Partenaires
  async getStationsPartenaires(): Promise<StationPartenaire[]> {
    const response = await api.get<StationPartenaire[]>('/carburant/stations-partenaires');
    return response.data;
  },

  async getStationPartenaire(id: number): Promise<StationPartenaire> {
    const response = await api.get<StationPartenaire>(`/carburant/stations-partenaires/${id}`);
    return response.data;
  },

  async createStationPartenaire(data: CreateStationPartenaireDto): Promise<StationPartenaire> {
    const response = await api.post<StationPartenaire>('/carburant/stations-partenaires', data);
    return response.data;
  },

  async updateStationPartenaire(id: number, data: Partial<CreateStationPartenaireDto>): Promise<StationPartenaire> {
    const response = await api.put<StationPartenaire>(`/carburant/stations-partenaires/${id}`, data);
    return response.data;
  },

  async deleteStationPartenaire(id: number): Promise<void> {
    await api.delete(`/carburant/stations-partenaires/${id}`);
  },
};

export default carburantService;
