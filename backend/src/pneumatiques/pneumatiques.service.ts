import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CataloguePneu, StockPneumatique, ControlePneumatique } from '../database/entities';

@Injectable()
export class PneumatiquesService {
  constructor(
    @InjectRepository(CataloguePneu)
    private catalogueRepo: Repository<CataloguePneu>,
    @InjectRepository(StockPneumatique)
    private stockRepo: Repository<StockPneumatique>,
    @InjectRepository(ControlePneumatique)
    private controleRepo: Repository<ControlePneumatique>,
  ) {}

  // Catalogue
  async getCatalogue(): Promise<CataloguePneu[]> {
    return this.catalogueRepo.find({
      where: { actif: true },
      order: { marque: 'ASC', reference: 'ASC' },
    });
  }

  async createCatalogue(data: Partial<CataloguePneu>): Promise<CataloguePneu> {
    const pneu = this.catalogueRepo.create(data);
    return this.catalogueRepo.save(pneu);
  }

  async updateCatalogue(id: number, data: Partial<CataloguePneu>): Promise<CataloguePneu> {
    await this.catalogueRepo.update(id, data);
    const updated = await this.catalogueRepo.findOne({ where: { id } });
    if (!updated) throw new NotFoundException('Pneu non trouvé');
    return updated;
  }

  // Stock
  async getStock(camionId?: number, statut?: string): Promise<StockPneumatique[]> {
    const query = this.stockRepo.createQueryBuilder('stock')
      .leftJoinAndSelect('stock.catalogue', 'catalogue')
      .leftJoinAndSelect('stock.camion', 'camion')
      .leftJoinAndSelect('stock.fournisseur', 'fournisseur')
      .orderBy('stock.createdAt', 'DESC');

    if (camionId) {
      query.andWhere('stock.camionId = :camionId', { camionId });
    }

    if (statut) {
      query.andWhere('stock.statut = :statut', { statut });
    }

    return query.getMany();
  }

  async getStockByCamion(camionId: number): Promise<StockPneumatique[]> {
    return this.stockRepo.find({
      where: { camionId },
      relations: ['catalogue', 'fournisseur'],
      order: { positionActuelle: 'ASC' },
    });
  }

  async getStockDisponible(): Promise<StockPneumatique[]> {
    return this.stockRepo.find({
      where: { camionId: null as any },
      relations: ['catalogue', 'fournisseur'],
    });
  }

  async getPneu(id: number): Promise<StockPneumatique> {
    const pneu = await this.stockRepo.findOne({
      where: { id },
      relations: ['catalogue', 'camion', 'fournisseur'],
    });
    if (!pneu) throw new NotFoundException('Pneu non trouvé');
    return pneu;
  }

  async createPneu(data: Partial<StockPneumatique>): Promise<StockPneumatique> {
    const pneu = this.stockRepo.create(data);
    return this.stockRepo.save(pneu);
  }

  async updatePneu(id: number, data: Partial<StockPneumatique>): Promise<StockPneumatique> {
    await this.stockRepo.update(id, data);
    return this.getPneu(id);
  }

  async installerPneu(
    pneuId: number,
    camionId: number,
    position: string,
    kmInstallation: number,
  ): Promise<StockPneumatique> {
    const pneu = await this.getPneu(pneuId);

    // Vérifier si un pneu est déjà à cette position
    const pneuExistant = await this.stockRepo.findOne({
      where: { camionId, positionActuelle: position as any },
    });

    if (pneuExistant && pneuExistant.id !== pneuId) {
      // Retirer l'ancien pneu
      await this.stockRepo.update(pneuExistant.id, {
        camionId: null as any,
        positionActuelle: null as any,
      });
    }

    // Installer le nouveau pneu
    await this.stockRepo.update(pneuId, {
      camionId,
      positionActuelle: position as any,
      kmInstallation,
      kmActuel: kmInstallation,
      statut: 'BON',
    });

    return this.getPneu(pneuId);
  }

  async retirerPneu(pneuId: number, statut?: string): Promise<StockPneumatique> {
    await this.stockRepo.update(pneuId, {
      camionId: null as any,
      positionActuelle: null as any,
      statut: (statut as any) || 'USE',
    });
    return this.getPneu(pneuId);
  }

  // Contrôles
  async getControles(pneuId?: number): Promise<ControlePneumatique[]> {
    const query = this.controleRepo.createQueryBuilder('controle')
      .leftJoinAndSelect('controle.pneu', 'pneu')
      .leftJoinAndSelect('pneu.catalogue', 'catalogue')
      .leftJoinAndSelect('pneu.camion', 'camion')
      .leftJoinAndSelect('controle.controleur', 'controleur')
      .orderBy('controle.dateControle', 'DESC');

    if (pneuId) {
      query.andWhere('controle.pneuId = :pneuId', { pneuId });
    }

    return query.getMany();
  }

  async createControle(data: Partial<ControlePneumatique>): Promise<ControlePneumatique> {
    const controle = this.controleRepo.create(data);
    const saved = await this.controleRepo.save(controle);

    // Mettre à jour le pneu avec les nouvelles valeurs
    if (data.pneuId) {
      const updates: Partial<StockPneumatique> = {};
      if (data.profondeurMesureeMm !== undefined) {
        updates.profondeurActuelleMm = data.profondeurMesureeMm;
      }
      if (data.kilometrage !== undefined) {
        updates.kmActuel = data.kilometrage;
      }
      if (data.etatVisuel) {
        updates.statut = data.etatVisuel;
      }
      if (Object.keys(updates).length > 0) {
        await this.stockRepo.update(data.pneuId, updates);
      }
    }

    return this.controleRepo.findOne({
      where: { id: saved.id },
      relations: ['pneu', 'pneu.catalogue', 'pneu.camion', 'controleur'],
    }) as Promise<ControlePneumatique>;
  }

  // Stats
  async getStats(): Promise<{
    total: number;
    enService: number;
    disponibles: number;
    aRemplacer: number;
    reformes: number;
  }> {
    const total = await this.stockRepo.count();
    const enService = await this.stockRepo.count({ where: { camionId: null as any } });
    const disponibles = await this.stockRepo
      .createQueryBuilder('stock')
      .where('stock.camionId IS NULL')
      .andWhere('stock.statut IN (:...statuts)', { statuts: ['NEUF', 'BON'] })
      .getCount();
    const aRemplacer = await this.stockRepo.count({ where: { statut: 'A_REMPLACER' } });
    const reformes = await this.stockRepo.count({ where: { statut: 'REFORME' } });

    return {
      total,
      enService: total - enService,
      disponibles,
      aRemplacer,
      reformes,
    };
  }
}
