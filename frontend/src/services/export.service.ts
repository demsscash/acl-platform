import api from './api';

export interface ExportStats {
  sortiesStock: {
    count: number;
  };
  dotationsCarburant: {
    count: number;
    total: number;
  };
  bonsTransport: {
    count: number;
    total: number;
  };
  bonsLocation: {
    count: number;
    total: number;
  };
  pannes: {
    count: number;
    total: number;
  };
  entreesStock: {
    count: number;
    total: number;
  };
  approvisionnementsCuve: {
    count: number;
    total: number;
  };
  totaux: {
    depenses: number;
    revenus: number;
    solde: number;
  };
}

function getAuthToken(): string | null {
  const authStorage = localStorage.getItem('acl-auth-storage');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.token || null;
    } catch {
      return null;
    }
  }
  return null;
}

export const exportService = {
  async getStats(dateDebut?: string, dateFin?: string): Promise<ExportStats> {
    const params = new URLSearchParams();
    if (dateDebut) params.append('dateDebut', dateDebut);
    if (dateFin) params.append('dateFin', dateFin);

    const response = await api.get<ExportStats>(`/export/stats?${params.toString()}`);
    return response.data;
  },

  getExportUrl(type: string, dateDebut?: string, dateFin?: string, format: 'csv' | 'xlsx' = 'csv'): string {
    const params = new URLSearchParams();
    if (dateDebut) params.append('dateDebut', dateDebut);
    if (dateFin) params.append('dateFin', dateFin);
    params.append('format', format);

    return `${api.defaults.baseURL}/export/${type}?${params.toString()}`;
  },

  async downloadExport(type: string, dateDebut?: string, dateFin?: string, format: 'csv' | 'xlsx' = 'csv'): Promise<void> {
    const params = new URLSearchParams();
    if (dateDebut) params.append('dateDebut', dateDebut);
    if (dateFin) params.append('dateFin', dateFin);
    params.append('format', format);

    const url = `${api.defaults.baseURL}/export/${type}?${params.toString()}`;
    const token = getAuthToken();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `${type}-${new Date().toISOString().split('T')[0]}.${format}`;

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) {
        filename = match[1];
      }
    }

    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },
};

export default exportService;
