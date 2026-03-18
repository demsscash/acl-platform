import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CuveCarburant, DotationCarburant, ApprovisionnementCuve, Fournisseur } from '../database/entities';
import { StationPartenaire } from '../database/entities/station-partenaire.entity';

@Injectable()
export class CarburantService {
  constructor(
    @InjectRepository(CuveCarburant)
    private readonly cuveRepository: Repository<CuveCarburant>,
    @InjectRepository(DotationCarburant)
    private readonly dotationRepository: Repository<DotationCarburant>,
    @InjectRepository(ApprovisionnementCuve)
    private readonly approvisionnementRepository: Repository<ApprovisionnementCuve>,
    @InjectRepository(Fournisseur)
    private readonly fournisseurRepository: Repository<Fournisseur>,
    @InjectRepository(StationPartenaire)
    private readonly stationPartenaireRepository: Repository<StationPartenaire>,
  ) {}

  // Cuves
  async findAllCuves(): Promise<CuveCarburant[]> {
    return this.cuveRepository.find({
      where: { actif: true },
      order: { nom: 'ASC' },
    });
  }

  async findOneCuve(id: number): Promise<CuveCarburant> {
    const cuve = await this.cuveRepository.findOne({ where: { id } });
    if (!cuve) {
      throw new NotFoundException(`Cuve #${id} non trouvée`);
    }
    return cuve;
  }

  async createCuve(data: Partial<CuveCarburant>): Promise<CuveCarburant> {
    const cuve = this.cuveRepository.create(data);
    return this.cuveRepository.save(cuve);
  }

  async updateCuve(id: number, data: Partial<CuveCarburant>): Promise<CuveCarburant> {
    const cuve = await this.findOneCuve(id);
    Object.assign(cuve, data);
    return this.cuveRepository.save(cuve);
  }

  async deleteCuve(id: number): Promise<void> {
    const cuve = await this.findOneCuve(id);
    // Soft delete - set actif to false
    cuve.actif = false;
    await this.cuveRepository.save(cuve);
  }

  // Clôturer une cuve (stock épuisé, fermer la cuve)
  async cloturerCuve(cuveId: number): Promise<CuveCarburant> {
    const cuve = await this.findOneCuve(cuveId);
    cuve.actif = false;
    cuve.niveauActuelLitres = 0;
    return this.cuveRepository.save(cuve);
  }

  // Lister les dotations (enlèvements) par période pour une cuve
  async findDotationsByCuvePeriod(
    cuveId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<DotationCarburant[]> {
    const qb = this.dotationRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.camion', 'camion')
      .leftJoinAndSelect('d.chauffeur', 'chauffeur')
      .where('d.cuve_id = :cuveId', { cuveId })
      .orderBy('d.date_dotation', 'DESC');

    if (startDate) {
      qb.andWhere('d.date_dotation >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('d.date_dotation <= :endDate', { endDate });
    }

    return qb.getMany();
  }

  // Lister les appros par période pour une cuve
  async findApprovisionnementsByCuvePeriod(
    cuveId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ApprovisionnementCuve[]> {
    const qb = this.approvisionnementRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.fournisseur', 'fournisseur')
      .where('a.cuve_id = :cuveId', { cuveId })
      .orderBy('a.date_approvisionnement', 'DESC');

    if (startDate) {
      qb.andWhere('a.date_approvisionnement >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('a.date_approvisionnement <= :endDate', { endDate });
    }

    return qb.getMany();
  }

  // Dotations
  async findAllDotations(): Promise<DotationCarburant[]> {
    return this.dotationRepository.find({
      relations: ['camion', 'chauffeur', 'cuve', 'stationPartenaire'],
      order: { dateDotation: 'DESC' },
      take: 100,
    });
  }

  async findOneDotation(id: number): Promise<DotationCarburant> {
    const dotation = await this.dotationRepository.findOne({
      where: { id },
      relations: ['camion', 'chauffeur', 'cuve', 'stationPartenaire'],
    });
    if (!dotation) {
      throw new NotFoundException(`Dotation #${id} non trouvée`);
    }
    return dotation;
  }

  async createDotation(data: Partial<DotationCarburant>, userId: number): Promise<DotationCarburant> {
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

    // If from internal cuve, update cuve level
    if (data.typeSource === 'CUVE_INTERNE' && data.cuveId) {
      const cuve = await this.findOneCuve(data.cuveId);
      const newLevel = Number(cuve.niveauActuelLitres) - Number(data.quantiteLitres);

      if (newLevel < 0) {
        throw new BadRequestException(`Stock insuffisant dans la cuve. Disponible: ${cuve.niveauActuelLitres}L`);
      }

      cuve.niveauActuelLitres = newLevel;
      await this.cuveRepository.save(cuve);
    }

    // Calculate total cost
    const coutTotal = data.prixUnitaire
      ? Number(data.prixUnitaire) * Number(data.quantiteLitres)
      : undefined;

    const dotationData: any = {
      ...data,
      numeroBon,
      createdBy: userId,
    };
    if (coutTotal !== undefined) {
      dotationData.coutTotal = coutTotal;
    }

    const dotation = this.dotationRepository.create(dotationData);
    const saved = await this.dotationRepository.save(dotation);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  // Ravitaillement cuve (simple - kept for backwards compatibility)
  async ravitaillerCuve(cuveId: number, quantiteLitres: number): Promise<CuveCarburant> {
    const cuve = await this.findOneCuve(cuveId);
    const newLevel = Number(cuve.niveauActuelLitres) + Number(quantiteLitres);

    if (newLevel > Number(cuve.capaciteLitres)) {
      throw new BadRequestException(`Dépassement capacité. Max: ${cuve.capaciteLitres}L, Actuel: ${cuve.niveauActuelLitres}L`);
    }

    cuve.niveauActuelLitres = newLevel;
    return this.cuveRepository.save(cuve);
  }

  // Approvisionnements
  async findAllApprovisionnements(): Promise<ApprovisionnementCuve[]> {
    return this.approvisionnementRepository.find({
      relations: ['cuve', 'fournisseur', 'createur'],
      order: { dateApprovisionnement: 'DESC' },
      take: 100,
    });
  }

  async findApprovisionnementsByCuve(cuveId: number): Promise<ApprovisionnementCuve[]> {
    return this.approvisionnementRepository.find({
      where: { cuveId },
      relations: ['fournisseur', 'createur'],
      order: { dateApprovisionnement: 'DESC' },
    });
  }

  async findOneApprovisionnement(id: number): Promise<ApprovisionnementCuve> {
    const approvisionnement = await this.approvisionnementRepository.findOne({
      where: { id },
      relations: ['cuve', 'fournisseur', 'createur'],
    });
    if (!approvisionnement) {
      throw new NotFoundException(`Approvisionnement #${id} non trouvé`);
    }
    return approvisionnement;
  }

  async createApprovisionnement(
    data: {
      cuveId: number;
      fournisseurId?: number;
      fournisseurAutre?: string;
      quantiteLitres: number;
      prixUnitaire: number;
      numeroFacture?: string;
      numeroBonLivraison?: string;
      observations?: string;
    },
    userId: number,
  ): Promise<ApprovisionnementCuve> {
    // Verify cuve exists and get current level
    const cuve = await this.findOneCuve(data.cuveId);
    const niveauAvant = Number(cuve.niveauActuelLitres);
    const newLevel = niveauAvant + Number(data.quantiteLitres);

    if (newLevel > Number(cuve.capaciteLitres)) {
      throw new BadRequestException(
        `Dépassement capacité. Max: ${cuve.capaciteLitres}L, Actuel: ${cuve.niveauActuelLitres}L, Ajout: ${data.quantiteLitres}L`,
      );
    }

    // Generate numero bon
    const today = new Date();
    const prefix = `APP-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastAppro = await this.approvisionnementRepository
      .createQueryBuilder('a')
      .where('a.numero_bon LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('a.numero_bon', 'DESC')
      .getOne();

    const nextNum = lastAppro
      ? parseInt(lastAppro.numeroBon.substring(prefix.length + 1)) + 1
      : 1;

    const numeroBon = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    // Calculate total cost
    const coutTotal = Number(data.prixUnitaire) * Number(data.quantiteLitres);

    // Update cuve level
    cuve.niveauActuelLitres = newLevel;
    await this.cuveRepository.save(cuve);

    // Handle fournisseur: either from database or external (autre)
    const fournisseurId = data.fournisseurId && data.fournisseurId > 0 ? data.fournisseurId : null;
    const fournisseurAutre = !fournisseurId ? data.fournisseurAutre : null;

    // Create approvisionnement record
    const approvisionnement = this.approvisionnementRepository.create({
      cuveId: data.cuveId,
      fournisseurId,
      fournisseurAutre,
      quantiteLitres: data.quantiteLitres,
      prixUnitaire: data.prixUnitaire,
      numeroFacture: data.numeroFacture,
      numeroBonLivraison: data.numeroBonLivraison,
      observations: data.observations,
      numeroBon,
      coutTotal,
      niveauAvantLitres: niveauAvant,
      niveauApresLitres: newLevel,
      createdBy: userId,
    } as Partial<ApprovisionnementCuve>);

    return this.approvisionnementRepository.save(approvisionnement) as Promise<ApprovisionnementCuve>;
  }

  // Fournisseurs (carburant) - filtre uniquement CARBURANT et GENERAL
  async findAllFournisseurs(): Promise<Fournisseur[]> {
    return this.fournisseurRepository
      .createQueryBuilder('f')
      .where('f.actif = true')
      .andWhere('f.type_fournisseur IN (:...types)', { types: ['CARBURANT', 'GENERAL'] })
      .orderBy('f.raison_sociale', 'ASC')
      .getMany();
  }

  // Stats cuve
  async getCuveStats(cuveId: number): Promise<{
    cuve: CuveCarburant;
    totalApprovisionne: number;
    totalConsomme: number;
    dernierApprovisionnement?: ApprovisionnementCuve;
    derniereDotation?: DotationCarburant;
  }> {
    const cuve = await this.findOneCuve(cuveId);

    const appros = await this.approvisionnementRepository.find({
      where: { cuveId },
      order: { dateApprovisionnement: 'DESC' },
    });

    const dotations = await this.dotationRepository.find({
      where: { cuveId },
      order: { dateDotation: 'DESC' },
    });

    const totalApprovisionne = appros.reduce((sum, a) => sum + Number(a.quantiteLitres), 0);
    const totalConsomme = dotations.reduce((sum, d) => sum + Number(d.quantiteLitres), 0);

    return {
      cuve,
      totalApprovisionne,
      totalConsomme,
      dernierApprovisionnement: appros[0],
      derniereDotation: dotations[0],
    };
  }

  // Stations Partenaires
  async findAllStationsPartenaires(): Promise<StationPartenaire[]> {
    return this.stationPartenaireRepository.find({
      where: { actif: true },
      order: { nom: 'ASC' },
    });
  }

  async findOneStationPartenaire(id: number): Promise<StationPartenaire> {
    const station = await this.stationPartenaireRepository.findOne({ where: { id } });
    if (!station) {
      throw new NotFoundException(`Station partenaire #${id} non trouvée`);
    }
    return station;
  }

  async createStationPartenaire(data: Partial<StationPartenaire>): Promise<StationPartenaire> {
    // Generate code if not provided
    if (!data.code) {
      const lastStation = await this.stationPartenaireRepository
        .createQueryBuilder('s')
        .orderBy('s.id', 'DESC')
        .getOne();
      const nextNum = lastStation ? lastStation.id + 1 : 1;
      data.code = `STA-${String(nextNum).padStart(4, '0')}`;
    }

    const station = this.stationPartenaireRepository.create(data);
    return this.stationPartenaireRepository.save(station);
  }

  async updateStationPartenaire(id: number, data: Partial<StationPartenaire>): Promise<StationPartenaire> {
    const station = await this.findOneStationPartenaire(id);
    Object.assign(station, data);
    return this.stationPartenaireRepository.save(station);
  }

  async deleteStationPartenaire(id: number): Promise<void> {
    const station = await this.findOneStationPartenaire(id);
    // Soft delete - set actif to false
    station.actif = false;
    await this.stationPartenaireRepository.save(station);
  }
}
