import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import {
  CataloguePiece,
  StockPiece,
  SortieStock,
  LigneSortieStock,
  MotifSortie,
  EntreeStock,
  LigneEntreeStock,
  TypeEntree,
  Fournisseur,
  MouvementPiece,
  TypeMouvementPiece,
  EtatPiece,
  Camion,
} from '../database/entities';

interface CreateSortieDto {
  camionId: number;
  dateSortie?: Date;
  kilometrageCamion?: number;
  motif: MotifSortie;
  panneId?: number;
  notes?: string;
  lignes: {
    pieceId: number;
    quantite: number;
    emplacement?: string;
  }[];
}

interface CreateEntreeDto {
  dateEntree?: Date;
  typeEntree: TypeEntree;
  fournisseurId?: number;
  fournisseurAutre?: string;
  numeroFacture?: string;
  numeroBL?: string;
  notes?: string;
  lignes: {
    pieceId: number;
    quantite: number;
    prixUnitaire?: number;
    emplacement?: string;
  }[];
}

// DTO pour les mouvements de pièces
interface CreateMouvementDto {
  typeMouvement: TypeMouvementPiece;
  pieceId: number;
  quantite: number;
  etatPiece?: EtatPiece;
  camionSourceId?: number;
  camionDestinationId?: number;
  kilometrageSource?: number;
  kilometrageDestination?: number;
  sortieStockId?: number;
  maintenanceId?: number;
  motif?: string;
  description?: string;
  cout?: number;
}

interface MouvementFilters {
  pieceId?: number;
  camionId?: number;
  typeMouvement?: TypeMouvementPiece;
  dateDebut?: string;
  dateFin?: string;
}

@Injectable()
export class PiecesService {
  constructor(
    @InjectRepository(CataloguePiece)
    private readonly catalogueRepository: Repository<CataloguePiece>,
    @InjectRepository(StockPiece)
    private readonly stockRepository: Repository<StockPiece>,
    @InjectRepository(SortieStock)
    private readonly sortieRepository: Repository<SortieStock>,
    @InjectRepository(LigneSortieStock)
    private readonly ligneSortieRepository: Repository<LigneSortieStock>,
    @InjectRepository(EntreeStock)
    private readonly entreeRepository: Repository<EntreeStock>,
    @InjectRepository(LigneEntreeStock)
    private readonly ligneEntreeRepository: Repository<LigneEntreeStock>,
    @InjectRepository(Fournisseur)
    private readonly fournisseurRepository: Repository<Fournisseur>,
    @InjectRepository(MouvementPiece)
    private readonly mouvementRepository: Repository<MouvementPiece>,
    @InjectRepository(Camion)
    private readonly camionRepository: Repository<Camion>,
  ) {}

  // Catalogue
  async findAllPieces(): Promise<CataloguePiece[]> {
    return this.catalogueRepository.find({
      where: { actif: true },
      order: { designation: 'ASC' },
    });
  }

  async findOnePiece(id: number): Promise<CataloguePiece> {
    const piece = await this.catalogueRepository.findOne({ where: { id } });
    if (!piece) {
      throw new NotFoundException(`Pièce #${id} non trouvée`);
    }
    return piece;
  }

  async createPiece(data: Partial<CataloguePiece>): Promise<CataloguePiece> {
    // Auto-generate numeroPiece if not provided
    if (!data.numeroPiece) {
      data.numeroPiece = await this.generateNumeroPiece();
    }
    const piece = this.catalogueRepository.create(data);
    return this.catalogueRepository.save(piece);
  }

  private async generateNumeroPiece(): Promise<string> {
    const lastPiece = await this.catalogueRepository
      .createQueryBuilder('p')
      .where('p.numero_piece IS NOT NULL')
      .orderBy('p.numero_piece', 'DESC')
      .getOne();

    let nextNum = 1;
    if (lastPiece && lastPiece.numeroPiece) {
      const match = lastPiece.numeroPiece.match(/PCS-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }

    return `PCS-${String(nextNum).padStart(5, '0')}`;
  }

  async updatePiece(id: number, data: Partial<CataloguePiece>): Promise<CataloguePiece> {
    const piece = await this.findOnePiece(id);
    Object.assign(piece, data);
    return this.catalogueRepository.save(piece);
  }

  // Stock
  async getStock(): Promise<StockPiece[]> {
    return this.stockRepository.find({
      relations: ['piece'],
      order: { pieceId: 'ASC' },
    });
  }

  async getStockByPiece(pieceId: number): Promise<StockPiece[]> {
    return this.stockRepository.find({
      where: { pieceId },
      relations: ['piece'],
    });
  }

  async updateStock(pieceId: number, quantite: number, emplacement?: string): Promise<StockPiece> {
    const whereClause: any = { pieceId };
    if (emplacement) {
      whereClause.emplacement = emplacement;
    }
    let stock = await this.stockRepository.findOne({
      where: whereClause,
    });

    if (!stock) {
      stock = this.stockRepository.create({
        pieceId,
        emplacement,
        quantiteDisponible: 0,
      });
    }

    stock.quantiteDisponible += quantite;
    stock.dernierMouvementAt = new Date();

    if (stock.quantiteDisponible < 0) {
      throw new BadRequestException('Stock insuffisant');
    }

    return this.stockRepository.save(stock);
  }

  // Stats
  async getPiecesEnAlerte(): Promise<any[]> {
    const pieces = await this.catalogueRepository.find({ where: { actif: true } });
    const alertes: any[] = [];

    for (const piece of pieces) {
      const stocks = await this.getStockByPiece(piece.id);
      const totalStock = stocks.reduce((sum, s) => sum + s.quantiteDisponible, 0);

      if (totalStock <= piece.stockMinimum) {
        alertes.push({
          piece,
          stockActuel: totalStock,
          stockMinimum: piece.stockMinimum,
        });
      }
    }

    return alertes;
  }

  // Sorties de stock
  async findAllSorties(): Promise<SortieStock[]> {
    return this.sortieRepository.find({
      relations: ['camion', 'createur', 'lignes', 'lignes.piece'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneSortie(id: number): Promise<SortieStock> {
    const sortie = await this.sortieRepository.findOne({
      where: { id },
      relations: ['camion', 'createur', 'lignes', 'lignes.piece'],
    });
    if (!sortie) {
      throw new NotFoundException(`Sortie #${id} non trouvée`);
    }
    return sortie;
  }

  async findSortiesByCamion(camionId: number): Promise<SortieStock[]> {
    return this.sortieRepository.find({
      where: { camionId },
      relations: ['createur', 'lignes', 'lignes.piece'],
      order: { dateSortie: 'DESC' },
    });
  }

  async createSortie(data: CreateSortieDto, userId: number): Promise<SortieStock> {
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

    // Verify stock availability for all pieces
    for (const ligne of data.lignes) {
      const stocks = await this.getStockByPiece(ligne.pieceId);
      const totalStock = stocks.reduce((sum, s) => sum + s.quantiteDisponible, 0);

      if (totalStock < ligne.quantite) {
        const piece = await this.findOnePiece(ligne.pieceId);
        throw new BadRequestException(
          `Stock insuffisant pour ${piece.designation}: disponible ${totalStock}, demandé ${ligne.quantite}`
        );
      }
    }

    // Create sortie
    const sortie = this.sortieRepository.create({
      numeroBon,
      dateSortie: data.dateSortie || new Date(),
      camionId: data.camionId,
      kilometrageCamion: data.kilometrageCamion,
      motif: data.motif,
      panneId: data.panneId,
      notes: data.notes,
      createdBy: userId,
    });

    const savedSortie = await this.sortieRepository.save(sortie);

    // Create lignes and update stock
    for (const ligneData of data.lignes) {
      const ligne = this.ligneSortieRepository.create({
        sortieId: savedSortie.id,
        pieceId: ligneData.pieceId,
        quantite: ligneData.quantite,
        emplacement: ligneData.emplacement,
      });

      await this.ligneSortieRepository.save(ligne);

      // Decrease stock
      await this.updateStock(ligneData.pieceId, -ligneData.quantite, ligneData.emplacement);
    }

    return this.findOneSortie(savedSortie.id);
  }

  async getSortiesStats(): Promise<{
    total: number;
    ceMois: number;
    parMotif: Record<string, number>;
  }> {
    const sorties = await this.sortieRepository.find({
      relations: ['lignes'],
    });

    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

    const ceMois = sorties.filter(
      (s) => new Date(s.dateSortie) >= debutMois
    ).length;

    const parMotif: Record<string, number> = {};
    for (const sortie of sorties) {
      parMotif[sortie.motif] = (parMotif[sortie.motif] || 0) + 1;
    }

    return {
      total: sorties.length,
      ceMois,
      parMotif,
    };
  }

  // Entrées de stock
  async findAllEntrees(): Promise<EntreeStock[]> {
    return this.entreeRepository.find({
      relations: ['fournisseur', 'createur', 'lignes', 'lignes.piece'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneEntree(id: number): Promise<EntreeStock> {
    const entree = await this.entreeRepository.findOne({
      where: { id },
      relations: ['fournisseur', 'createur', 'lignes', 'lignes.piece'],
    });
    if (!entree) {
      throw new NotFoundException(`Entrée #${id} non trouvée`);
    }
    return entree;
  }

  async createEntree(data: CreateEntreeDto, userId: number): Promise<EntreeStock> {
    // Generate numero bon
    const today = new Date();
    const prefix = `ENT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastEntree = await this.entreeRepository
      .createQueryBuilder('e')
      .where('e.numero_bon LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('e.numero_bon', 'DESC')
      .getOne();

    const nextNum = lastEntree
      ? parseInt(lastEntree.numeroBon.substring(prefix.length + 1)) + 1
      : 1;

    const numeroBon = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    // Handle fournisseur: either from database or external (autre)
    const fournisseurId = data.fournisseurId && data.fournisseurId > 0 ? data.fournisseurId : null;
    const fournisseurAutre = !fournisseurId ? data.fournisseurAutre : null;

    // Create entree
    const entree = this.entreeRepository.create({
      numeroBon,
      dateEntree: data.dateEntree || new Date(),
      typeEntree: data.typeEntree,
      fournisseurId,
      fournisseurAutre,
      numeroFacture: data.numeroFacture,
      numeroBL: data.numeroBL,
      notes: data.notes,
      createdBy: userId,
    } as Partial<EntreeStock>);

    const savedEntree = await this.entreeRepository.save(entree) as EntreeStock;

    // Create lignes and update stock
    for (const ligneData of data.lignes) {
      const ligne = this.ligneEntreeRepository.create({
        entreeId: savedEntree.id,
        pieceId: ligneData.pieceId,
        quantite: ligneData.quantite,
        prixUnitaire: ligneData.prixUnitaire,
        emplacement: ligneData.emplacement,
      });

      await this.ligneEntreeRepository.save(ligne);

      // Increase stock
      await this.updateStock(ligneData.pieceId, ligneData.quantite, ligneData.emplacement);

      // Update piece average price if provided
      if (ligneData.prixUnitaire) {
        const piece = await this.findOnePiece(ligneData.pieceId);
        if (!piece.prixUnitaireMoyen) {
          piece.prixUnitaireMoyen = ligneData.prixUnitaire;
        } else {
          // Simple average update
          piece.prixUnitaireMoyen = (piece.prixUnitaireMoyen + ligneData.prixUnitaire) / 2;
        }
        await this.catalogueRepository.save(piece);
      }
    }

    return this.findOneEntree(savedEntree.id);
  }

  async getEntreesStats(): Promise<{
    total: number;
    ceMois: number;
    parType: Record<string, number>;
  }> {
    const entrees = await this.entreeRepository.find({
      relations: ['lignes'],
    });

    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

    const ceMois = entrees.filter(
      (e) => new Date(e.dateEntree) >= debutMois
    ).length;

    const parType: Record<string, number> = {};
    for (const entree of entrees) {
      parType[entree.typeEntree] = (parType[entree.typeEntree] || 0) + 1;
    }

    return {
      total: entrees.length,
      ceMois,
      parType,
    };
  }

  // Fournisseurs
  async findAllFournisseurs(): Promise<Fournisseur[]> {
    return this.fournisseurRepository.find({
      where: { actif: true },
      order: { raisonSociale: 'ASC' },
    });
  }

  async createFournisseur(data: Partial<Fournisseur>): Promise<Fournisseur> {
    // Generate code if not provided
    if (!data.code) {
      const lastFournisseur = await this.fournisseurRepository
        .createQueryBuilder('f')
        .orderBy('f.id', 'DESC')
        .getOne();
      const nextNum = lastFournisseur ? lastFournisseur.id + 1 : 1;
      data.code = `FOUR-${String(nextNum).padStart(4, '0')}`;
    }
    const fournisseur = this.fournisseurRepository.create(data);
    return this.fournisseurRepository.save(fournisseur);
  }

  async updateFournisseur(id: number, data: Partial<Fournisseur>): Promise<Fournisseur> {
    const fournisseur = await this.fournisseurRepository.findOne({ where: { id } });
    if (!fournisseur) {
      throw new NotFoundException(`Fournisseur #${id} non trouvé`);
    }
    Object.assign(fournisseur, data);
    return this.fournisseurRepository.save(fournisseur);
  }

  async deleteFournisseur(id: number): Promise<void> {
    const fournisseur = await this.fournisseurRepository.findOne({ where: { id } });
    if (!fournisseur) {
      throw new NotFoundException(`Fournisseur #${id} non trouvé`);
    }
    // Soft delete - just mark as inactive
    fournisseur.actif = false;
    await this.fournisseurRepository.save(fournisseur);
  }

  // Historique des mouvements
  async getHistoriqueMouvements(pieceId?: number): Promise<any[]> {
    const mouvements: any[] = [];

    // Get all entry lines
    const lignesEntree = await this.ligneEntreeRepository.find({
      where: pieceId ? { pieceId } : {},
      relations: ['piece', 'entree', 'entree.fournisseur', 'entree.createur'],
    });

    for (const ligne of lignesEntree) {
      mouvements.push({
        id: `ENT-${ligne.id}`,
        type: 'ENTREE',
        date: ligne.entree.dateEntree,
        numeroBon: ligne.entree.numeroBon,
        pieceId: ligne.pieceId,
        piece: ligne.piece,
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire,
        typeEntree: ligne.entree.typeEntree,
        fournisseur: ligne.entree.fournisseur,
        createur: ligne.entree.createur,
      });
    }

    // Get all exit lines
    const lignesSortie = await this.ligneSortieRepository.find({
      where: pieceId ? { pieceId } : {},
      relations: ['piece', 'sortie', 'sortie.camion', 'sortie.createur'],
    });

    for (const ligne of lignesSortie) {
      mouvements.push({
        id: `SOR-${ligne.id}`,
        type: 'SORTIE',
        date: ligne.sortie.dateSortie,
        numeroBon: ligne.sortie.numeroBon,
        pieceId: ligne.pieceId,
        piece: ligne.piece,
        quantite: -ligne.quantite,
        motif: ligne.sortie.motif,
        camion: ligne.sortie.camion,
        createur: ligne.sortie.createur,
      });
    }

    // Sort by date descending
    mouvements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return mouvements;
  }

  // Inventaire - Ajustement de stock
  async ajusterStock(
    pieceId: number,
    nouvelleQuantite: number,
    motif: string,
    userId: number,
    emplacement?: string,
  ): Promise<StockPiece> {
    const piece = await this.findOnePiece(pieceId);
    const stocks = await this.getStockByPiece(pieceId);
    const stockActuel = stocks.reduce((sum, s) => sum + s.quantiteDisponible, 0);
    const difference = nouvelleQuantite - stockActuel;

    if (difference === 0) {
      throw new BadRequestException('La quantité est déjà à ce niveau');
    }

    // Create an inventory entry/exit based on difference
    const today = new Date();

    if (difference > 0) {
      // Create an entry for positive adjustment
      const prefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
      const lastEntree = await this.entreeRepository
        .createQueryBuilder('e')
        .where('e.numero_bon LIKE :prefix', { prefix: `${prefix}%` })
        .orderBy('e.numero_bon', 'DESC')
        .getOne();
      const nextNum = lastEntree ? parseInt(lastEntree.numeroBon.substring(prefix.length + 1)) + 1 : 1;
      const numeroBon = `${prefix}-${String(nextNum).padStart(4, '0')}`;

      const entree = this.entreeRepository.create({
        numeroBon,
        dateEntree: today,
        typeEntree: TypeEntree.INVENTAIRE,
        notes: motif,
        createdBy: userId,
      });
      const savedEntree = await this.entreeRepository.save(entree);

      const ligne = this.ligneEntreeRepository.create({
        entreeId: savedEntree.id,
        pieceId,
        quantite: difference,
        emplacement,
      });
      await this.ligneEntreeRepository.save(ligne);
    } else {
      // Create an exit for negative adjustment (use absolute value)
      const prefix = `ADJ-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
      const lastSortie = await this.sortieRepository
        .createQueryBuilder('s')
        .where('s.numero_bon LIKE :prefix', { prefix: `${prefix}%` })
        .orderBy('s.numero_bon', 'DESC')
        .getOne();
      const nextNum = lastSortie ? parseInt(lastSortie.numeroBon.substring(prefix.length + 1)) + 1 : 1;
      const numeroBon = `${prefix}-${String(nextNum).padStart(4, '0')}`;

      const sortie = this.sortieRepository.create({
        numeroBon,
        dateSortie: today,
        motif: MotifSortie.AUTRE,
        notes: `Ajustement inventaire: ${motif}`,
        createdBy: userId,
      });
      const savedSortie = await this.sortieRepository.save(sortie);

      const ligne = this.ligneSortieRepository.create({
        sortieId: savedSortie.id,
        pieceId,
        quantite: Math.abs(difference),
        emplacement,
      });
      await this.ligneSortieRepository.save(ligne);
    }

    // Update the actual stock
    return this.updateStock(pieceId, difference, emplacement);
  }

  // ===== MOUVEMENTS DE PIECES (Traçabilité) =====

  // Generate unique numero for mouvement
  private async generateNumeroMouvement(): Promise<string> {
    const today = new Date();
    const prefix = `MOV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastMouvement = await this.mouvementRepository
      .createQueryBuilder('m')
      .where('m.numero_mouvement LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('m.numero_mouvement', 'DESC')
      .getOne();

    const nextNum = lastMouvement
      ? parseInt(lastMouvement.numeroMouvement.substring(prefix.length + 1)) + 1
      : 1;

    return `${prefix}-${String(nextNum).padStart(4, '0')}`;
  }

  // Get all mouvements with filters
  async findAllMouvements(filters: MouvementFilters = {}): Promise<MouvementPiece[]> {
    const query = this.mouvementRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.piece', 'piece')
      .leftJoinAndSelect('m.camionSource', 'camionSource')
      .leftJoinAndSelect('m.camionDestination', 'camionDestination')
      .leftJoinAndSelect('m.createur', 'createur');

    if (filters.pieceId) {
      query.andWhere('m.pieceId = :pieceId', { pieceId: filters.pieceId });
    }

    if (filters.camionId) {
      query.andWhere(
        '(m.camionSourceId = :camionId OR m.camionDestinationId = :camionId)',
        { camionId: filters.camionId }
      );
    }

    if (filters.typeMouvement) {
      query.andWhere('m.typeMouvement = :typeMouvement', { typeMouvement: filters.typeMouvement });
    }

    if (filters.dateDebut && filters.dateFin) {
      query.andWhere('m.dateMouvement BETWEEN :dateDebut AND :dateFin', {
        dateDebut: filters.dateDebut,
        dateFin: filters.dateFin,
      });
    }

    return query.orderBy('m.dateMouvement', 'DESC').take(200).getMany();
  }

  // Get mouvement by ID
  async findOneMouvement(id: number): Promise<MouvementPiece> {
    const mouvement = await this.mouvementRepository.findOne({
      where: { id },
      relations: ['piece', 'camionSource', 'camionDestination', 'createur'],
    });
    if (!mouvement) {
      throw new NotFoundException(`Mouvement #${id} non trouvé`);
    }
    return mouvement;
  }

  // Get mouvements for a specific camion (traçabilité)
  async findMouvementsByCamion(camionId: number): Promise<MouvementPiece[]> {
    return this.mouvementRepository.find({
      where: [
        { camionSourceId: camionId },
        { camionDestinationId: camionId },
      ],
      relations: ['piece', 'camionSource', 'camionDestination', 'createur'],
      order: { dateMouvement: 'DESC' },
    });
  }

  // Get mouvements for a specific piece (historique complet)
  async findMouvementsByPiece(pieceId: number): Promise<MouvementPiece[]> {
    return this.mouvementRepository.find({
      where: { pieceId },
      relations: ['piece', 'camionSource', 'camionDestination', 'createur'],
      order: { dateMouvement: 'DESC' },
    });
  }

  // Create a mouvement (internal method)
  async createMouvement(data: CreateMouvementDto, userId: number): Promise<MouvementPiece> {
    const numeroMouvement = await this.generateNumeroMouvement();

    const mouvement = this.mouvementRepository.create({
      numeroMouvement,
      ...data,
      createdBy: userId,
    });

    return this.mouvementRepository.save(mouvement);
  }

  // INTERCHANGE: Transfer piece from one camion to another
  async interchangePiece(
    pieceId: number,
    camionSourceId: number,
    camionDestinationId: number,
    quantite: number,
    etatPiece: EtatPiece,
    motif: string,
    userId: number,
    kilometrageSource?: number,
    kilometrageDestination?: number,
    description?: string,
  ): Promise<MouvementPiece> {
    // Verify piece exists
    const piece = await this.findOnePiece(pieceId);

    // Verify camions exist
    const camionSource = await this.camionRepository.findOne({ where: { id: camionSourceId } });
    if (!camionSource) {
      throw new NotFoundException(`Camion source #${camionSourceId} non trouvé`);
    }

    const camionDestination = await this.camionRepository.findOne({ where: { id: camionDestinationId } });
    if (!camionDestination) {
      throw new NotFoundException(`Camion destination #${camionDestinationId} non trouvé`);
    }

    if (camionSourceId === camionDestinationId) {
      throw new BadRequestException('Le camion source et destination ne peuvent pas être identiques');
    }

    // Create interchange mouvement
    const mouvement = await this.createMouvement({
      typeMouvement: TypeMouvementPiece.INTERCHANGE,
      pieceId,
      quantite,
      etatPiece,
      camionSourceId,
      camionDestinationId,
      kilometrageSource,
      kilometrageDestination,
      motif,
      description,
      cout: piece.prixUnitaireMoyen || 0,
    }, userId);

    return this.findOneMouvement(mouvement.id);
  }

  // Install piece on a camion (from stock)
  async installerPieceSurCamion(
    pieceId: number,
    camionId: number,
    quantite: number,
    etatPiece: EtatPiece,
    motif: string,
    userId: number,
    sortieStockId?: number,
    kilometrage?: number,
    description?: string,
  ): Promise<MouvementPiece> {
    const piece = await this.findOnePiece(pieceId);
    const camion = await this.camionRepository.findOne({ where: { id: camionId } });
    if (!camion) {
      throw new NotFoundException(`Camion #${camionId} non trouvé`);
    }

    // Create installation mouvement
    const mouvement = await this.createMouvement({
      typeMouvement: TypeMouvementPiece.INSTALLATION,
      pieceId,
      quantite,
      etatPiece,
      camionDestinationId: camionId,
      kilometrageDestination: kilometrage,
      sortieStockId,
      motif,
      description,
      cout: (piece.prixUnitaireMoyen || 0) * quantite,
    }, userId);

    return this.findOneMouvement(mouvement.id);
  }

  // Uninstall piece from a camion
  async desinstallerPieceDeCamion(
    pieceId: number,
    camionId: number,
    quantite: number,
    etatPiece: EtatPiece,
    motif: string,
    userId: number,
    returnToStock: boolean,
    kilometrage?: number,
    description?: string,
  ): Promise<MouvementPiece> {
    const piece = await this.findOnePiece(pieceId);
    const camion = await this.camionRepository.findOne({ where: { id: camionId } });
    if (!camion) {
      throw new NotFoundException(`Camion #${camionId} non trouvé`);
    }

    // Create desinstallation mouvement
    const mouvement = await this.createMouvement({
      typeMouvement: TypeMouvementPiece.DESINSTALLATION,
      pieceId,
      quantite,
      etatPiece,
      camionSourceId: camionId,
      kilometrageSource: kilometrage,
      motif,
      description,
    }, userId);

    // If returning to stock, update stock and create return mouvement
    if (returnToStock && etatPiece !== EtatPiece.DEFECTUEUSE) {
      await this.updateStock(pieceId, quantite);
      await this.createMouvement({
        typeMouvement: TypeMouvementPiece.RETOUR_STOCK,
        pieceId,
        quantite,
        etatPiece,
        camionSourceId: camionId,
        motif: 'Retour au stock après désinstallation',
        description,
      }, userId);
    }

    return this.findOneMouvement(mouvement.id);
  }

  // Get pieces currently installed on a camion
  async getPiecesInstallesSurCamion(camionId: number): Promise<any[]> {
    // Get all mouvements for this camion
    const mouvements = await this.mouvementRepository.find({
      where: [
        { camionDestinationId: camionId },
        { camionSourceId: camionId },
      ],
      relations: ['piece'],
      order: { dateMouvement: 'ASC' },
    });

    // Calculate current state for each piece
    const piecesMap = new Map<number, { piece: CataloguePiece; quantite: number; etatPiece: EtatPiece; dernierMouvement: Date }>();

    for (const m of mouvements) {
      const current = piecesMap.get(m.pieceId) || {
        piece: m.piece,
        quantite: 0,
        etatPiece: m.etatPiece,
        dernierMouvement: m.dateMouvement,
      };

      if (m.camionDestinationId === camionId) {
        // Piece was installed or transferred TO this camion
        current.quantite += m.quantite;
      }
      if (m.camionSourceId === camionId) {
        // Piece was removed or transferred FROM this camion
        current.quantite -= m.quantite;
      }
      current.etatPiece = m.etatPiece;
      current.dernierMouvement = m.dateMouvement;

      piecesMap.set(m.pieceId, current);
    }

    // Return only pieces with positive quantity
    return Array.from(piecesMap.values()).filter((p) => p.quantite > 0);
  }

  // Get statistics for mouvements
  async getMouvementsStats(): Promise<{
    totalMouvements: number;
    interchanges: number;
    installations: number;
    desinstallations: number;
    retourStock: number;
    coutTotal: number;
  }> {
    const mouvements = await this.mouvementRepository.find();

    const stats = {
      totalMouvements: mouvements.length,
      interchanges: 0,
      installations: 0,
      desinstallations: 0,
      retourStock: 0,
      coutTotal: 0,
    };

    for (const m of mouvements) {
      stats.coutTotal += Number(m.cout) || 0;
      switch (m.typeMouvement) {
        case TypeMouvementPiece.INTERCHANGE:
          stats.interchanges++;
          break;
        case TypeMouvementPiece.INSTALLATION:
          stats.installations++;
          break;
        case TypeMouvementPiece.DESINSTALLATION:
          stats.desinstallations++;
          break;
        case TypeMouvementPiece.RETOUR_STOCK:
          stats.retourStock++;
          break;
      }
    }

    return stats;
  }
}
