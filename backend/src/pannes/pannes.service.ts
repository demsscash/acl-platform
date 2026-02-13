import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Panne, StatutPanne, Camion, StatutCamion } from '../database/entities';

@Injectable()
export class PannesService {
  constructor(
    @InjectRepository(Panne)
    private readonly panneRepository: Repository<Panne>,
    @InjectRepository(Camion)
    private readonly camionRepository: Repository<Camion>,
  ) {}

  async findAll(): Promise<Panne[]> {
    return this.panneRepository.find({
      relations: ['camion', 'chauffeur', 'createur', 'modificateur'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatut(statut: StatutPanne): Promise<Panne[]> {
    return this.panneRepository.find({
      where: { statut },
      relations: ['camion', 'chauffeur', 'createur', 'modificateur'],
      order: { priorite: 'ASC', createdAt: 'DESC' },
    });
  }

  async findEnCours(): Promise<Panne[]> {
    return this.panneRepository.find({
      where: [
        { statut: StatutPanne.DECLAREE },
        { statut: StatutPanne.EN_DIAGNOSTIC },
        { statut: StatutPanne.EN_ATTENTE_PIECES },
        { statut: StatutPanne.EN_REPARATION },
      ],
      relations: ['camion', 'chauffeur', 'createur', 'modificateur'],
      order: { priorite: 'ASC', createdAt: 'DESC' },
    });
  }

  async findByCamion(camionId: number): Promise<Panne[]> {
    return this.panneRepository.find({
      where: { camionId },
      relations: ['chauffeur', 'createur', 'modificateur'],
      order: { datePanne: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Panne> {
    const panne = await this.panneRepository.findOne({
      where: { id },
      relations: ['camion', 'chauffeur', 'createur', 'modificateur'],
    });
    if (!panne) {
      throw new NotFoundException(`Panne #${id} non trouvée`);
    }
    return panne;
  }

  async create(data: Partial<Panne>, userId: number): Promise<Panne> {
    // Generate numero panne
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

    // Create panne
    const panne = this.panneRepository.create({
      ...data,
      numeroPanne,
      createdBy: userId,
      statut: StatutPanne.DECLAREE,
    });

    const saved = await this.panneRepository.save(panne);

    // Update camion status to EN_MAINTENANCE (panne active)
    if (data.camionId) {
      await this.camionRepository.update(data.camionId, {
        statut: StatutCamion.EN_MAINTENANCE,
      });
    }

    return this.findOne(saved.id);
  }

  async update(id: number, data: Partial<Panne>, userId?: number): Promise<Panne> {
    const panne = await this.findOne(id);

    // If status changes to EN_REPARATION, set dateDebutReparation
    if (data.statut === StatutPanne.EN_REPARATION && !panne.dateDebutReparation) {
      data.dateDebutReparation = new Date();
    }

    // If status changes to REPAREE, set dateFinReparation and update camion
    if (data.statut === StatutPanne.REPAREE && !panne.dateFinReparation) {
      data.dateFinReparation = new Date();
    }

    // Track who modified
    if (userId) {
      data.updatedBy = userId;
    }

    Object.assign(panne, data);
    await this.panneRepository.save(panne);

    // If panne is repaired or closed, set camion to DISPONIBLE (if no other active pannes)
    if (data.statut === StatutPanne.REPAREE || data.statut === StatutPanne.CLOTUREE) {
      const activePannes = await this.panneRepository.count({
        where: [
          { camionId: panne.camionId, statut: StatutPanne.DECLAREE },
          { camionId: panne.camionId, statut: StatutPanne.EN_DIAGNOSTIC },
          { camionId: panne.camionId, statut: StatutPanne.EN_ATTENTE_PIECES },
          { camionId: panne.camionId, statut: StatutPanne.EN_REPARATION },
        ],
      });

      if (activePannes === 0) {
        await this.camionRepository.update(panne.camionId, {
          statut: StatutCamion.DISPONIBLE,
        });
      }
    } else if ([StatutPanne.DECLAREE, StatutPanne.EN_DIAGNOSTIC, StatutPanne.EN_ATTENTE_PIECES, StatutPanne.EN_REPARATION].includes(data.statut as StatutPanne)) {
      // Any active panne status keeps camion in EN_MAINTENANCE
      await this.camionRepository.update(panne.camionId, {
        statut: StatutCamion.EN_MAINTENANCE,
      });
    }

    return this.findOne(id);
  }

  async getStats(): Promise<{
    total: number;
    enCours: number;
    parStatut: Record<string, number>;
    parType: Record<string, number>;
    coutTotal: number;
  }> {
    const pannes = await this.panneRepository.find();

    const enCours = pannes.filter(p =>
      [StatutPanne.DECLAREE, StatutPanne.EN_DIAGNOSTIC, StatutPanne.EN_ATTENTE_PIECES, StatutPanne.EN_REPARATION].includes(p.statut)
    ).length;

    const parStatut: Record<string, number> = {};
    const parType: Record<string, number> = {};

    for (const panne of pannes) {
      parStatut[panne.statut] = (parStatut[panne.statut] || 0) + 1;
      parType[panne.typePanne] = (parType[panne.typePanne] || 0) + 1;
    }

    const coutTotal = pannes
      .filter(p => p.statut === StatutPanne.REPAREE || p.statut === StatutPanne.CLOTUREE)
      .reduce((sum, p) => sum + (Number(p.coutReel) || Number(p.coutEstime) || 0), 0);

    return {
      total: pannes.length,
      enCours,
      parStatut,
      parType,
      coutTotal,
    };
  }
}
