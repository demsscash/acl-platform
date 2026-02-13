import db, {
  setLastSyncTime,
} from '../db';
import type {
  SyncQueueItem,
  CamionLocal,
  ChauffeurLocal,
  ClientLocal,
  CuveLocal,
  PieceLocal,
} from '../db';
import api from './api';
import {
  validateDotation,
  validateSortieStock,
  validateBonTransport,
  validateBonLocation,
  validatePanne,
} from '../validation';

// ==================== CONFIGURATION ====================

const CONFIG = {
  MAX_RETRIES: 5,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 60000,
  CONNECTION_CHECK_INTERVAL_MS: 30000,
  SYNC_BATCH_SIZE: 10,
};

// ==================== STATE ====================

let isOnline = navigator.onLine;
let syncInProgress = false;
const listeners: Set<(online: boolean) => void> = new Set();
const syncProgressListeners: Set<(progress: SyncProgress) => void> = new Set();

export interface SyncProgress {
  entity: string;
  current: number;
  total: number;
  status: 'syncing' | 'success' | 'error';
  message?: string;
}

// ==================== EXPONENTIAL BACKOFF ====================

function calculateBackoffDelay(retryCount: number): number {
  // Exponential backoff with jitter
  const exponentialDelay = Math.min(
    CONFIG.BASE_DELAY_MS * Math.pow(2, retryCount),
    CONFIG.MAX_DELAY_MS
  );
  // Add random jitter (±25%)
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(exponentialDelay + jitter);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Utility function for retry with exponential backoff (used by background sync)
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = CONFIG.MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`[Sync] Attempt ${attempt + 1}/${maxRetries + 1} failed:`, error.message);

      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        console.log(`[Sync] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// ==================== NETWORK LISTENERS ====================

export function initNetworkListeners() {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Vérification périodique
  setInterval(checkConnection, CONFIG.CONNECTION_CHECK_INTERVAL_MS);

  // Listen to service worker messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleSWMessage);
  }
}

function handleOnline() {
  console.log('[Sync] Connexion rétablie');
  isOnline = true;
  notifyListeners();
  // Lancer la sync automatiquement avec délai
  setTimeout(() => processSyncQueue(), 2000);
}

function handleOffline() {
  console.log('[Sync] Connexion perdue');
  isOnline = false;
  notifyListeners();
}

async function checkConnection() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const response = await fetch(`${apiUrl}/sync/status`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const wasOnline = isOnline;
    isOnline = response.ok;

    if (isOnline && !wasOnline) {
      handleOnline();
    } else if (!isOnline && wasOnline) {
      handleOffline();
    }
  } catch {
    if (isOnline) {
      handleOffline();
    }
  }
}

function handleSWMessage(event: MessageEvent) {
  const { type, entity } = event.data;

  if (type === 'SYNC_COMPLETE') {
    console.log(`[Sync] Service Worker sync complete for: ${entity}`);
    notifySyncProgress({
      entity,
      current: 1,
      total: 1,
      status: 'success',
      message: `Sync ${entity} terminé`,
    });
  }

  if (type === 'SW_ACTIVATED') {
    console.log('[Sync] Service Worker activated');
  }
}

function notifyListeners() {
  listeners.forEach((listener) => listener(isOnline));
}

function notifySyncProgress(progress: SyncProgress) {
  syncProgressListeners.forEach((listener) => listener(progress));
}

export function onNetworkChange(listener: (online: boolean) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function onSyncProgress(listener: (progress: SyncProgress) => void) {
  syncProgressListeners.add(listener);
  return () => syncProgressListeners.delete(listener);
}

export function getNetworkStatus(): boolean {
  return isOnline;
}

// ==================== CONFLICT RESOLUTION ====================

export interface ConflictResolution {
  strategy: 'server_wins' | 'client_wins' | 'merge';
  serverData?: any;
  clientData?: any;
  mergedData?: any;
}

export function resolveConflict(
  serverData: any,
  clientData: any,
  serverUpdatedAt: Date,
  clientCreatedAt: Date
): ConflictResolution {
  // Strategy: Most recent wins
  const serverTime = new Date(serverUpdatedAt).getTime();
  const clientTime = new Date(clientCreatedAt).getTime();

  if (serverTime > clientTime) {
    return {
      strategy: 'server_wins',
      serverData,
    };
  } else {
    return {
      strategy: 'client_wins',
      clientData,
    };
  }
}

// ==================== VALIDATION ====================

function validateSyncItem(entityType: SyncQueueItem['entityType'], data: any): { valid: boolean; errors?: string[] } {
  let result;

  switch (entityType) {
    case 'dotation':
      result = validateDotation(data);
      break;
    case 'sortieStock':
      result = validateSortieStock(data);
      break;
    case 'bonTransport':
      result = validateBonTransport(data);
      break;
    case 'bonLocation':
      result = validateBonLocation(data);
      break;
    case 'panne':
      result = validatePanne(data);
      break;
    default:
      return { valid: true };
  }

  if (result.success) {
    return { valid: true };
  }

  return {
    valid: false,
    errors: result.errors?.map((e) => `${e.path}: ${e.message}`),
  };
}

// ==================== SYNC DES DONNÉES DE RÉFÉRENCE ====================

export async function syncReferenceData(): Promise<void> {
  if (!isOnline) {
    console.log('[Sync] Offline - skip reference data sync');
    return;
  }

  console.log('[Sync] Synchronisation des données de référence...');

  try {
    // Use the new batch endpoint
    const response = await api.get('/sync/reference-data');
    const data = response.data;

    await Promise.all([
      data.camions && syncCamionsData(data.camions),
      data.chauffeurs && syncChauffeursData(data.chauffeurs),
      data.clients && syncClientsData(data.clients),
      data.cuves && syncCuvesData(data.cuves),
      data.pieces && syncPiecesData(data.pieces),
    ]);

    console.log('[Sync] Données de référence synchronisées');
  } catch (error) {
    console.error('[Sync] Erreur sync données de référence:', error);
    // Fallback to individual sync
    await Promise.all([
      syncCamions(),
      syncChauffeurs(),
      syncClients(),
      syncCuves(),
      syncPieces(),
    ]);
  }
}

async function syncCamionsData(camions: any[]): Promise<void> {
  await db.transaction('rw', db.camions, async () => {
    for (const camion of camions) {
      const existing = await db.camions.where('serverId').equals(camion.id).first();
      const localCamion: CamionLocal = {
        serverId: camion.id,
        numeroInterne: camion.numeroInterne,
        immatriculation: camion.immatriculation,
        typeCamion: camion.typeCamion,
        marque: camion.marque,
        modele: camion.modele,
        anneeMiseCirculation: camion.anneeMiseCirculation,
        typeCarburant: camion.typeCarburant,
        capaciteReservoirLitres: camion.capaciteReservoirLitres,
        kilometrageActuel: camion.kilometrageActuel,
        statut: camion.statut,
        actif: camion.actif,
        syncedAt: new Date(),
      };

      if (existing) {
        await db.camions.update(existing.id!, localCamion);
      } else {
        await db.camions.add(localCamion);
      }
    }
  });
  await setLastSyncTime('camions', new Date());
}

async function syncChauffeursData(chauffeurs: any[]): Promise<void> {
  await db.transaction('rw', db.chauffeurs, async () => {
    for (const chauffeur of chauffeurs) {
      const existing = await db.chauffeurs.where('serverId').equals(chauffeur.id).first();
      const localChauffeur: ChauffeurLocal = {
        serverId: chauffeur.id,
        matricule: chauffeur.matricule,
        nom: chauffeur.nom,
        prenom: chauffeur.prenom,
        telephone: chauffeur.telephone,
        numeroPermis: chauffeur.numeroPermis,
        typePermis: chauffeur.typePermis,
        statut: chauffeur.statut,
        actif: chauffeur.actif,
        syncedAt: new Date(),
      };

      if (existing) {
        await db.chauffeurs.update(existing.id!, localChauffeur);
      } else {
        await db.chauffeurs.add(localChauffeur);
      }
    }
  });
  await setLastSyncTime('chauffeurs', new Date());
}

async function syncClientsData(clients: any[]): Promise<void> {
  await db.transaction('rw', db.clients, async () => {
    for (const client of clients) {
      const existing = await db.clients.where('serverId').equals(client.id).first();
      const localClient: ClientLocal = {
        serverId: client.id,
        code: client.code,
        raisonSociale: client.raisonSociale,
        adresse: client.adresse,
        telephone: client.telephone,
        email: client.email,
        contactPrincipal: client.contactPrincipal,
        actif: client.actif ?? true,
        syncedAt: new Date(),
      };

      if (existing) {
        await db.clients.update(existing.id!, localClient);
      } else {
        await db.clients.add(localClient);
      }
    }
  });
  await setLastSyncTime('clients', new Date());
}

async function syncCuvesData(cuves: any[]): Promise<void> {
  await db.transaction('rw', db.cuves, async () => {
    for (const cuve of cuves) {
      const existing = await db.cuves.where('serverId').equals(cuve.id).first();
      const localCuve: CuveLocal = {
        serverId: cuve.id,
        nom: cuve.nom,
        capaciteLitres: cuve.capaciteLitres,
        niveauActuelLitres: cuve.niveauActuelLitres,
        seuilAlerteLitres: cuve.seuilAlerteLitres,
        localisation: cuve.localisation,
        actif: cuve.actif,
        syncedAt: new Date(),
      };

      if (existing) {
        await db.cuves.update(existing.id!, localCuve);
      } else {
        await db.cuves.add(localCuve);
      }
    }
  });
  await setLastSyncTime('cuves', new Date());
}

async function syncPiecesData(pieces: any[]): Promise<void> {
  await db.transaction('rw', db.pieces, async () => {
    for (const piece of pieces) {
      const existing = await db.pieces.where('serverId').equals(piece.id).first();
      const localPiece: PieceLocal = {
        serverId: piece.id,
        reference: piece.reference,
        designation: piece.designation,
        categorie: piece.categorie,
        stockActuel: piece.stockActuel ?? 0,
        stockMinimum: piece.stockMinimum ?? 0,
        prixUnitaire: piece.prixUnitaire,
        emplacement: piece.emplacement,
        actif: piece.actif ?? true,
        syncedAt: new Date(),
      };

      if (existing) {
        await db.pieces.update(existing.id!, localPiece);
      } else {
        await db.pieces.add(localPiece);
      }
    }
  });
  await setLastSyncTime('pieces', new Date());
}

// Legacy individual sync functions (fallback)
async function syncCamions(): Promise<void> {
  try {
    const response = await api.get('/camions');
    await syncCamionsData(response.data);
  } catch (error) {
    console.error('[Sync] Erreur sync camions:', error);
  }
}

async function syncChauffeurs(): Promise<void> {
  try {
    const response = await api.get('/chauffeurs');
    await syncChauffeursData(response.data);
  } catch (error) {
    console.error('[Sync] Erreur sync chauffeurs:', error);
  }
}

async function syncClients(): Promise<void> {
  try {
    const response = await api.get('/clients');
    await syncClientsData(response.data);
  } catch (error) {
    console.error('[Sync] Erreur sync clients:', error);
  }
}

async function syncCuves(): Promise<void> {
  try {
    const response = await api.get('/carburant/cuves');
    await syncCuvesData(response.data);
  } catch (error) {
    console.error('[Sync] Erreur sync cuves:', error);
  }
}

async function syncPieces(): Promise<void> {
  try {
    const response = await api.get('/pieces');
    await syncPiecesData(response.data);
  } catch (error) {
    console.error('[Sync] Erreur sync pieces:', error);
  }
}

// ==================== QUEUE DE SYNCHRONISATION ====================

export async function addToSyncQueue(
  entityType: SyncQueueItem['entityType'],
  entityId: number,
  action: SyncQueueItem['action'],
  data: any
): Promise<void> {
  // Validate before adding to queue
  const validation = validateSyncItem(entityType, data);
  if (!validation.valid) {
    console.error(`[Sync] Validation failed for ${entityType}:`, validation.errors);
    throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
  }

  await db.syncQueue.add({
    entityType,
    entityId,
    action,
    data: {
      ...data,
      _clientTimestamp: new Date().toISOString(),
    },
    createdAt: new Date(),
    retryCount: 0,
  });

  console.log(`[Sync] Ajouté à la queue: ${action} ${entityType} #${entityId}`);

  // Si online, lancer la sync immédiatement
  if (isOnline) {
    processSyncQueue();
  }
}

export async function processSyncQueue(): Promise<void> {
  if (!isOnline || syncInProgress) {
    return;
  }

  syncInProgress = true;
  console.log('[Sync] Traitement de la queue...');

  try {
    // Group items by entity type for batch processing
    const pendingItems = await db.syncQueue.orderBy('createdAt').toArray();

    if (pendingItems.length === 0) {
      console.log('[Sync] Queue vide');
      return;
    }

    // Try batch sync first
    const batchResult = await processBatchSync(pendingItems);

    if (!batchResult.success) {
      // Fallback to individual processing
      await processIndividualItems(pendingItems);
    }
  } finally {
    syncInProgress = false;
  }
}

async function processBatchSync(items: SyncQueueItem[]): Promise<{ success: boolean }> {
  try {
    // Group by entity type
    const grouped = {
      dotations: items.filter((i) => i.entityType === 'dotation').map(formatSyncItem),
      sortiesStock: items.filter((i) => i.entityType === 'sortieStock').map(formatSyncItem),
      bonsTransport: items.filter((i) => i.entityType === 'bonTransport').map(formatSyncItem),
      bonsLocation: items.filter((i) => i.entityType === 'bonLocation').map(formatSyncItem),
      pannes: items.filter((i) => i.entityType === 'panne').map(formatSyncItem),
    };

    // Remove empty arrays
    const payload: any = {};
    if (grouped.dotations.length > 0) payload.dotations = grouped.dotations;
    if (grouped.sortiesStock.length > 0) payload.sortiesStock = grouped.sortiesStock;
    if (grouped.bonsTransport.length > 0) payload.bonsTransport = grouped.bonsTransport;
    if (grouped.bonsLocation.length > 0) payload.bonsLocation = grouped.bonsLocation;
    if (grouped.pannes.length > 0) payload.pannes = grouped.pannes;

    const response = await api.post('/sync', payload);
    const result = response.data;

    // Process results
    for (const entityType of ['dotations', 'sortiesStock', 'bonsTransport', 'bonsLocation', 'pannes'] as const) {
      const entityResult = result[entityType];
      if (!entityResult) continue;

      for (const itemResult of entityResult.results) {
        if (itemResult.success) {
          // Remove from queue and update local entity
          const queueItem = items.find(
            (i) => i.entityId === itemResult.localId &&
            i.entityType === entityType.replace('s', '').replace('Stock', 'Stock') as SyncQueueItem['entityType']
          );
          if (queueItem?.id) {
            await db.syncQueue.delete(queueItem.id);
            await updateLocalEntityWithServerId(
              queueItem.entityType,
              itemResult.localId,
              itemResult.serverId
            );
          }
        }
      }
    }

    notifySyncProgress({
      entity: 'all',
      current: result.totalSuccess,
      total: result.totalProcessed,
      status: result.totalErrors > 0 ? 'error' : 'success',
      message: `${result.totalSuccess}/${result.totalProcessed} synchronisés`,
    });

    return { success: result.totalErrors === 0 };
  } catch (error) {
    console.error('[Sync] Batch sync failed:', error);
    return { success: false };
  }
}

function formatSyncItem(item: SyncQueueItem): any {
  return {
    localId: item.entityId,
    serverId: item.data.serverId,
    action: item.action,
    data: item.data,
    clientTimestamp: item.data._clientTimestamp,
  };
}

async function processIndividualItems(items: SyncQueueItem[]): Promise<void> {
  for (const item of items) {
    try {
      await processQueueItemWithRetry(item);
      await db.syncQueue.delete(item.id!);
      console.log(`[Sync] Succès: ${item.action} ${item.entityType}`);
    } catch (error: any) {
      console.error(`[Sync] Échec: ${item.action} ${item.entityType}`, error);

      // Incrémenter le compteur de retry avec backoff
      const newRetryCount = item.retryCount + 1;
      await db.syncQueue.update(item.id!, {
        retryCount: newRetryCount,
        lastError: error.message || 'Erreur inconnue',
      });

      // Après MAX_RETRIES tentatives, marquer comme failed mais garder
      if (newRetryCount >= CONFIG.MAX_RETRIES) {
        console.error(`[Sync] Max retries atteint pour: ${item.entityType} #${item.entityId}`);
        notifySyncProgress({
          entity: item.entityType,
          current: 0,
          total: 1,
          status: 'error',
          message: `Échec après ${CONFIG.MAX_RETRIES} tentatives`,
        });
      }
    }
  }
}

async function processQueueItemWithRetry(item: SyncQueueItem): Promise<void> {
  const endpoints: Record<SyncQueueItem['entityType'], string> = {
    dotation: '/carburant/dotations',
    sortieStock: '/pieces/sorties',
    bonTransport: '/transport',
    bonLocation: '/location',
    panne: '/pannes',
  };

  const endpoint = endpoints[item.entityType];

  switch (item.action) {
    case 'create':
      const createResponse = await api.post(endpoint, item.data);
      await updateLocalEntityWithServerId(item.entityType, item.entityId, createResponse.data.id);
      break;

    case 'update':
      await api.put(`${endpoint}/${item.data.serverId}`, item.data);
      break;

    case 'delete':
      await api.delete(`${endpoint}/${item.data.serverId}`);
      break;
  }
}

async function updateLocalEntityWithServerId(
  entityType: SyncQueueItem['entityType'],
  localId: number,
  serverId: number
): Promise<void> {
  const tables: Record<SyncQueueItem['entityType'], any> = {
    dotation: db.dotationsCarburant,
    sortieStock: db.sortiesStock,
    bonTransport: db.bonsTransport,
    bonLocation: db.bonsLocation,
    panne: db.pannes,
  };

  const table = tables[entityType];
  await table.update(localId, {
    serverId,
    pendingSync: false,
    syncedAt: new Date(),
  });
}

// ==================== STATISTIQUES ====================

export async function getSyncStats(): Promise<{
  pendingCount: number;
  lastSync: Date | null;
  isOnline: boolean;
  queueByType: Record<string, number>;
}> {
  const pendingCount = await db.syncQueue.count();
  const lastSyncMeta = await db.syncMeta.where('key').equals('lastSync_global').first();

  // Count by type
  const allItems = await db.syncQueue.toArray();
  const queueByType: Record<string, number> = {};
  for (const item of allItems) {
    queueByType[item.entityType] = (queueByType[item.entityType] || 0) + 1;
  }

  return {
    pendingCount,
    lastSync: lastSyncMeta ? new Date(lastSyncMeta.value) : null,
    isOnline,
    queueByType,
  };
}

export async function getOfflineItemsCount(): Promise<Record<string, number>> {
  const [dotations, sorties, transports, locations, pannes] = await Promise.all([
    db.dotationsCarburant.where('pendingSync').equals(1).count(),
    db.sortiesStock.where('pendingSync').equals(1).count(),
    db.bonsTransport.where('pendingSync').equals(1).count(),
    db.bonsLocation.where('pendingSync').equals(1).count(),
    db.pannes.where('pendingSync').equals(1).count(),
  ]);

  return {
    dotations,
    sorties,
    transports,
    locations,
    pannes,
    total: dotations + sorties + transports + locations + pannes,
  };
}

export async function getFailedItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.where('retryCount').aboveOrEqual(CONFIG.MAX_RETRIES).toArray();
}

export async function retryFailedItems(): Promise<void> {
  const failedItems = await getFailedItems();
  for (const item of failedItems) {
    await db.syncQueue.update(item.id!, { retryCount: 0, lastError: undefined });
  }
  if (isOnline) {
    processSyncQueue();
  }
}

export async function clearFailedItems(): Promise<void> {
  const failedItems = await getFailedItems();
  for (const item of failedItems) {
    await db.syncQueue.delete(item.id!);
  }
}

// ==================== MANUAL SYNC TRIGGER ====================

export async function forceSyncNow(): Promise<void> {
  if (!isOnline) {
    throw new Error('Pas de connexion');
  }

  // Request sync via service worker
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('manual-sync');
  }

  // Also process the queue directly
  await processSyncQueue();
}

// ==================== EXPORT ====================

export default {
  initNetworkListeners,
  onNetworkChange,
  onSyncProgress,
  getNetworkStatus,
  syncReferenceData,
  addToSyncQueue,
  processSyncQueue,
  getSyncStats,
  getOfflineItemsCount,
  getFailedItems,
  retryFailedItems,
  clearFailedItems,
  forceSyncNow,
};
