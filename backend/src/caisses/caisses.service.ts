import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';

import { Caisse, TypeCaisse } from '../database/entities/caisse.entity';
import { MouvementCaisse, TypeMouvement } from '../database/entities/mouvement-caisse.entity';
import { CreateCaisseDto, UpdateCaisseDto } from './dto/create-caisse.dto';
import { CreateMouvementDto, VirementDto } from './dto/create-mouvement.dto';

@Injectable()
export class CaissesService {
  constructor(
    @InjectRepository(Caisse)
    private readonly caisseRepository: Repository<Caisse>,
    @InjectRepository(MouvementCaisse)
    private readonly mouvementRepository: Repository<MouvementCaisse>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<Caisse[]> {
    return this.caisseRepository.find({
      relations: ['createur', 'modificateur'],
      order: { type: 'ASC', nom: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Caisse> {
    const caisse = await this.caisseRepository.findOne({
      where: { id },
      relations: ['createur', 'modificateur'],
    });
    if (!caisse) {
      throw new NotFoundException(`Caisse #${id} non trouvée`);
    }
    return caisse;
  }

  async create(dto: CreateCaisseDto, userId: number): Promise<Caisse> {
    const caisse = this.caisseRepository.create({
      ...dto,
      soldeActuel: dto.soldeInitial || 0,
      createdBy: userId,
    });
    return this.caisseRepository.save(caisse);
  }

  async update(id: number, dto: UpdateCaisseDto, userId: number): Promise<Caisse> {
    const caisse = await this.findOne(id);
    Object.assign(caisse, dto);
    caisse.updatedBy = userId;
    return this.caisseRepository.save(caisse);
  }

  async delete(id: number): Promise<void> {
    const caisse = await this.findOne(id);

    // Check if caisse has any mouvements
    const mouvementsCount = await this.mouvementRepository.count({
      where: { caisseId: id },
    });

    if (mouvementsCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer la caisse. Elle contient ${mouvementsCount} mouvement(s).`,
      );
    }

    await this.caisseRepository.remove(caisse);
  }

  // Mouvements
  async getMouvements(caisseId: number, startDate?: Date, endDate?: Date): Promise<MouvementCaisse[]> {
    await this.findOne(caisseId); // Verify caisse exists

    const whereClause: any = { caisseId };
    if (startDate && endDate) {
      whereClause.date = Between(startDate, endDate);
    }

    return this.mouvementRepository.find({
      where: whereClause,
      relations: ['createur', 'modificateur', 'caisseDestination'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async getAllMouvements(startDate?: Date, endDate?: Date): Promise<MouvementCaisse[]> {
    const whereClause: any = {};
    if (startDate && endDate) {
      whereClause.date = Between(startDate, endDate);
    }

    return this.mouvementRepository.find({
      where: whereClause,
      relations: ['caisse', 'createur', 'modificateur', 'caisseDestination'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async addMouvement(caisseId: number, dto: CreateMouvementDto, userId: number): Promise<MouvementCaisse> {
    const caisse = await this.findOne(caisseId);

    // Validate virement
    if (dto.type === TypeMouvement.VIREMENT_INTERNE) {
      if (!dto.caisseDestinationId) {
        throw new BadRequestException('La caisse destination est requise pour un virement interne');
      }
      if (dto.caisseDestinationId === caisseId) {
        throw new BadRequestException('La caisse source et destination ne peuvent pas être identiques');
      }
    }

    // Check sufficient funds for SORTIE or VIREMENT
    if (dto.type === TypeMouvement.SORTIE || dto.type === TypeMouvement.VIREMENT_INTERNE) {
      if (Number(caisse.soldeActuel) < dto.montant) {
        throw new BadRequestException(
          `Solde insuffisant. Solde actuel: ${caisse.soldeActuel}, Montant demandé: ${dto.montant}`,
        );
      }
    }

    // Use transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create mouvement
      const mouvement = this.mouvementRepository.create({
        ...dto,
        caisseId,
        date: dto.date ? new Date(dto.date) : new Date(),
        createdBy: userId,
      });
      const savedMouvement = await queryRunner.manager.save(mouvement);

      // Update solde based on type
      if (dto.type === TypeMouvement.ENTREE) {
        caisse.soldeActuel = Number(caisse.soldeActuel) + dto.montant;
      } else if (dto.type === TypeMouvement.SORTIE) {
        caisse.soldeActuel = Number(caisse.soldeActuel) - dto.montant;
      } else if (dto.type === TypeMouvement.VIREMENT_INTERNE) {
        if (!dto.caisseDestinationId) {
          throw new Error('Caisse destination requise pour un virement interne');
        }
        // Decrease source
        caisse.soldeActuel = Number(caisse.soldeActuel) - dto.montant;

        // Increase destination
        const caisseDestination = await this.findOne(dto.caisseDestinationId);
        caisseDestination.soldeActuel = Number(caisseDestination.soldeActuel) + dto.montant;
        await queryRunner.manager.save(caisseDestination);
      }

      caisse.updatedBy = userId;
      await queryRunner.manager.save(caisse);

      await queryRunner.commitTransaction();

      const result = await this.mouvementRepository.findOne({
        where: { id: savedMouvement.id },
        relations: ['caisse', 'createur', 'caisseDestination'],
      });
      return result!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async virement(dto: VirementDto, userId: number): Promise<MouvementCaisse> {
    return this.addMouvement(dto.caisseSourceId, {
      type: TypeMouvement.VIREMENT_INTERNE,
      nature: dto.nature,
      montant: dto.montant,
      caisseDestinationId: dto.caisseDestinationId,
      date: dto.date,
      notes: dto.notes,
    }, userId);
  }

  async getStats(): Promise<{
    totalCaisses: number;
    soldeTotalCentrale: number;
    soldeTotalLogistique: number;
    soldeGeneral: number;
    mouvementsAujourdhui: number;
  }> {
    const caisses = await this.caisseRepository.find({ where: { actif: true } });

    const soldeTotalCentrale = caisses
      .filter(c => c.type === TypeCaisse.CENTRALE)
      .reduce((sum, c) => sum + Number(c.soldeActuel), 0);

    const soldeTotalLogistique = caisses
      .filter(c => c.type === TypeCaisse.LOGISTIQUE)
      .reduce((sum, c) => sum + Number(c.soldeActuel), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const mouvementsAujourdhui = await this.mouvementRepository.count({
      where: {
        date: Between(today, tomorrow),
      },
    });

    return {
      totalCaisses: caisses.length,
      soldeTotalCentrale,
      soldeTotalLogistique,
      soldeGeneral: soldeTotalCentrale + soldeTotalLogistique,
      mouvementsAujourdhui,
    };
  }

  // Recalculer le solde d'une caisse à partir des mouvements
  async recalculerSolde(caisseId: number): Promise<Caisse> {
    const caisse = await this.findOne(caisseId);

    const mouvements = await this.mouvementRepository.find({
      where: { caisseId },
    });

    let solde = Number(caisse.soldeInitial);

    for (const m of mouvements) {
      if (m.type === TypeMouvement.ENTREE) {
        solde += Number(m.montant);
      } else if (m.type === TypeMouvement.SORTIE || m.type === TypeMouvement.VIREMENT_INTERNE) {
        solde -= Number(m.montant);
      }
    }

    // Add incoming virements
    const virementsEntrants = await this.mouvementRepository.find({
      where: { caisseDestinationId: caisseId },
    });

    for (const v of virementsEntrants) {
      solde += Number(v.montant);
    }

    caisse.soldeActuel = solde;
    return this.caisseRepository.save(caisse);
  }
}
