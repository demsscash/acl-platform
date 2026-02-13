import api from './api';
import type { LoginCredentials, AuthResponse } from '../types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  logout() {
    // Nettoyer le store Zustand persisté
    localStorage.removeItem('acl-auth-storage');
  },
};

export default authService;
