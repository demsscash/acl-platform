import api from './api';

export interface CataloguePneu {
  id: number;
  reference: string;
  marque: string;
  dimension: string;
  typeUsage?: string;
  dureeVieKm?: number;
  profondeurInitialeMm?: number;
  prixUnitaire?: number;
  actif: boolean;
}

export interface StockPneumatique {
  id: number;
  catalogueId?: number;
  catalogue?: CataloguePneu;
  numeroSerie: string;
  dateAchat?: string;
  fournisseurId?: number;
  fournisseur?: any;
  statut: 'NEUF' | 'BON' | 'USE' | 'A_REMPLACER' | 'REFORME';
  camionId?: number;
  camion?: any;
  positionActuelle?: 'AVG' | 'AVD' | 'ARG_EXT' | 'ARG_INT' | 'ARD_EXT' | 'ARD_INT' | 'SECOURS';
  kmInstallation?: number;
  kmActuel?: number;
  profondeurActuelleMm?: number;
  createdAt: string;
}

export interface ControlePneumatique {
  id: number;
  pneuId: number;
  pneu?: StockPneumatique;
  dateControle: string;
  kilometrage?: number;
  profondeurMesureeMm?: number;
  pressionBar?: number;
  etatVisuel?: string;
  observations?: string;
  controleurId?: number;
  controleur?: any;
  createdAt: string;
}

export const pneumatiquesService = {
  // Catalogue
  async getCatalogue(): Promise<CataloguePneu[]> {
    const response = await api.get<CataloguePneu[]>('/pneumatiques/catalogue');
    return response.data;
  },

  async createCatalogue(data: Partial<CataloguePneu>): Promise<CataloguePneu> {
    const response = await api.post<CataloguePneu>('/pneumatiques/catalogue', data);
    return response.data;
  },

  async updateCatalogue(id: number, data: Partial<CataloguePneu>): Promise<CataloguePneu> {
    const response = await api.put<CataloguePneu>(`/pneumatiques/catalogue/${id}`, data);
    return response.data;
  },

  // Stock
  async getStock(camionId?: number, statut?: string): Promise<StockPneumatique[]> {
    const params: any = {};
    if (camionId) params.camionId = camionId;
    if (statut) params.statut = statut;
    const response = await api.get<StockPneumatique[]>('/pneumatiques/stock', { params });
    return response.data;
  },

  async getStockDisponible(): Promise<StockPneumatique[]> {
    const response = await api.get<StockPneumatique[]>('/pneumatiques/stock/disponible');
    return response.data;
  },

  async getStockByCamion(camionId: number): Promise<StockPneumatique[]> {
    const response = await api.get<StockPneumatique[]>(`/pneumatiques/stock/camion/${camionId}`);
    return response.data;
  },

  async getPneu(id: number): Promise<StockPneumatique> {
    const response = await api.get<StockPneumatique>(`/pneumatiques/stock/${id}`);
    return response.data;
  },

  async createPneu(data: Partial<StockPneumatique>): Promise<StockPneumatique> {
    const response = await api.post<StockPneumatique>('/pneumatiques/stock', data);
    return response.data;
  },

  async updatePneu(id: number, data: Partial<StockPneumatique>): Promise<StockPneumatique> {
    const response = await api.put<StockPneumatique>(`/pneumatiques/stock/${id}`, data);
    return response.data;
  },

  async installerPneu(id: number, camionId: number, position: string, kmInstallation: number): Promise<StockPneumatique> {
    const response = await api.post<StockPneumatique>(`/pneumatiques/stock/${id}/installer`, {
      camionId,
      position,
      kmInstallation,
    });
    return response.data;
  },

  async retirerPneu(id: number, statut?: string): Promise<StockPneumatique> {
    const response = await api.post<StockPneumatique>(`/pneumatiques/stock/${id}/retirer`, { statut });
    return response.data;
  },

  // Contrôles
  async getControles(pneuId?: number): Promise<ControlePneumatique[]> {
    const params = pneuId ? { pneuId } : {};
    const response = await api.get<ControlePneumatique[]>('/pneumatiques/controles', { params });
    return response.data;
  },

  async createControle(data: Partial<ControlePneumatique>): Promise<ControlePneumatique> {
    const response = await api.post<ControlePneumatique>('/pneumatiques/controles', data);
    return response.data;
  },

  // Stats
  async getStats(): Promise<{
    total: number;
    enService: number;
    disponibles: number;
    aRemplacer: number;
    reformes: number;
  }> {
    const response = await api.get('/pneumatiques/stats');
    return response.data;
  },
};

export default pneumatiquesService;
