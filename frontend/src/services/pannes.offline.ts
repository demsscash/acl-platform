import db from '../db';
import type { PanneLocal } from '../db';
import { addToSyncQueue, getNetworkStatus } from './sync.service';
import pannesService from './pannes.service';
import type { Panne, CreatePanneDto } from './pannes.service';

function generateTempPanneNumber(): string {
  const date = new Date();
  const timestamp = date.getTime().toString(36).toUpperCase();
  return `TEMP-PAN-${timestamp}`;
}

export const pannesOfflineService = {
  // ==================== LISTE DES PANNES ====================

  async getAll(): Promise<(Panne & { pendingSync?: boolean })[]> {
    if (getNetworkStatus()) {
      try {
        const serverPannes = await pannesService.getAll();
        await cachePannesToLocal(serverPannes);

        // Ajouter les pannes locales en attente
        const pendingLocal = await db.pannes
          .where('pendingSync')
          .equals(1)
          .toArray();

        const pendingMapped = mapLocalPannes(pendingLocal);
        return [...pendingMapped, ...serverPannes];
      } catch (error) {
        console.warn('[Offline] Erreur API pannes, fallback local:', error);
        return getPannesFromLocal();
      }
    } else {
      return getPannesFromLocal();
    }
  },

  async getEnCours(): Promise<(Panne & { pendingSync?: boolean })[]> {
    if (getNetworkStatus()) {
      try {
        const serverPannes = await pannesService.getEnCours();

        // Ajouter les pannes locales en cours
        const pendingLocal = await db.pannes
          .where('pendingSync')
          .equals(1)
          .filter((p) => !['REPAREE', 'CLOTUREE'].includes(p.statut))
          .toArray();

        const pendingMapped = mapLocalPannes(pendingLocal);
        return [...pendingMapped, ...serverPannes];
      } catch (error) {
        console.warn('[Offline] Erreur API pannes en cours, fallback local:', error);
        const allLocal = await getPannesFromLocal();
        return allLocal.filter((p) => !['REPAREE', 'CLOTUREE'].includes(p.statut));
      }
    } else {
      const allLocal = await getPannesFromLocal();
      return allLocal.filter((p) => !['REPAREE', 'CLOTUREE'].includes(p.statut));
    }
  },

  async getByCamion(camionId: number): Promise<(Panne & { pendingSync?: boolean })[]> {
    if (getNetworkStatus()) {
      try {
        const serverPannes = await pannesService.getByCamion(camionId);

        // Ajouter les pannes locales pour ce camion
        const pendingLocal = await db.pannes
          .where('camionId')
          .equals(camionId)
          .filter((p) => p.pendingSync)
          .toArray();

        const pendingMapped = mapLocalPannes(pendingLocal);
        return [...pendingMapped, ...serverPannes];
      } catch (error) {
        console.warn('[Offline] Erreur API pannes camion, fallback local:', error);
        const allLocal = await getPannesFromLocal();
        return allLocal.filter((p) => p.camionId === camionId);
      }
    } else {
      const allLocal = await getPannesFromLocal();
      return allLocal.filter((p) => p.camionId === camionId);
    }
  },

  // ==================== CRÉATION ====================

  async create(data: CreatePanneDto): Promise<Panne> {
    if (getNetworkStatus()) {
      try {
        const result = await pannesService.create(data);

        // Sauvegarder en cache local
        await db.pannes.add({
          serverId: result.id,
          numeroPanne: result.numeroPanne,
          datePanne: result.datePanne,
          camionId: result.camionId,
          chauffeurId: result.chauffeurId,
          typePanne: result.typePanne,
          description: result.description,
          priorite: result.priorite,
          statut: result.statut,
          coutEstime: result.coutEstime,
          pendingSync: false,
          syncedAt: new Date(),
          createdOffline: false,
        });

        return result;
      } catch (error) {
        console.warn('[Offline] Erreur création panne, sauvegarde locale:', error);
        return createPanneOffline(data);
      }
    } else {
      return createPanneOffline(data);
    }
  },

  // ==================== STATS ====================

  async getStats(): Promise<{
    total: number;
    enCours: number;
    parStatut: Record<string, number>;
    parType: Record<string, number>;
    coutTotal: number;
  }> {
    if (getNetworkStatus()) {
      try {
        return await pannesService.getStats();
      } catch (error) {
        console.warn('[Offline] Erreur API stats pannes, calcul local:', error);
        return getStatsFromLocal();
      }
    } else {
      return getStatsFromLocal();
    }
  },

  // ==================== STATS OFFLINE ====================

  async getOfflineStats(): Promise<{
    pannesPending: number;
    pannesCount: number;
    lastSync: Date | null;
  }> {
    const pannesPending = await db.pannes
      .where('pendingSync')
      .equals(1)
      .count();

    const pannesCount = await db.pannes.count();

    const lastSyncMeta = await db.syncMeta
      .where('key')
      .equals('lastSync_pannes')
      .first();

    return {
      pannesPending,
      pannesCount,
      lastSync: lastSyncMeta ? new Date(lastSyncMeta.value) : null,
    };
  },
};

// ==================== HELPERS PRIVÉS ====================

async function cachePannesToLocal(pannes: Panne[]): Promise<void> {
  await db.transaction('rw', db.pannes, async () => {
    for (const panne of pannes) {
      const existing = await db.pannes.where('serverId').equals(panne.id).first();
      const localPanne: PanneLocal = {
        serverId: panne.id,
        numeroPanne: panne.numeroPanne,
        datePanne: panne.datePanne,
        camionId: panne.camionId,
        chauffeurId: panne.chauffeurId,
        typePanne: panne.typePanne,
        description: panne.description,
        priorite: panne.priorite,
        statut: panne.statut,
        coutEstime: panne.coutEstime,
        coutReel: panne.coutReel,
        pendingSync: false,
        syncedAt: new Date(),
        createdOffline: false,
      };

      if (existing) {
        await db.pannes.update(existing.id!, localPanne);
      } else {
        await db.pannes.add(localPanne);
      }
    }
  });
}

async function getPannesFromLocal(): Promise<(Panne & { pendingSync?: boolean })[]> {
  const localPannes = await db.pannes.orderBy('datePanne').reverse().toArray();
  return mapLocalPannes(localPannes);
}

function mapLocalPannes(localPannes: PanneLocal[]): (Panne & { pendingSync?: boolean })[] {
  return localPannes.map((p) => ({
    id: p.serverId || p.id!,
    numeroPanne: p.numeroPanne || `LOCAL-${p.id}`,
    camionId: p.camionId,
    chauffeurId: p.chauffeurId,
    datePanne: p.datePanne,
    typePanne: p.typePanne as any,
    priorite: p.priorite as any,
    statut: p.statut as any,
    description: p.description,
    coutEstime: p.coutEstime,
    coutReel: p.coutReel,
    createdAt: p.datePanne,
    pendingSync: p.pendingSync,
  }));
}

async function createPanneOffline(data: CreatePanneDto): Promise<Panne> {
  const now = new Date();
  const tempNum = generateTempPanneNumber();

  const localPanne: PanneLocal = {
    numeroPanne: tempNum,
    datePanne: data.datePanne,
    camionId: data.camionId,
    chauffeurId: data.chauffeurId,
    typePanne: data.typePanne,
    description: data.description,
    priorite: data.priorite,
    statut: 'DECLAREE',
    pendingSync: true,
    createdOffline: true,
  };

  const localId = await db.pannes.add(localPanne);

  // Ajouter à la queue de sync
  await addToSyncQueue('panne', localId, 'create', data);

  return {
    id: localId,
    numeroPanne: tempNum,
    camionId: data.camionId,
    chauffeurId: data.chauffeurId,
    datePanne: data.datePanne,
    typePanne: data.typePanne,
    priorite: data.priorite,
    statut: 'DECLAREE',
    description: data.description,
    localisation: data.localisation,
    kilometragePanne: data.kilometragePanne,
    createdAt: now.toISOString(),
  };
}

async function getStatsFromLocal(): Promise<{
  total: number;
  enCours: number;
  parStatut: Record<string, number>;
  parType: Record<string, number>;
  coutTotal: number;
}> {
  const allPannes = await db.pannes.toArray();

  const parStatut: Record<string, number> = {};
  const parType: Record<string, number> = {};
  let coutTotal = 0;
  let enCours = 0;

  for (const p of allPannes) {
    parStatut[p.statut] = (parStatut[p.statut] || 0) + 1;
    parType[p.typePanne] = (parType[p.typePanne] || 0) + 1;
    coutTotal += p.coutReel || p.coutEstime || 0;
    if (!['REPAREE', 'CLOTUREE'].includes(p.statut)) {
      enCours++;
    }
  }

  return {
    total: allPannes.length,
    enCours,
    parStatut,
    parType,
    coutTotal,
  };
}

export default pannesOfflineService;
