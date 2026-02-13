import db from '../db';
import type { DotationCarburantLocal, CuveLocal } from '../db';
import { addToSyncQueue, getNetworkStatus } from './sync.service';
import carburantService from './carburant.service';
import type { CreateDotationDto, DotationCarburant, Cuve } from './carburant.service';

// Génère un numéro de bon temporaire pour les créations offline
function generateTempBonNumber(): string {
  const date = new Date();
  const timestamp = date.getTime().toString(36).toUpperCase();
  return `TEMP-${timestamp}`;
}

export const carburantOfflineService = {
  // ==================== CUVES ====================

  async getCuves(): Promise<Cuve[]> {
    if (getNetworkStatus()) {
      try {
        // Online: utiliser l'API et mettre en cache
        const cuves = await carburantService.getCuves();
        await cacheToLocal(cuves);
        return cuves;
      } catch (error) {
        console.warn('[Offline] Erreur API cuves, fallback local:', error);
        return getCuvesFromLocal();
      }
    } else {
      // Offline: utiliser le cache local
      return getCuvesFromLocal();
    }
  },

  // ==================== DOTATIONS ====================

  async getDotations(): Promise<(DotationCarburant & { pendingSync?: boolean })[]> {
    if (getNetworkStatus()) {
      try {
        // Online: récupérer du serveur
        const serverDotations = await carburantService.getDotations();

        // Aussi récupérer les dotations locales en attente de sync
        const pendingLocal = await db.dotationsCarburant
          .where('pendingSync')
          .equals(1)
          .toArray();

        // Combiner: serveur + pending local
        const pendingMapped = pendingLocal.map((d) => ({
          id: d.id!,
          numeroBon: d.numeroBon || generateTempBonNumber(),
          dateDotation: d.dateDotation,
          camionId: d.camionId,
          chauffeurId: d.chauffeurId,
          typeSource: d.typeSource,
          cuveId: d.cuveId,
          stationNom: d.stationNom,
          quantiteLitres: d.quantiteLitres,
          prixUnitaire: d.prixUnitaire,
          coutTotal: d.coutTotal,
          kilometrageCamion: d.kilometrageCamion,
          pendingSync: true,
        }));

        return [...pendingMapped, ...serverDotations];
      } catch (error) {
        console.warn('[Offline] Erreur API dotations, fallback local:', error);
        return getDotationsFromLocal();
      }
    } else {
      // Offline: utiliser le cache local
      return getDotationsFromLocal();
    }
  },

  async createDotation(data: CreateDotationDto): Promise<DotationCarburant> {
    if (getNetworkStatus()) {
      try {
        // Online: créer via API
        const result = await carburantService.createDotation(data);

        // Aussi sauvegarder localement pour le cache
        await db.dotationsCarburant.add({
          serverId: result.id,
          numeroBon: result.numeroBon,
          dateDotation: result.dateDotation,
          camionId: result.camionId,
          chauffeurId: result.chauffeurId,
          quantiteLitres: result.quantiteLitres,
          prixUnitaire: result.prixUnitaire,
          coutTotal: result.coutTotal,
          kilometrageCamion: result.kilometrageCamion,
          typeSource: result.typeSource,
          cuveId: result.cuveId,
          stationNom: result.stationNom,
          pendingSync: false,
          syncedAt: new Date(),
          createdOffline: false,
        });

        return result;
      } catch (error) {
        console.warn('[Offline] Erreur création dotation, sauvegarde locale:', error);
        // Fallback: sauvegarder localement
        return createDotationOffline(data);
      }
    } else {
      // Offline: sauvegarder localement
      return createDotationOffline(data);
    }
  },

  // ==================== STATS ====================

  async getOfflineStats(): Promise<{
    dotationsPending: number;
    cuvesCount: number;
    lastSync: Date | null;
  }> {
    const dotationsPending = await db.dotationsCarburant
      .where('pendingSync')
      .equals(1)
      .count();

    const cuvesCount = await db.cuves.count();

    const lastSyncMeta = await db.syncMeta
      .where('key')
      .equals('lastSync_cuves')
      .first();

    return {
      dotationsPending,
      cuvesCount,
      lastSync: lastSyncMeta ? new Date(lastSyncMeta.value) : null,
    };
  },
};

// ==================== HELPERS PRIVÉS ====================

async function cacheToLocal(cuves: Cuve[]): Promise<void> {
  await db.transaction('rw', db.cuves, async () => {
    for (const cuve of cuves) {
      const existing = await db.cuves.where('serverId').equals(cuve.id).first();
      const localCuve: CuveLocal = {
        serverId: cuve.id,
        nom: cuve.nom,
        capaciteLitres: cuve.capaciteLitres,
        niveauActuelLitres: cuve.niveauActuelLitres,
        seuilAlerteLitres: cuve.seuilAlerteBas,
        localisation: cuve.emplacement,
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
}

async function getCuvesFromLocal(): Promise<Cuve[]> {
  const localCuves = await db.cuves.where('actif').equals(1).toArray();

  return localCuves.map((c) => ({
    id: c.serverId || c.id!,
    nom: c.nom,
    typeCarburant: 'DIESEL' as const,
    capaciteLitres: c.capaciteLitres,
    niveauActuelLitres: c.niveauActuelLitres,
    seuilAlerteBas: c.seuilAlerteLitres,
    emplacement: c.localisation,
    actif: c.actif,
  }));
}

async function getDotationsFromLocal(): Promise<(DotationCarburant & { pendingSync?: boolean })[]> {
  const localDotations = await db.dotationsCarburant
    .orderBy('dateDotation')
    .reverse()
    .toArray();

  return localDotations.map((d) => ({
    id: d.serverId || d.id!,
    numeroBon: d.numeroBon || `LOCAL-${d.id}`,
    dateDotation: d.dateDotation,
    camionId: d.camionId,
    chauffeurId: d.chauffeurId,
    typeSource: d.typeSource,
    cuveId: d.cuveId,
    stationNom: d.stationNom,
    quantiteLitres: d.quantiteLitres,
    prixUnitaire: d.prixUnitaire,
    coutTotal: d.coutTotal,
    kilometrageCamion: d.kilometrageCamion,
    pendingSync: d.pendingSync,
  }));
}

async function createDotationOffline(data: CreateDotationDto): Promise<DotationCarburant> {
  const now = new Date();
  const tempBon = generateTempBonNumber();

  const localDotation: DotationCarburantLocal = {
    numeroBon: tempBon,
    dateDotation: now.toISOString(),
    camionId: data.camionId,
    chauffeurId: data.chauffeurId,
    quantiteLitres: data.quantiteLitres,
    prixUnitaire: data.prixUnitaire,
    coutTotal: data.prixUnitaire ? data.quantiteLitres * data.prixUnitaire : undefined,
    kilometrageCamion: data.kilometrageCamion,
    typeSource: data.typeSource,
    cuveId: data.cuveId,
    stationNom: data.stationNom,
    pendingSync: true,
    createdOffline: true,
  };

  const localId = await db.dotationsCarburant.add(localDotation);

  // Ajouter à la queue de sync
  await addToSyncQueue('dotation', localId, 'create', {
    ...data,
    dateDotation: now.toISOString(),
  });

  // Mettre à jour le niveau de cuve localement si c'est une cuve interne
  if (data.typeSource === 'CUVE_INTERNE' && data.cuveId) {
    const cuve = await db.cuves.where('serverId').equals(data.cuveId).first();
    if (cuve) {
      const newNiveau = Math.max(0, cuve.niveauActuelLitres - data.quantiteLitres);
      await db.cuves.update(cuve.id!, { niveauActuelLitres: newNiveau });
    }
  }

  return {
    id: localId,
    numeroBon: tempBon,
    dateDotation: now.toISOString(),
    camionId: data.camionId,
    chauffeurId: data.chauffeurId,
    typeSource: data.typeSource,
    cuveId: data.cuveId,
    stationNom: data.stationNom,
    quantiteLitres: data.quantiteLitres,
    prixUnitaire: data.prixUnitaire,
    coutTotal: data.prixUnitaire ? data.quantiteLitres * data.prixUnitaire : undefined,
    kilometrageCamion: data.kilometrageCamion,
  };
}

export default carburantOfflineService;
