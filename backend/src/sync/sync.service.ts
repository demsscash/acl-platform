import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';

import {
  DotationCarburant,
  SortieStock,
  LigneSortieStock,
  BonTransport,
  BonLocation,
  Panne,
  Camion,
  Chauffeur,
  Client,
  CuveCarburant,
  CataloguePiece,
  StockPiece,
  Fournisseur,
  StatutCamion,
} from '../database/entities';

import {
  SyncItemDto,
  SyncResultDto,
  SyncResultItemDto,
  SyncAllRequestDto,
  SyncAllResultDto,
  DotationSyncItemDto,
  SortieSyncItemDto,
  BonTransportSyncItemDto,
  BonLocationSyncItemDto,
  PanneSyncItemDto,
  ReferenceDataResponseDto,
} from './dto/sync.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(DotationCarburant)
    private readonly dotationRepository: Repository<DotationCarburant>,
    @InjectRepository(SortieStock)
    private readonly sortieRepository: Repository<SortieStock>,
    @InjectRepository(LigneSortieStock)
    private readonly ligneSortieRepository: Repository<LigneSortieStock>,
    @InjectRepository(BonTransport)
    private readonly bonTransportRepository: Repository<BonTransport>,
    @InjectRepository(BonLocation)
    private readonly bonLocationRepository: Repository<BonLocation>,
    @InjectRepository(Panne)
    private readonly panneRepository: Repository<Panne>,
    @InjectRepository(Camion)
    private readonly camionRepository: Repository<Camion>,
    @InjectRepository(Chauffeur)
    private readonly chauffeurRepository: Repository<Chauffeur>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(CuveCarburant)
    private readonly cuveRepository: Repository<CuveCarburant>,
    @InjectRepository(CataloguePiece)
    private readonly pieceRepository: Repository<CataloguePiece>,
    @InjectRepository(StockPiece)
    private readonly stockPieceRepository: Repository<StockPiece>,
    @InjectRepository(Fournisseur)
    private readonly fournisseurRepository: Repository<Fournisseur>,
  ) {}

  // ==================== SYNC ALL ====================

  async syncAll(data: SyncAllRequestDto, userId: number): Promise<SyncAllResultDto> {
    const syncedAt = new Date().toISOString();
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;

    const result: SyncAllResultDto = {
      success: true,
      syncedAt,
      totalProcessed: 0,
      totalSuccess: 0,
      totalErrors: 0,
    };

    // Process each entity type
    if (data.dotations && data.dotations.length > 0) {
      result.dotations = await this.syncDotations(data.dotations, userId);
      totalProcessed += result.dotations.totalProcessed;
      totalSuccess += result.dotations.successCount;
      totalErrors += result.dotations.errorCount;
    }

    if (data.sortiesStock && data.sortiesStock.length > 0) {
      result.sortiesStock = await this.syncSortiesStock(data.sortiesStock, userId);
      totalProcessed += result.sortiesStock.totalProcessed;
      totalSuccess += result.sortiesStock.successCount;
      totalErrors += result.sortiesStock.errorCount;
    }

    if (data.bonsTransport && data.bonsTransport.length > 0) {
      result.bonsTransport = await this.syncBonsTransport(data.bonsTransport, userId);
      totalProcessed += result.bonsTransport.totalProcessed;
      totalSuccess += result.bonsTransport.successCount;
      totalErrors += result.bonsTransport.errorCount;
    }

    if (data.bonsLocation && data.bonsLocation.length > 0) {
      result.bonsLocation = await this.syncBonsLocation(data.bonsLocation, userId);
      totalProcessed += result.bonsLocation.totalProcessed;
      totalSuccess += result.bonsLocation.successCount;
      totalErrors += result.bonsLocation.errorCount;
    }

    if (data.pannes && data.pannes.length > 0) {
      result.pannes = await this.syncPannes(data.pannes, userId);
      totalProcessed += result.pannes.totalProcessed;
      totalSuccess += result.pannes.successCount;
      totalErrors += result.pannes.errorCount;
    }

    result.totalProcessed = totalProcessed;
    result.totalSuccess = totalSuccess;
    result.totalErrors = totalErrors;
    result.success = totalErrors === 0;

    this.logger.log(`Sync completed: ${totalSuccess}/${totalProcessed} success, ${totalErrors} errors`);

    return result;
  }

  // ==================== DOTATIONS ====================

  async syncDotations(items: DotationSyncItemDto[], userId: number): Promise<SyncResultDto> {
    const results: SyncResultItemDto[] = [];
    const syncedAt = new Date().toISOString();

    for (const item of items) {
      try {
        let serverId: number;

        if (item.action === 'create') {
          const dotation = await this.createDotation(item.data, userId);
          serverId = dotation.id;
        } else if (item.action === 'update' && item.serverId) {
          await this.updateDotation(item.serverId, item.data);
          serverId = item.serverId;
        } else if (item.action === 'delete' && item.serverId) {
          await this.dotationRepository.delete(item.serverId);
          serverId = item.serverId;
        } else {
          throw new Error('Invalid action or missing serverId');
        }

        results.push({
          localId: item.localId,
          serverId,
          success: true,
        });
      } catch (error: any) {
        this.logger.error(`Sync dotation failed for localId ${item.localId}: ${error.message}`);
        results.push({
          localId: item.localId,
          serverId: item.serverId || 0,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: results.every((r) => r.success),
      syncedAt,
      results,
      totalProcessed: items.length,
      successCount: results.filter((r) => r.success).length,
      errorCount: results.filter((r) => !r.success).length,
    };
  }

  private async createDotation(data: any, userId: number): Promise<DotationCarburant> {
    // Generate numero bon
    const today = new Date();
    const prefix = `DOT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastDotation = await this.dotationRepository
      .createQueryBuilder('d')
      .where('d.numero_bon LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('d.numero_bon', 'DESC')
      .getOne();

    const nextNum = lastDotation
      ? parseInt(lastDotation.numeroBon.substring(prefix.length + 1)) + 1
      : 1;

    const numeroBon = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    // Update cuve level if from internal
    if (data.typeSource === 'CUVE_INTERNE' && data.cuveId) {
      const cuve = await this.cuveRepository.findOne({ where: { id: data.cuveId } });
      if (cuve) {
        const newLevel = Number(cuve.niveauActuelLitres) - Number(data.quantiteLitres);
        if (newLevel < 0) {
          throw new BadRequestException(`Stock insuffisant dans la cuve. Disponible: ${cuve.niveauActuelLitres}L`);
        }
        cuve.niveauActuelLitres = newLevel;
        await this.cuveRepository.save(cuve);
      }
    }

    const coutTotal = data.prixUnitaire
      ? Number(data.prixUnitaire) * Number(data.quantiteLitres)
      : undefined;

    const dotation = this.dotationRepository.create({
      ...data,
      numeroBon,
      coutTotal,
      createdBy: userId,
    });

    const saved = await this.dotationRepository.save(dotation);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  private async updateDotation(id: number, data: any): Promise<DotationCarburant> {
    const dotation = await this.dotationRepository.findOne({ where: { id } });
    if (!dotation) {
      throw new Error(`Dotation ${id} not found`);
    }

    Object.assign(dotation, data);
    const saved = await this.dotationRepository.save(dotation);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  // ==================== SORTIES STOCK ====================

  async syncSortiesStock(items: SortieSyncItemDto[], userId: number): Promise<SyncResultDto> {
    const results: SyncResultItemDto[] = [];
    const syncedAt = new Date().toISOString();

    for (const item of items) {
      try {
        let serverId: number;

        if (item.action === 'create') {
          const sortie = await this.createSortieStock(item.data, userId);
          serverId = sortie.id;
        } else if (item.action === 'update' && item.serverId) {
          await this.updateSortieStock(item.serverId, item.data);
          serverId = item.serverId;
        } else if (item.action === 'delete' && item.serverId) {
          await this.sortieRepository.delete(item.serverId);
          serverId = item.serverId;
        } else {
          throw new Error('Invalid action or missing serverId');
        }

        results.push({
          localId: item.localId,
          serverId,
          success: true,
        });
      } catch (error: any) {
        this.logger.error(`Sync sortie stock failed for localId ${item.localId}: ${error.message}`);
        results.push({
          localId: item.localId,
          serverId: item.serverId || 0,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: results.every((r) => r.success),
      syncedAt,
      results,
      totalProcessed: items.length,
      successCount: results.filter((r) => r.success).length,
      errorCount: results.filter((r) => !r.success).length,
    };
  }

  private async createSortieStock(data: any, userId: number): Promise<SortieStock> {
    // Generate numero bon
    const today = new Date();
    const prefix = `SOR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastSortie = await this.sortieRepository
      .createQueryBuilder('s')
      .where('s.numero_bon LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('s.numero_bon', 'DESC')
      .getOne();

    const nextNum = lastSortie
      ? parseInt(lastSortie.numeroBon.substring(prefix.length + 1)) + 1
      : 1;

    const numeroBon = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    // Update stock levels for each ligne
    for (const ligne of data.lignes || []) {
      const stockPiece = await this.stockPieceRepository.findOne({
        where: { pieceId: ligne.pieceId },
      });
      if (stockPiece) {
        const newQty = Number(stockPiece.quantiteDisponible) - Number(ligne.quantite);
        if (newQty < 0) {
          throw new BadRequestException(`Stock insuffisant pour pièce ${ligne.pieceId}`);
        }
        stockPiece.quantiteDisponible = newQty;
        await this.stockPieceRepository.save(stockPiece);
      }
    }

    const sortie = this.sortieRepository.create({
      ...data,
      numeroBon,
      createdBy: userId,
      lignes: data.lignes?.map((l: any) => ({
        pieceId: l.pieceId,
        quantite: l.quantite,
      })),
    });

    const saved = await this.sortieRepository.save(sortie);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  private async updateSortieStock(id: number, data: any): Promise<SortieStock> {
    const sortie = await this.sortieRepository.findOne({ where: { id } });
    if (!sortie) {
      throw new Error(`Sortie stock ${id} not found`);
    }

    Object.assign(sortie, data);
    const saved = await this.sortieRepository.save(sortie);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  // ==================== BONS TRANSPORT ====================

  async syncBonsTransport(items: BonTransportSyncItemDto[], userId: number): Promise<SyncResultDto> {
    const results: SyncResultItemDto[] = [];
    const syncedAt = new Date().toISOString();

    for (const item of items) {
      try {
        let serverId: number;

        if (item.action === 'create') {
          const bon = await this.createBonTransport(item.data, userId);
          serverId = bon.id;
        } else if (item.action === 'update' && item.serverId) {
          await this.updateBonTransport(item.serverId, item.data);
          serverId = item.serverId;
        } else if (item.action === 'delete' && item.serverId) {
          await this.bonTransportRepository.delete(item.serverId);
          serverId = item.serverId;
        } else {
          throw new Error('Invalid action or missing serverId');
        }

        results.push({
          localId: item.localId,
          serverId,
          success: true,
        });
      } catch (error: any) {
        this.logger.error(`Sync bon transport failed for localId ${item.localId}: ${error.message}`);
        results.push({
          localId: item.localId,
          serverId: item.serverId || 0,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: results.every((r) => r.success),
      syncedAt,
      results,
      totalProcessed: items.length,
      successCount: results.filter((r) => r.success).length,
      errorCount: results.filter((r) => !r.success).length,
    };
  }

  private async createBonTransport(data: any, userId: number): Promise<BonTransport> {
    // Generate numero
    const today = new Date();
    const prefix = `BT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastBon = await this.bonTransportRepository
      .createQueryBuilder('b')
      .where('b.numero LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('b.numero', 'DESC')
      .getOne();

    const nextNum = lastBon
      ? parseInt(lastBon.numero.substring(prefix.length + 1)) + 1
      : 1;

    const numero = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    const bon = this.bonTransportRepository.create({
      ...data,
      numero,
      createdBy: userId,
    });

    const saved = await this.bonTransportRepository.save(bon);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  private async updateBonTransport(id: number, data: any): Promise<BonTransport> {
    const bon = await this.bonTransportRepository.findOne({ where: { id } });
    if (!bon) {
      throw new Error(`Bon transport ${id} not found`);
    }

    Object.assign(bon, data);
    const saved = await this.bonTransportRepository.save(bon);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  // ==================== BONS LOCATION ====================

  async syncBonsLocation(items: BonLocationSyncItemDto[], userId: number): Promise<SyncResultDto> {
    const results: SyncResultItemDto[] = [];
    const syncedAt = new Date().toISOString();

    for (const item of items) {
      try {
        let serverId: number;

        if (item.action === 'create') {
          const bon = await this.createBonLocation(item.data, userId);
          serverId = bon.id;
        } else if (item.action === 'update' && item.serverId) {
          await this.updateBonLocation(item.serverId, item.data);
          serverId = item.serverId;
        } else if (item.action === 'delete' && item.serverId) {
          await this.bonLocationRepository.delete(item.serverId);
          serverId = item.serverId;
        } else {
          throw new Error('Invalid action or missing serverId');
        }

        results.push({
          localId: item.localId,
          serverId,
          success: true,
        });
      } catch (error: any) {
        this.logger.error(`Sync bon location failed for localId ${item.localId}: ${error.message}`);
        results.push({
          localId: item.localId,
          serverId: item.serverId || 0,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: results.every((r) => r.success),
      syncedAt,
      results,
      totalProcessed: items.length,
      successCount: results.filter((r) => r.success).length,
      errorCount: results.filter((r) => !r.success).length,
    };
  }

  private async createBonLocation(data: any, userId: number): Promise<BonLocation> {
    // Generate numero
    const today = new Date();
    const prefix = `BL-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastBon = await this.bonLocationRepository
      .createQueryBuilder('b')
      .where('b.numero LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('b.numero', 'DESC')
      .getOne();

    const nextNum = lastBon
      ? parseInt(lastBon.numero.substring(prefix.length + 1)) + 1
      : 1;

    const numero = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    const bon = this.bonLocationRepository.create({
      ...data,
      numero,
      createdBy: userId,
    });

    const saved = await this.bonLocationRepository.save(bon);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  private async updateBonLocation(id: number, data: any): Promise<BonLocation> {
    const bon = await this.bonLocationRepository.findOne({ where: { id } });
    if (!bon) {
      throw new Error(`Bon location ${id} not found`);
    }

    Object.assign(bon, data);
    const saved = await this.bonLocationRepository.save(bon);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  // ==================== PANNES ====================

  async syncPannes(items: PanneSyncItemDto[], userId: number): Promise<SyncResultDto> {
    const results: SyncResultItemDto[] = [];
    const syncedAt = new Date().toISOString();

    for (const item of items) {
      try {
        let serverId: number;

        if (item.action === 'create') {
          const panne = await this.createPanne(item.data, userId);
          serverId = panne.id;
        } else if (item.action === 'update' && item.serverId) {
          await this.updatePanne(item.serverId, item.data);
          serverId = item.serverId;
        } else if (item.action === 'delete' && item.serverId) {
          await this.panneRepository.delete(item.serverId);
          serverId = item.serverId;
        } else {
          throw new Error('Invalid action or missing serverId');
        }

        results.push({
          localId: item.localId,
          serverId,
          success: true,
        });
      } catch (error: any) {
        this.logger.error(`Sync panne failed for localId ${item.localId}: ${error.message}`);
        results.push({
          localId: item.localId,
          serverId: item.serverId || 0,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      success: results.every((r) => r.success),
      syncedAt,
      results,
      totalProcessed: items.length,
      successCount: results.filter((r) => r.success).length,
      errorCount: results.filter((r) => !r.success).length,
    };
  }

  private async createPanne(data: any, userId: number): Promise<Panne> {
    // Generate numero
    const today = new Date();
    const prefix = `PAN-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastPanne = await this.panneRepository
      .createQueryBuilder('p')
      .where('p.numero_panne LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('p.numero_panne', 'DESC')
      .getOne();

    const nextNum = lastPanne
      ? parseInt(lastPanne.numeroPanne.substring(prefix.length + 1)) + 1
      : 1;

    const numeroPanne = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    // Update camion status to HORS_SERVICE
    const camion = await this.camionRepository.findOne({ where: { id: data.camionId } });
    if (camion) {
      camion.statut = StatutCamion.HORS_SERVICE;
      await this.camionRepository.save(camion);
    }

    const panne = this.panneRepository.create({
      ...data,
      numeroPanne,
      createdBy: userId,
    });

    const saved = await this.panneRepository.save(panne);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  private async updatePanne(id: number, data: any): Promise<Panne> {
    const panne = await this.panneRepository.findOne({ where: { id } });
    if (!panne) {
      throw new Error(`Panne ${id} not found`);
    }

    Object.assign(panne, data);
    const saved = await this.panneRepository.save(panne);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  // ==================== REFERENCE DATA ====================

  async getReferenceData(lastSyncAt?: string): Promise<ReferenceDataResponseDto> {
    const syncedAt = new Date().toISOString();
    const filter = lastSyncAt ? { updatedAt: MoreThan(new Date(lastSyncAt)) } : {};

    const [camions, chauffeurs, clients, cuves, pieces, fournisseurs] = await Promise.all([
      this.camionRepository.find({ where: { actif: true, ...filter }, order: { numeroInterne: 'ASC' } }),
      this.chauffeurRepository.find({ where: { actif: true, ...filter }, order: { nom: 'ASC' } }),
      this.clientRepository.find({ where: { actif: true, ...filter }, order: { raisonSociale: 'ASC' } }),
      this.cuveRepository.find({ where: { actif: true, ...filter }, order: { nom: 'ASC' } }),
      this.pieceRepository.find({ where: { actif: true, ...filter }, order: { designation: 'ASC' } }),
      this.fournisseurRepository.find({ where: { actif: true, ...filter }, order: { raisonSociale: 'ASC' } }),
    ]);

    return {
      syncedAt,
      camions,
      chauffeurs,
      clients,
      cuves,
      pieces,
      fournisseurs,
    };
  }

  // ==================== SYNC STATUS ====================

  async getServerStatus(): Promise<{
    status: string;
    timestamp: string;
    version: string;
  }> {
    return {
      status: 'online',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
