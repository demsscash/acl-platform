import db from '../db';
import type { PieceLocal, SortieStockLocal } from '../db';
import { addToSyncQueue, getNetworkStatus } from './sync.service';
import piecesService from './pieces.service';
import type {
  CataloguePiece,
  SortieStock,
  CreateSortieDto,
  StockPiece,
} from './pieces.service';

function generateTempBonNumber(): string {
  const date = new Date();
  const timestamp = date.getTime().toString(36).toUpperCase();
  return `TEMP-SRT-${timestamp}`;
}

export const piecesOfflineService = {
  // ==================== CATALOGUE PIÈCES ====================

  async getAll(): Promise<CataloguePiece[]> {
    if (getNetworkStatus()) {
      try {
        const pieces = await piecesService.getAll();
        await cachePiecesToLocal(pieces);
        return pieces;
      } catch (error) {
        console.warn('[Offline] Erreur API pièces, fallback local:', error);
        return getPiecesFromLocal();
      }
    } else {
      return getPiecesFromLocal();
    }
  },

  // ==================== STOCK ====================

  async getStock(): Promise<StockPiece[]> {
    if (getNetworkStatus()) {
      try {
        const stock = await piecesService.getStock();
        // Mettre à jour le cache local
        for (const item of stock) {
          if (item.piece) {
            const existing = await db.pieces.where('serverId').equals(item.pieceId).first();
            if (existing) {
              await db.pieces.update(existing.id!, {
                stockActuel: item.quantiteDisponible,
                emplacement: item.emplacement,
              });
            }
          }
        }
        return stock;
      } catch (error) {
        console.warn('[Offline] Erreur API stock, fallback local:', error);
        return getStockFromLocal();
      }
    } else {
      return getStockFromLocal();
    }
  },

  // ==================== SORTIES STOCK ====================

  async getSorties(): Promise<(SortieStock & { pendingSync?: boolean })[]> {
    if (getNetworkStatus()) {
      try {
        const serverSorties = await piecesService.getSorties();

        // Récupérer les sorties locales en attente
        const pendingLocal = await db.sortiesStock
          .where('pendingSync')
          .equals(1)
          .toArray();

        const pendingMapped = pendingLocal.map((s) => ({
          id: s.id!,
          numeroBon: s.numeroBon || generateTempBonNumber(),
          dateSortie: s.dateSortie,
          camionId: s.camionId,
          kilometrageCamion: s.kilometrageCamion,
          motif: s.motif as any,
          notes: s.notes,
          lignes: s.lignes.map((l) => ({
            id: 0,
            pieceId: l.pieceId,
            quantite: l.quantite,
          })),
          createdBy: s.createurId || 0,
          createdAt: s.dateSortie,
          pendingSync: true,
        }));

        return [...pendingMapped, ...serverSorties];
      } catch (error) {
        console.warn('[Offline] Erreur API sorties, fallback local:', error);
        return getSortiesFromLocal();
      }
    } else {
      return getSortiesFromLocal();
    }
  },

  async createSortie(data: CreateSortieDto): Promise<SortieStock> {
    if (getNetworkStatus()) {
      try {
        const result = await piecesService.createSortie(data);

        // Sauvegarder localement pour le cache
        await db.sortiesStock.add({
          serverId: result.id,
          numeroBon: result.numeroBon,
          dateSortie: result.dateSortie,
          camionId: result.camionId,
          kilometrageCamion: result.kilometrageCamion,
          motif: result.motif,
          notes: result.notes,
          lignes: result.lignes.map((l) => ({
            pieceId: l.pieceId,
            quantite: l.quantite,
            pieceName: l.piece?.designation,
          })),
          createurId: result.createdBy,
          pendingSync: false,
          syncedAt: new Date(),
          createdOffline: false,
        });

        // Mettre à jour le stock local
        for (const ligne of data.lignes) {
          const piece = await db.pieces.where('serverId').equals(ligne.pieceId).first();
          if (piece) {
            await db.pieces.update(piece.id!, {
              stockActuel: Math.max(0, piece.stockActuel - ligne.quantite),
            });
          }
        }

        return result;
      } catch (error) {
        console.warn('[Offline] Erreur création sortie, sauvegarde locale:', error);
        return createSortieOffline(data);
      }
    } else {
      return createSortieOffline(data);
    }
  },

  // ==================== STATS OFFLINE ====================

  async getOfflineStats(): Promise<{
    sortiesPending: number;
    piecesCount: number;
    lastSync: Date | null;
  }> {
    const sortiesPending = await db.sortiesStock
      .where('pendingSync')
      .equals(1)
      .count();

    const piecesCount = await db.pieces.count();

    const lastSyncMeta = await db.syncMeta
      .where('key')
      .equals('lastSync_pieces')
      .first();

    return {
      sortiesPending,
      piecesCount,
      lastSync: lastSyncMeta ? new Date(lastSyncMeta.value) : null,
    };
  },
};

// ==================== HELPERS PRIVÉS ====================

async function cachePiecesToLocal(pieces: CataloguePiece[]): Promise<void> {
  await db.transaction('rw', db.pieces, async () => {
    for (const piece of pieces) {
      const existing = await db.pieces.where('serverId').equals(piece.id).first();
      const localPiece: PieceLocal = {
        serverId: piece.id,
        reference: piece.reference,
        designation: piece.designation,
        categorie: piece.categorie || 'AUTRE',
        stockActuel: 0, // Sera mis à jour par getStock
        stockMinimum: piece.stockMinimum,
        prixUnitaire: piece.prixUnitaireMoyen,
        emplacement: piece.emplacementDefaut,
        actif: piece.actif,
        syncedAt: new Date(),
      };

      if (existing) {
        await db.pieces.update(existing.id!, localPiece);
      } else {
        await db.pieces.add(localPiece);
      }
    }
  });
}

async function getPiecesFromLocal(): Promise<CataloguePiece[]> {
  const localPieces = await db.pieces.where('actif').equals(1).toArray();

  return localPieces.map((p) => ({
    id: p.serverId || p.id!,
    reference: p.reference,
    designation: p.designation,
    categorie: p.categorie,
    uniteMesure: 'UNITE',
    prixUnitaireMoyen: p.prixUnitaire,
    stockMinimum: p.stockMinimum,
    stockMaximum: 1000,
    emplacementDefaut: p.emplacement,
    actif: p.actif,
  }));
}

async function getStockFromLocal(): Promise<StockPiece[]> {
  const localPieces = await db.pieces.where('actif').equals(1).toArray();

  return localPieces.map((p) => ({
    id: p.id!,
    pieceId: p.serverId || p.id!,
    piece: {
      id: p.serverId || p.id!,
      reference: p.reference,
      designation: p.designation,
      categorie: p.categorie,
      uniteMesure: 'UNITE',
      stockMinimum: p.stockMinimum,
      stockMaximum: 1000,
      actif: p.actif,
    },
    quantiteDisponible: p.stockActuel,
    quantiteReservee: 0,
    emplacement: p.emplacement,
  }));
}

async function getSortiesFromLocal(): Promise<(SortieStock & { pendingSync?: boolean })[]> {
  const localSorties = await db.sortiesStock
    .orderBy('dateSortie')
    .reverse()
    .toArray();

  return localSorties.map((s) => ({
    id: s.serverId || s.id!,
    numeroBon: s.numeroBon || `LOCAL-${s.id}`,
    dateSortie: s.dateSortie,
    camionId: s.camionId,
    kilometrageCamion: s.kilometrageCamion,
    motif: s.motif as any,
    notes: s.notes,
    lignes: s.lignes.map((l) => ({
      id: 0,
      pieceId: l.pieceId,
      quantite: l.quantite,
      piece: { designation: l.pieceName } as any,
    })),
    createdBy: s.createurId || 0,
    createdAt: s.dateSortie,
    pendingSync: s.pendingSync,
  }));
}

async function createSortieOffline(data: CreateSortieDto): Promise<SortieStock> {
  const now = new Date();
  const tempBon = generateTempBonNumber();

  // Récupérer les noms des pièces pour l'affichage
  const lignesWithNames = await Promise.all(
    data.lignes.map(async (l) => {
      const piece = await db.pieces.where('serverId').equals(l.pieceId).first();
      return {
        pieceId: l.pieceId,
        quantite: l.quantite,
        pieceName: piece?.designation,
      };
    })
  );

  const localSortie: SortieStockLocal = {
    numeroBon: tempBon,
    dateSortie: data.dateSortie || now.toISOString(),
    camionId: data.camionId,
    kilometrageCamion: data.kilometrageCamion,
    motif: data.motif,
    notes: data.notes,
    lignes: lignesWithNames,
    pendingSync: true,
    createdOffline: true,
  };

  const localId = await db.sortiesStock.add(localSortie);

  // Ajouter à la queue de sync
  await addToSyncQueue('sortieStock', localId, 'create', data);

  // Mettre à jour le stock local
  for (const ligne of data.lignes) {
    const piece = await db.pieces.where('serverId').equals(ligne.pieceId).first();
    if (piece) {
      await db.pieces.update(piece.id!, {
        stockActuel: Math.max(0, piece.stockActuel - ligne.quantite),
      });
    }
  }

  return {
    id: localId,
    numeroBon: tempBon,
    dateSortie: localSortie.dateSortie,
    camionId: data.camionId,
    kilometrageCamion: data.kilometrageCamion,
    motif: data.motif,
    notes: data.notes,
    lignes: lignesWithNames.map((l) => ({
      id: 0,
      pieceId: l.pieceId,
      quantite: l.quantite,
    })),
    createdBy: 0,
    createdAt: now.toISOString(),
  };
}

export default piecesOfflineService;
