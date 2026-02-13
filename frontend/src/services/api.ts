import axios from 'axios';
import type { AxiosError } from 'axios';
import type { ApiError } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    // Lire le token depuis le store Zustand persisté
    const authStorage = localStorage.getItem('acl-auth-storage');
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        const token = parsed?.state?.token;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Ignorer les erreurs de parsing
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Vérifier si on n'est pas déjà sur la page login
      const isLoginPage = window.location.pathname === '/login';

      // Vérifier si un token était présent (session expirée vs pas de session)
      const authStorage = localStorage.getItem('acl-auth-storage');
      const hadToken = authStorage && JSON.parse(authStorage)?.state?.token;

      if (hadToken && !isLoginPage) {
        // Session expirée - nettoyer et rediriger
        localStorage.removeItem('acl-auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
