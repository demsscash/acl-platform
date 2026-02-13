import api from './api';

export type TypeFichier = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'PDF';
export type CategorieFichier =
  | 'FACTURE'
  | 'BON_LIVRAISON'
  | 'PIECE_IDENTITE'
  | 'PERMIS_CONDUIRE'
  | 'CARTE_GRISE'
  | 'ASSURANCE'
  | 'CONTROLE_TECHNIQUE'
  | 'PHOTO_PANNE'
  | 'PHOTO_PIECE'
  | 'PHOTO_CAMION'
  | 'PHOTO_CHAUFFEUR'
  | 'AUTRE';

export interface Fichier {
  id: number;
  nomOriginal: string;
  nomStockage: string;
  chemin: string;
  typeMime: string;
  typeFichier: TypeFichier;
  categorie?: CategorieFichier;
  taille: number;
  entiteType: string;
  entiteId: number;
  description?: string;
  uploadedById?: number;
  uploadedBy?: any;
  createdAt: string;
}

export const uploadsService = {
  async upload(
    file: File,
    entiteType: string,
    entiteId: number,
    categorie?: CategorieFichier,
    description?: string,
  ): Promise<Fichier> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entiteType', entiteType);
    formData.append('entiteId', entiteId.toString());
    if (categorie) formData.append('categorie', categorie);
    if (description) formData.append('description', description);

    const response = await api.post<Fichier>('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadMultiple(
    files: File[],
    entiteType: string,
    entiteId: number,
    categorie?: CategorieFichier,
  ): Promise<Fichier[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('entiteType', entiteType);
    formData.append('entiteId', entiteId.toString());
    if (categorie) formData.append('categorie', categorie);

    const response = await api.post<Fichier[]>('/uploads/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getByEntite(entiteType: string, entiteId: number): Promise<Fichier[]> {
    const response = await api.get<Fichier[]>(`/uploads/entite/${entiteType}/${entiteId}`);
    return response.data;
  },

  async getById(id: number): Promise<Fichier> {
    const response = await api.get<Fichier>(`/uploads/${id}`);
    return response.data;
  },

  getDownloadUrl(id: number): string {
    return `${api.defaults.baseURL}/uploads/${id}/download`;
  },

  getViewUrl(id: number): string {
    return `${api.defaults.baseURL}/uploads/${id}/view`;
  },

  async updateDescription(id: number, description: string): Promise<Fichier> {
    const response = await api.put<Fichier>(`/uploads/${id}/description`, { description });
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/uploads/${id}`);
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};

export default uploadsService;
