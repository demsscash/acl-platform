import api from './api';

export type RoleUtilisateur = 'DIRECTION' | 'COORDINATEUR' | 'MAGASINIER';

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: RoleUtilisateur;
  actif: boolean;
  derniereConnexion?: string;
  createdAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: RoleUtilisateur;
}

export interface UpdateUserDto {
  nom?: string;
  prenom?: string;
  telephone?: string;
  role?: RoleUtilisateur;
  actif?: boolean;
}

export const usersService = {
  async getAll(): Promise<User[]> {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  async getById(id: number): Promise<User> {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  async create(data: CreateUserDto): Promise<User> {
    const response = await api.post<User>('/users', data);
    return response.data;
  },

  async update(id: number, data: UpdateUserDto): Promise<User> {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};

export default usersService;
