import db from '../db';
import type { BonTransportLocal, ClientLocal } from '../db';
import { addToSyncQueue, getNetworkStatus } from './sync.service';
import transportService from './transport.service';
import type { BonTransport, CreateBonDto, Client } from './transport.service';

function generateTempBonNumber(): string {
  const date = new Date();
  const timestamp = date.getTime().toString(36).toUpperCase();
  return `TEMP-TRP-${timestamp}`;
}

export const transportOfflineService = {
  // ==================== BONS DE TRANSPORT ====================

  async getBons(): Promise<(BonTransport & { pendingSync?: boolean })[]> {
    if (getNetworkStatus()) {
      try {
        const serverBons = await transportService.getBons();
        await cacheBonsToLocal(serverBons);

        // Ajouter les bons locaux en attente
        const pendingLocal = await db.bonsTransport
          .where('pendingSync')
          .equals(1)
          .toArray();

        const pendingMapped = await mapLocalBons(pendingLocal);
        return [...pendingMapped, ...serverBons];
      } catch (error) {
        console.warn('[Offline] Erreur API transport, fallback local:', error);
        return getBonsFromLocal();
      }
    } else {
      return getBonsFromLocal();
    }
  },

  async createBon(data: CreateBonDto): Promise<BonTransport> {
    if (getNetworkStatus()) {
      try {
        const result = await transportService.createBon(data);

        // Sauvegarder en cache local
        await db.bonsTransport.add({
          serverId: result.id,
          numero: result.numero,
          dateCreation: result.dateCreation,
          clientId: result.clientId || 0,
          camionId: result.camionId || 0,
          chauffeurId: result.chauffeurId || 0,
          lieuChargement: result.lieuChargement || '',
          lieuDechargement: result.lieuDechargement || '',
          natureChargement: result.natureChargement,
          poidsKg: result.poidsKg,
          montantHt: result.montantHt,
          statut: result.statut,
          pendingSync: false,
          syncedAt: new Date(),
          createdOffline: false,
        });

        return result;
      } catch (error) {
        console.warn('[Offline] Erreur création bon transport, sauvegarde locale:', error);
        return createBonOffline(data);
      }
    } else {
      return createBonOffline(data);
    }
  },

  // ==================== CLIENTS ====================

  async getClients(): Promise<Client[]> {
    if (getNetworkStatus()) {
      try {
        const clients = await transportService.getClients();
        await cacheClientsToLocal(clients);
        return clients;
      } catch (error) {
        console.warn('[Offline] Erreur API clients, fallback local:', error);
        return getClientsFromLocal();
      }
    } else {
      return getClientsFromLocal();
    }
  },

  // ==================== STATS ====================

  async getStats(): Promise<{ total: number; enCours: number; livres: number }> {
    if (getNetworkStatus()) {
      try {
        return await transportService.getStats();
      } catch (error) {
        console.warn('[Offline] Erreur API stats transport, calcul local:', error);
        return getStatsFromLocal();
      }
    } else {
      return getStatsFromLocal();
    }
  },

  // ==================== STATS OFFLINE ====================

  async getOfflineStats(): Promise<{
    bonsPending: number;
    bonsCount: number;
    lastSync: Date | null;
  }> {
    const bonsPending = await db.bonsTransport
      .where('pendingSync')
      .equals(1)
      .count();

    const bonsCount = await db.bonsTransport.count();

    const lastSyncMeta = await db.syncMeta
      .where('key')
      .equals('lastSync_transport')
      .first();

    return {
      bonsPending,
      bonsCount,
      lastSync: lastSyncMeta ? new Date(lastSyncMeta.value) : null,
    };
  },
};

// ==================== HELPERS PRIVÉS ====================

async function cacheBonsToLocal(bons: BonTransport[]): Promise<void> {
  await db.transaction('rw', db.bonsTransport, async () => {
    for (const bon of bons) {
      const existing = await db.bonsTransport.where('serverId').equals(bon.id).first();
      const localBon: BonTransportLocal = {
        serverId: bon.id,
        numero: bon.numero,
        dateCreation: bon.dateCreation,
        clientId: bon.clientId || 0,
        camionId: bon.camionId || 0,
        chauffeurId: bon.chauffeurId || 0,
        lieuChargement: bon.lieuChargement || '',
        lieuDechargement: bon.lieuDechargement || '',
        natureChargement: bon.natureChargement,
        poidsKg: bon.poidsKg,
        montantHt: bon.montantHt,
        statut: bon.statut,
        pendingSync: false,
        syncedAt: new Date(),
        createdOffline: false,
      };

      if (existing) {
        await db.bonsTransport.update(existing.id!, localBon);
      } else {
        await db.bonsTransport.add(localBon);
      }
    }
  });
}

async function cacheClientsToLocal(clients: Client[]): Promise<void> {
  await db.transaction('rw', db.clients, async () => {
    for (const client of clients) {
      const existing = await db.clients.where('serverId').equals(client.id).first();
      const localClient: ClientLocal = {
        serverId: client.id,
        raisonSociale: client.raisonSociale,
        adresse: client.adresse || '',
        telephone: client.telephone || '',
        email: client.email,
        actif: client.actif,
        syncedAt: new Date(),
      };

      if (existing) {
        await db.clients.update(existing.id!, localClient);
      } else {
        await db.clients.add(localClient);
      }
    }
  });
}

async function getBonsFromLocal(): Promise<(BonTransport & { pendingSync?: boolean })[]> {
  const localBons = await db.bonsTransport.orderBy('dateCreation').reverse().toArray();
  return mapLocalBons(localBons);
}

async function mapLocalBons(localBons: BonTransportLocal[]): Promise<(BonTransport & { pendingSync?: boolean })[]> {
  const result: (BonTransport & { pendingSync?: boolean })[] = [];

  for (const b of localBons) {
    // Récupérer les infos client, camion, chauffeur depuis le cache local
    const client = b.clientId ? await db.clients.where('serverId').equals(b.clientId).first() : null;
    const camion = b.camionId ? await db.camions.where('serverId').equals(b.camionId).first() : null;
    const chauffeur = b.chauffeurId ? await db.chauffeurs.where('serverId').equals(b.chauffeurId).first() : null;

    result.push({
      id: b.serverId || b.id!,
      numero: b.numero || `LOCAL-${b.id}`,
      dateCreation: b.dateCreation,
      clientId: b.clientId,
      client: client ? { id: client.serverId!, raisonSociale: client.raisonSociale, actif: client.actif } : undefined,
      camionId: b.camionId,
      camion: camion ? { id: camion.serverId!, immatriculation: camion.immatriculation } : undefined,
      chauffeurId: b.chauffeurId,
      chauffeur: chauffeur ? { id: chauffeur.serverId!, nom: chauffeur.nom, prenom: chauffeur.prenom } : undefined,
      lieuChargement: b.lieuChargement,
      lieuDechargement: b.lieuDechargement,
      natureChargement: b.natureChargement,
      poidsKg: b.poidsKg,
      montantHt: b.montantHt,
      statut: b.statut as any,
      pendingSync: b.pendingSync,
    });
  }

  return result;
}

async function getClientsFromLocal(): Promise<Client[]> {
  const localClients = await db.clients.where('actif').equals(1).toArray();
  return localClients.map((c) => ({
    id: c.serverId || c.id!,
    raisonSociale: c.raisonSociale,
    adresse: c.adresse,
    telephone: c.telephone,
    email: c.email,
    actif: c.actif,
  }));
}

async function createBonOffline(data: CreateBonDto): Promise<BonTransport> {
  const now = new Date();
  const tempNum = generateTempBonNumber();

  const localBon: BonTransportLocal = {
    numero: tempNum,
    dateCreation: now.toISOString(),
    clientId: data.clientId || 0,
    camionId: data.camionId || 0,
    chauffeurId: data.chauffeurId || 0,
    lieuChargement: data.lieuChargement || '',
    lieuDechargement: data.lieuDechargement || '',
    natureChargement: data.natureChargement,
    poidsKg: data.poidsKg,
    montantHt: data.montantHt,
    statut: 'BROUILLON',
    pendingSync: true,
    createdOffline: true,
  };

  const localId = await db.bonsTransport.add(localBon);

  // Ajouter à la queue de sync
  await addToSyncQueue('bonTransport', localId, 'create', data);

  // Récupérer les infos pour le retour
  const client = data.clientId ? await db.clients.where('serverId').equals(data.clientId).first() : null;
  const camion = data.camionId ? await db.camions.where('serverId').equals(data.camionId).first() : null;
  const chauffeur = data.chauffeurId ? await db.chauffeurs.where('serverId').equals(data.chauffeurId).first() : null;

  return {
    id: localId,
    numero: tempNum,
    dateCreation: now.toISOString(),
    clientId: data.clientId,
    client: client ? { id: client.serverId!, raisonSociale: client.raisonSociale, actif: client.actif } : undefined,
    camionId: data.camionId,
    camion: camion ? { id: camion.serverId!, immatriculation: camion.immatriculation } : undefined,
    chauffeurId: data.chauffeurId,
    chauffeur: chauffeur ? { id: chauffeur.serverId!, nom: chauffeur.nom, prenom: chauffeur.prenom } : undefined,
    lieuChargement: data.lieuChargement,
    lieuDechargement: data.lieuDechargement,
    natureChargement: data.natureChargement,
    poidsKg: data.poidsKg,
    montantHt: data.montantHt,
    statut: 'BROUILLON',
  };
}

async function getStatsFromLocal(): Promise<{ total: number; enCours: number; livres: number }> {
  const allBons = await db.bonsTransport.toArray();
  return {
    total: allBons.length,
    enCours: allBons.filter((b) => b.statut === 'EN_COURS').length,
    livres: allBons.filter((b) => b.statut === 'LIVRE').length,
  };
}

export default transportOfflineService;
