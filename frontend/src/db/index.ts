import Dexie from 'dexie';
import type { Table } from 'dexie';

// Types pour la base locale
export interface CamionLocal {
  id?: number;
  serverId?: number; // ID du serveur
  numeroInterne?: string;
  immatriculation: string;
  typeCamion: string;
  marque: string;
  modele?: string;
  anneeMiseCirculation?: number;
  typeCarburant: string;
  capaciteReservoirLitres?: number;
  kilometrageActuel: number;
  statut: string;
  actif: boolean;
  syncedAt?: Date;
}

export interface ChauffeurLocal {
  id?: number;
  serverId?: number;
  matricule: string;
  nom: string;
  prenom: string;
  telephone?: string;
  numeroPermis: string;
  typePermis: string;
  statut: string;
  actif: boolean;
  syncedAt?: Date;
}

export interface ClientLocal {
  id?: number;
  serverId?: number;
  code?: string;
  raisonSociale: string;
  adresse: string;
  telephone: string;
  email?: string;
  contactPrincipal?: string;
  actif: boolean;
  syncedAt?: Date;
}

export interface FournisseurLocal {
  id?: number;
  serverId?: number;
  nom: string;
  type: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  contactPrincipal?: string;
  actif: boolean;
  syncedAt?: Date;
}

export interface CuveLocal {
  id?: number;
  serverId?: number;
  nom: string;
  capaciteLitres: number;
  niveauActuelLitres: number;
  seuilAlerteLitres: number;
  localisation?: string;
  actif: boolean;
  syncedAt?: Date;
}

export interface DotationCarburantLocal {
  id?: number;
  serverId?: number;
  numeroBon?: string;
  dateDotation: string;
  camionId: number;
  chauffeurId?: number;
  quantiteLitres: number;
  prixUnitaire?: number;
  coutTotal?: number;
  kilometrageCamion?: number;
  typeSource: 'CUVE_INTERNE' | 'STATION_EXTERNE';
  cuveId?: number;
  stationNom?: string;
  createurId?: number;
  // Sync
  pendingSync: boolean;
  syncedAt?: Date;
  createdOffline?: boolean;
}

export interface SortieStockLocal {
  id?: number;
  serverId?: number;
  numeroBon?: string;
  dateSortie: string;
  camionId: number;
  kilometrageCamion?: number;
  motif: string;
  notes?: string;
  createurId?: number;
  lignes: LigneSortieStockLocal[];
  // Sync
  pendingSync: boolean;
  syncedAt?: Date;
  createdOffline?: boolean;
}

export interface LigneSortieStockLocal {
  pieceId: number;
  pieceName?: string;
  quantite: number;
}

export interface PieceLocal {
  id?: number;
  serverId?: number;
  reference: string;
  designation: string;
  categorie: string;
  stockActuel: number;
  stockMinimum: number;
  prixUnitaire?: number;
  emplacement?: string;
  actif: boolean;
  syncedAt?: Date;
}

export interface BonTransportLocal {
  id?: number;
  serverId?: number;
  numero?: string;
  dateCreation: string;
  clientId: number;
  camionId: number;
  chauffeurId: number;
  lieuChargement: string;
  lieuDechargement: string;
  natureChargement?: string;
  poidsKg?: number;
  montantHt?: number;
  statut: string;
  // Sync
  pendingSync: boolean;
  syncedAt?: Date;
  createdOffline?: boolean;
}

export interface BonLocationLocal {
  id?: number;
  serverId?: number;
  numero?: string;
  dateDebut: string;
  dateFinPrevue?: string;
  dateFinReelle?: string;
  clientId: number;
  camionId: number;
  chauffeurId: number;
  tarifJournalier?: number;
  montantTotal?: number;
  carburantInclus: boolean;
  kmDepart?: number;
  kmRetour?: number;
  statut: string;
  // Sync
  pendingSync: boolean;
  syncedAt?: Date;
  createdOffline?: boolean;
}

export interface PanneLocal {
  id?: number;
  serverId?: number;
  numeroPanne?: string;
  datePanne: string;
  camionId: number;
  chauffeurId?: number;
  typePanne: string;
  description: string;
  priorite: string;
  statut: string;
  coutEstime?: number;
  coutReel?: number;
  // Sync
  pendingSync: boolean;
  syncedAt?: Date;
  createdOffline?: boolean;
}

// File d'attente de synchronisation
export interface SyncQueueItem {
  id?: number;
  entityType: 'dotation' | 'sortieStock' | 'bonTransport' | 'bonLocation' | 'panne';
  entityId: number;
  action: 'create' | 'update' | 'delete';
  data: any;
  createdAt: Date;
  retryCount: number;
  lastError?: string;
}

// Métadonnées de sync
export interface SyncMeta {
  id?: number;
  key: string;
  value: string;
  updatedAt: Date;
}

class ACLDatabase extends Dexie {
  camions!: Table<CamionLocal, number>;
  chauffeurs!: Table<ChauffeurLocal, number>;
  clients!: Table<ClientLocal, number>;
  fournisseurs!: Table<FournisseurLocal, number>;
  cuves!: Table<CuveLocal, number>;
  dotationsCarburant!: Table<DotationCarburantLocal, number>;
  sortiesStock!: Table<SortieStockLocal, number>;
  pieces!: Table<PieceLocal, number>;
  bonsTransport!: Table<BonTransportLocal, number>;
  bonsLocation!: Table<BonLocationLocal, number>;
  pannes!: Table<PanneLocal, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  syncMeta!: Table<SyncMeta, number>;

  constructor() {
    super('ACLPlatformDB');

    this.version(2).stores({
      // Données de référence (lecture seule offline)
      camions: '++id, serverId, immatriculation, statut, actif',
      chauffeurs: '++id, serverId, matricule, statut, actif',
      clients: '++id, serverId, raisonSociale, actif',
      fournisseurs: '++id, serverId, nom, type, actif',
      cuves: '++id, serverId, nom, actif',
      pieces: '++id, serverId, reference, categorie, actif',

      // Données transactionnelles (création offline possible)
      dotationsCarburant: '++id, serverId, dateDotation, camionId, pendingSync',
      sortiesStock: '++id, serverId, dateSortie, camionId, pendingSync',
      bonsTransport: '++id, serverId, dateCreation, clientId, pendingSync',
      bonsLocation: '++id, serverId, dateDebut, clientId, pendingSync',
      pannes: '++id, serverId, datePanne, camionId, pendingSync',

      // Queue de synchronisation
      syncQueue: '++id, entityType, entityId, action, createdAt, retryCount',

      // Métadonnées
      syncMeta: '++id, key'
    });
  }
}

export const db = new ACLDatabase();

// Helper functions
export async function clearAllData() {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
}

export async function getLastSyncTime(entity: string): Promise<Date | null> {
  const meta = await db.syncMeta.where('key').equals(`lastSync_${entity}`).first();
  return meta ? new Date(meta.value) : null;
}

export async function setLastSyncTime(entity: string, time: Date): Promise<void> {
  const key = `lastSync_${entity}`;
  const existing = await db.syncMeta.where('key').equals(key).first();
  if (existing) {
    await db.syncMeta.update(existing.id!, { value: time.toISOString(), updatedAt: new Date() });
  } else {
    await db.syncMeta.add({ key, value: time.toISOString(), updatedAt: new Date() });
  }
}

export async function getPendingItems<T extends { pendingSync: boolean }>(
  table: Table<T, number>
): Promise<T[]> {
  return table.where('pendingSync').equals(1).toArray();
}

export default db;
