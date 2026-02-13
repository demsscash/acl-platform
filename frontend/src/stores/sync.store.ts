import { create } from 'zustand';
import syncService from '../services/sync.service';
import type { SyncProgress } from '../services/sync.service';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  error: string | null;
  syncProgress: SyncProgress | null;
  queueByType: Record<string, number>;
  failedCount: number;

  // Actions
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  updatePendingCount: () => Promise<void>;
  syncNow: () => Promise<void>;
  forceSyncNow: () => Promise<void>;
  initSync: () => void;
  retryFailed: () => Promise<void>;
  clearFailed: () => Promise<void>;
  clearError: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: navigator.onLine,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  error: null,
  syncProgress: null,
  queueByType: {},
  failedCount: 0,

  setOnline: (online: boolean) => set({ isOnline: online }),

  setSyncing: (syncing: boolean) => set({ isSyncing: syncing }),

  clearError: () => set({ error: null }),

  updatePendingCount: async () => {
    try {
      const stats = await syncService.getSyncStats();
      const failedItems = await syncService.getFailedItems();
      set({
        pendingCount: stats.pendingCount,
        queueByType: stats.queueByType,
        failedCount: failedItems.length,
      });
    } catch (error) {
      console.error('[SyncStore] Erreur updatePendingCount:', error);
    }
  },

  syncNow: async () => {
    const { isOnline, isSyncing } = get();
    if (!isOnline || isSyncing) return;

    set({ isSyncing: true, error: null, syncProgress: null });

    try {
      // Sync les données de référence
      await syncService.syncReferenceData();

      // Traiter la queue de sync
      await syncService.processSyncQueue();

      // Mettre à jour les stats
      const stats = await syncService.getSyncStats();
      const failedItems = await syncService.getFailedItems();
      set({
        pendingCount: stats.pendingCount,
        queueByType: stats.queueByType,
        failedCount: failedItems.length,
        lastSyncTime: new Date(),
        isSyncing: false,
        syncProgress: null,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Erreur de synchronisation',
        isSyncing: false,
        syncProgress: null,
      });
    }
  },

  forceSyncNow: async () => {
    const { isOnline } = get();
    if (!isOnline) {
      set({ error: 'Pas de connexion internet' });
      return;
    }

    set({ isSyncing: true, error: null });

    try {
      await syncService.forceSyncNow();

      const stats = await syncService.getSyncStats();
      const failedItems = await syncService.getFailedItems();
      set({
        pendingCount: stats.pendingCount,
        queueByType: stats.queueByType,
        failedCount: failedItems.length,
        lastSyncTime: new Date(),
        isSyncing: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Erreur de synchronisation forcée',
        isSyncing: false,
      });
    }
  },

  retryFailed: async () => {
    try {
      await syncService.retryFailedItems();
      await get().updatePendingCount();
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors du retry' });
    }
  },

  clearFailed: async () => {
    try {
      await syncService.clearFailedItems();
      await get().updatePendingCount();
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors de la suppression' });
    }
  },

  initSync: () => {
    // Initialiser les listeners réseau
    syncService.initNetworkListeners();

    // Écouter les changements de connexion
    syncService.onNetworkChange((online) => {
      set({ isOnline: online });

      if (online) {
        // Quand on revient en ligne, lancer la sync
        get().syncNow();
      }
    });

    // Écouter la progression de sync
    syncService.onSyncProgress((progress) => {
      set({ syncProgress: progress });

      // Mettre à jour les stats après chaque sync
      if (progress.status === 'success' || progress.status === 'error') {
        get().updatePendingCount();
      }
    });

    // Sync initial si online
    if (navigator.onLine) {
      get().syncNow();
    }

    // Mettre à jour le compteur de pending
    get().updatePendingCount();
  },
}));

export default useSyncStore;
