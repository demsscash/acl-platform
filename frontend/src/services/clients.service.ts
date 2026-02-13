import api from './api';

export type ContactClient = {
  id: number;
  clientId: number;
  nom: string;
  prenom?: string;
  fonction?: string;
  telephone?: string;
  telephone2?: string;
  email?: string;
  estPrincipal: boolean;
  notes?: string;
  actif: boolean;
  createdAt: string;
};

export type Client = {
  id: number;
  code: string;
  raisonSociale: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  contactNom?: string;
  contacts?: ContactClient[];
  actif: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateClientDto = {
  code: string;
  raisonSociale: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  contactNom?: string;
};

export type CreateContactDto = {
  nom: string;
  prenom?: string;
  fonction?: string;
  telephone?: string;
  telephone2?: string;
  email?: string;
  estPrincipal?: boolean;
  notes?: string;
};

export type ClientHistorique = {
  transports: any[];
  locations: any[];
  stats: {
    totalTransports: number;
    totalLocations: number;
    totalOperations: number;
    revenusTransport: number;
    revenusLocation: number;
    totalRevenus: number;
    enCours: number;
  };
};

export const clientsService = {
  async getAll(): Promise<Client[]> {
    const response = await api.get<Client[]>('/clients');
    return response.data;
  },

  async getById(id: number): Promise<Client> {
    const response = await api.get<Client>(`/clients/${id}`);
    return response.data;
  },

  async create(data: CreateClientDto): Promise<Client> {
    const response = await api.post<Client>('/clients', data);
    return response.data;
  },

  async update(id: number, data: Partial<CreateClientDto>): Promise<Client> {
    const response = await api.put<Client>(`/clients/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/clients/${id}`);
  },

  async getHistorique(id: number): Promise<ClientHistorique> {
    const response = await api.get<ClientHistorique>(`/clients/${id}/historique`);
    return response.data;
  },

  async generateCode(): Promise<string> {
    const response = await api.get<string>('/clients/generate-code');
    return response.data;
  },

  // Gestion des contacts
  async getContacts(clientId: number): Promise<ContactClient[]> {
    const response = await api.get<ContactClient[]>(`/clients/${clientId}/contacts`);
    return response.data;
  },

  async addContact(clientId: number, data: CreateContactDto): Promise<ContactClient> {
    const response = await api.post<ContactClient>(`/clients/${clientId}/contacts`, data);
    return response.data;
  },

  async updateContact(clientId: number, contactId: number, data: Partial<CreateContactDto>): Promise<ContactClient> {
    const response = await api.put<ContactClient>(`/clients/${clientId}/contacts/${contactId}`, data);
    return response.data;
  },

  async deleteContact(clientId: number, contactId: number): Promise<void> {
    await api.delete(`/clients/${clientId}/contacts/${contactId}`);
  },

  async setContactPrincipal(clientId: number, contactId: number): Promise<ContactClient> {
    const response = await api.put<ContactClient>(`/clients/${clientId}/contacts/${contactId}/principal`, {});
    return response.data;
  },
};

export default clientsService;
