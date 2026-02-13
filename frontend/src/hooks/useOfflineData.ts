import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db';
import type {
  CamionLocal,
  ChauffeurLocal,
  ClientLocal,
  CuveLocal,
  PieceLocal,
  DotationCarburantLocal,
  SortieStockLocal,
} from '../db';
import { useSyncStore } from '../stores/sync.store';

// Hook pour les camions (lecture seule offline)
export function useOfflineCamions() {
  const isOnline = useSyncStore((state) => state.isOnline);

  const camions = useLiveQuery(
    () => db.camions.where('actif').equals(1).toArray(),
    []
  );

  return {
    camions: camions ?? [],
    isLoading: camions === undefined,
    isOffline: !isOnline,
  };
}

// Hook pour un camion spécifique
export function useOfflineCamion(serverId: number | undefined) {
  const camion = useLiveQuery(
    () => (serverId ? db.camions.where('serverId').equals(serverId).first() : undefined),
    [serverId]
  );

  return {
    camion,
    isLoading: camion === undefined && serverId !== undefined,
  };
}

// Hook pour les chauffeurs
export function useOfflineChauffeurs() {
  const isOnline = useSyncStore((state) => state.isOnline);

  const chauffeurs = useLiveQuery(
    () => db.chauffeurs.where('actif').equals(1).toArray(),
    []
  );

  return {
    chauffeurs: chauffeurs ?? [],
    isLoading: chauffeurs === undefined,
    isOffline: !isOnline,
  };
}

// Hook pour les chauffeurs disponibles
export function useOfflineChauffeursDisponibles() {
  const chauffeurs = useLiveQuery(
    () =>
      db.chauffeurs
        .where('actif')
        .equals(1)
        .filter((c) => c.statut === 'DISPONIBLE')
        .toArray(),
    []
  );

  return {
    chauffeurs: chauffeurs ?? [],
    isLoading: chauffeurs === undefined,
  };
}

// Hook pour les clients
export function useOfflineClients() {
  const clients = useLiveQuery(
    () => db.clients.where('actif').equals(1).toArray(),
    []
  );

  return {
    clients: clients ?? [],
    isLoading: clients === undefined,
  };
}

// Hook pour les cuves
export function useOfflineCuves() {
  const cuves = useLiveQuery(
    () => db.cuves.where('actif').equals(1).toArray(),
    []
  );

  return {
    cuves: cuves ?? [],
    isLoading: cuves === undefined,
  };
}

// Hook pour les pièces
export function useOfflinePieces() {
  const pieces = useLiveQuery(
    () => db.pieces.where('actif').equals(1).toArray(),
    []
  );

  return {
    pieces: pieces ?? [],
    isLoading: pieces === undefined,
  };
}

// Hook pour les dotations carburant (avec les pending)
export function useOfflineDotations() {
  const isOnline = useSyncStore((state) => state.isOnline);

  const dotations = useLiveQuery(
    () => db.dotationsCarburant.orderBy('dateDotation').reverse().toArray(),
    []
  );

  const pendingDotations = useLiveQuery(
    () => db.dotationsCarburant.where('pendingSync').equals(1).toArray(),
    []
  );

  return {
    dotations: dotations ?? [],
    pendingDotations: pendingDotations ?? [],
    pendingCount: pendingDotations?.length ?? 0,
    isLoading: dotations === undefined,
    isOffline: !isOnline,
  };
}

// Hook pour les sorties stock (avec les pending)
export function useOfflineSortiesStock() {
  const isOnline = useSyncStore((state) => state.isOnline);

  const sorties = useLiveQuery(
    () => db.sortiesStock.orderBy('dateSortie').reverse().toArray(),
    []
  );

  const pendingSorties = useLiveQuery(
    () => db.sortiesStock.where('pendingSync').equals(1).toArray(),
    []
  );

  return {
    sorties: sorties ?? [],
    pendingSorties: pendingSorties ?? [],
    pendingCount: pendingSorties?.length ?? 0,
    isLoading: sorties === undefined,
    isOffline: !isOnline,
  };
}

// Hook générique pour le statut de sync
export function useSyncStatus() {
  const { isOnline, isSyncing, pendingCount, lastSyncTime, syncNow } = useSyncStore();

  const queueItems = useLiveQuery(() => db.syncQueue.count(), []);

  return {
    isOnline,
    isSyncing,
    pendingCount: queueItems ?? pendingCount,
    lastSyncTime,
    syncNow,
  };
}

// Types d'export pour la compatibilité
export type {
  CamionLocal,
  ChauffeurLocal,
  ClientLocal,
  CuveLocal,
  PieceLocal,
  DotationCarburantLocal,
  SortieStockLocal,
};
