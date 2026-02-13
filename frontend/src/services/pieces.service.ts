import api from './api';

export interface CataloguePiece {
  id: number;
  reference: string;
  designation: string;
  categorie?: string;
  uniteMesure: string;
  prixUnitaireMoyen?: number;
  stockMinimum: number;
  stockMaximum: number;
  emplacementDefaut?: string;
  actif: boolean;
}

export interface StockPiece {
  id: number;
  pieceId: number;
  piece?: CataloguePiece;
  quantiteDisponible: number;
  quantiteReservee: number;
  emplacement?: string;
}

export interface CreatePieceDto {
  reference: string;
  designation: string;
  categorie?: string;
  uniteMesure?: string;
  stockMinimum?: number;
  stockMaximum?: number;
}

export type MotifSortie = 'MAINTENANCE' | 'REPARATION' | 'REMPLACEMENT' | 'USURE' | 'PANNE' | 'AUTRE';
export type TypeEntree = 'ACHAT' | 'RETOUR' | 'TRANSFERT' | 'INVENTAIRE' | 'RECUPERATION_CAMION' | 'AUTRE';

export interface LigneSortie {
  id: number;
  pieceId: number;
  piece?: CataloguePiece;
  quantite: number;
  prixUnitaire?: number;
  emplacement?: string;
  notes?: string;
}

export interface SortieStock {
  id: number;
  numeroBon: string;
  dateSortie: string;
  camionId: number;
  camion?: {
    id: number;
    immatriculation: string;
    typeCamion: string;
  };
  kilometrageCamion?: number;
  motif: MotifSortie;
  panneId?: number;
  notes?: string;
  lignes: LigneSortie[];
  createdBy: number;
  createur?: {
    id: number;
    prenom: string;
    nom: string;
  };
  createdAt: string;
}

export interface CreateSortieDto {
  camionId: number;
  dateSortie?: string;
  kilometrageCamion?: number;
  motif: MotifSortie;
  panneId?: number;
  notes?: string;
  lignes: {
    pieceId: number;
    quantite: number;
    emplacement?: string;
  }[];
}

export interface Fournisseur {
  id: number;
  code: string;
  raisonSociale: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  actif: boolean;
}

export interface LigneEntree {
  id: number;
  pieceId: number;
  piece?: CataloguePiece;
  quantite: number;
  prixUnitaire?: number;
  emplacement?: string;
  notes?: string;
}

export interface EntreeStock {
  id: number;
  numeroBon: string;
  dateEntree: string;
  typeEntree: TypeEntree;
  fournisseurId?: number;
  fournisseur?: Fournisseur;
  camionOrigineId?: number;
  camionOrigine?: {
    id: number;
    immatriculation: string;
    typeCamion: string;
  };
  numeroFacture?: string;
  numeroBL?: string;
  notes?: string;
  lignes: LigneEntree[];
  createdBy: number;
  createur?: {
    id: number;
    prenom: string;
    nom: string;
  };
  createdAt: string;
}

export interface CreateEntreeDto {
  dateEntree?: string;
  typeEntree: TypeEntree;
  fournisseurId?: number;
  camionOrigineId?: number; // Pour RECUPERATION_CAMION
  numeroFacture?: string;
  numeroBL?: string;
  notes?: string;
  lignes: {
    pieceId: number;
    quantite: number;
    prixUnitaire?: number;
    emplacement?: string;
  }[];
}

export const piecesService = {
  // Catalogue
  async getAll(): Promise<CataloguePiece[]> {
    const response = await api.get<CataloguePiece[]>('/pieces');
    return response.data;
  },

  async getById(id: number): Promise<CataloguePiece> {
    const response = await api.get<CataloguePiece>(`/pieces/${id}`);
    return response.data;
  },

  async create(data: CreatePieceDto): Promise<CataloguePiece> {
    const response = await api.post<CataloguePiece>('/pieces', data);
    return response.data;
  },

  async update(id: number, data: Partial<CreatePieceDto>): Promise<CataloguePiece> {
    const response = await api.put<CataloguePiece>(`/pieces/${id}`, data);
    return response.data;
  },

  // Stock
  async getStock(): Promise<StockPiece[]> {
    const response = await api.get<StockPiece[]>('/pieces/stock/all');
    return response.data;
  },

  async entreeStock(pieceId: number, quantite: number, emplacement?: string): Promise<StockPiece> {
    const response = await api.post<StockPiece>('/pieces/stock/entree', {
      pieceId,
      quantite,
      emplacement,
    });
    return response.data;
  },

  // Alertes
  async getAlertes(): Promise<any[]> {
    const response = await api.get<any[]>('/pieces/alertes');
    return response.data;
  },

  // Sorties de stock
  async getSorties(): Promise<SortieStock[]> {
    const response = await api.get<SortieStock[]>('/pieces/sorties/all');
    return response.data;
  },

  async getSortieById(id: number): Promise<SortieStock> {
    const response = await api.get<SortieStock>(`/pieces/sorties/${id}`);
    return response.data;
  },

  async getSortiesByCamion(camionId: number): Promise<SortieStock[]> {
    const response = await api.get<SortieStock[]>(`/pieces/sorties/camion/${camionId}`);
    return response.data;
  },

  async getSortiesStats(): Promise<{
    total: number;
    ceMois: number;
    parMotif: Record<string, number>;
  }> {
    const response = await api.get('/pieces/sorties/stats');
    return response.data;
  },

  async createSortie(data: CreateSortieDto): Promise<SortieStock> {
    const response = await api.post<SortieStock>('/pieces/sorties', data);
    return response.data;
  },

  // Entrées de stock
  async getEntrees(): Promise<EntreeStock[]> {
    const response = await api.get<EntreeStock[]>('/pieces/entrees/all');
    return response.data;
  },

  async getEntreeById(id: number): Promise<EntreeStock> {
    const response = await api.get<EntreeStock>(`/pieces/entrees/${id}`);
    return response.data;
  },

  async getEntreesStats(): Promise<{
    total: number;
    ceMois: number;
    parType: Record<string, number>;
  }> {
    const response = await api.get('/pieces/entrees/stats');
    return response.data;
  },

  async createEntree(data: CreateEntreeDto): Promise<EntreeStock> {
    const response = await api.post<EntreeStock>('/pieces/entrees', data);
    return response.data;
  },

  // Fournisseurs
  async getFournisseurs(): Promise<Fournisseur[]> {
    const response = await api.get<Fournisseur[]>('/pieces/fournisseurs');
    return response.data;
  },

  async createFournisseur(data: Partial<Fournisseur>): Promise<Fournisseur> {
    const response = await api.post<Fournisseur>('/pieces/fournisseurs', data);
    return response.data;
  },

  async updateFournisseur(id: number, data: Partial<Fournisseur>): Promise<Fournisseur> {
    const response = await api.put<Fournisseur>(`/pieces/fournisseurs/${id}`, data);
    return response.data;
  },

  async deleteFournisseur(id: number): Promise<void> {
    await api.delete(`/pieces/fournisseurs/${id}`);
  },

  // Historique des mouvements
  async getMouvements(pieceId?: number): Promise<Mouvement[]> {
    const params = pieceId ? `?pieceId=${pieceId}` : '';
    const response = await api.get<Mouvement[]>(`/pieces/mouvements${params}`);
    return response.data;
  },

  // Inventaire
  async ajusterStock(data: AjustementDto): Promise<StockPiece> {
    const response = await api.post<StockPiece>('/pieces/inventaire/ajuster', data);
    return response.data;
  },
};

export interface Mouvement {
  id: string;
  type: 'ENTREE' | 'SORTIE';
  date: string;
  numeroBon: string;
  pieceId: number;
  piece?: CataloguePiece;
  quantite: number;
  prixUnitaire?: number;
  typeEntree?: TypeEntree;
  motif?: MotifSortie;
  fournisseur?: Fournisseur;
  camion?: { id: number; immatriculation: string; typeCamion: string };
  createur?: { id: number; prenom: string; nom: string };
}

export interface AjustementDto {
  pieceId: number;
  nouvelleQuantite: number;
  motif: string;
  emplacement?: string;
}

export default piecesService;
