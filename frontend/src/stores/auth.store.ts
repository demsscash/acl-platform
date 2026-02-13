import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials, RoleUtilisateur, Module, Action } from '../types';
import { hasPermission, canAccess as canAccessModule, canViewFinancial, ROLE_PERMISSIONS } from '../types';
import authService from '../services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  initializeAuth: () => Promise<void>;
  hasRole: (roles: RoleUtilisateur | RoleUtilisateur[]) => boolean;
  canAccess: (module: Module) => boolean;
  hasModulePermission: (module: Module, action: Action) => boolean;
  canViewFinancialData: (module: Module) => boolean;
  getAccessibleModules: () => Module[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);
          set({
            user: response.user,
            token: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
            error: null,
          });
          return true;
        } catch (error: unknown) {
          const err = error as { response?: { data?: { message?: string } } };
          const message = err?.response?.data?.message || 'Erreur de connexion';
          set({ isLoading: false, error: message, isAuthenticated: false });
          return false;
        }
      },

      logout: () => {
        authService.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isInitialized: true,
        });
      },

      clearError: () => set({ error: null }),

      // Vérifie et restaure la session au démarrage
      initializeAuth: async () => {
        const { token, user } = get();

        if (token && user) {
          // Faire confiance au token persisté - la vérification se fera lors des appels API
          // Si le token est expiré, l'intercepteur API redirigera vers login
          set({
            isAuthenticated: true,
            isInitialized: true,
          });
        } else {
          set({ isInitialized: true });
        }
      },

      // Vérifie si l'utilisateur a un des rôles spécifiés
      hasRole: (roles: RoleUtilisateur | RoleUtilisateur[]) => {
        const { user } = get();
        if (!user) return false;

        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(user.role);
      },

      // Vérifie si l'utilisateur peut accéder à un module
      canAccess: (module: Module) => {
        const { user } = get();
        if (!user) return false;
        return canAccessModule(user.role, module);
      },

      // Vérifie si l'utilisateur a une permission spécifique sur un module
      hasModulePermission: (module: Module, action: Action) => {
        const { user } = get();
        if (!user) return false;
        return hasPermission(user.role, module, action);
      },

      // Vérifie si l'utilisateur peut voir les données financières d'un module
      canViewFinancialData: (module: Module) => {
        const { user } = get();
        if (!user) return false;
        return canViewFinancial(user.role, module);
      },

      // Retourne la liste des modules accessibles par l'utilisateur
      getAccessibleModules: () => {
        const { user } = get();
        if (!user) return [];
        const modules: Module[] = [];
        const rolePerms = ROLE_PERMISSIONS[user.role];
        if (!rolePerms) return [];
        for (const [module, actions] of Object.entries(rolePerms)) {
          if (actions.length > 0) {
            modules.push(module as Module);
          }
        }
        return modules;
      },
    }),
    {
      name: 'acl-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Une fois le store réhydraté, initialiser l'auth automatiquement
        if (state) {
          state.initializeAuth();
        }
      },
    }
  )
);

export default useAuthStore;
