import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Camion, BonTransport, BonLocation, DotationCarburant, SortieStock, Chauffeur, Panne } from '../database/entities';
import { StatutCamion } from '../database/entities/camion.entity';
import { StatutChauffeur } from '../database/entities/chauffeur.entity';
import { StatutBon } from '../database/entities/bon-transport.entity';

@Injectable()
export class CamionsService {
  constructor(
    @InjectRepository(Camion)
    private readonly camionRepository: Repository<Camion>,
    @InjectRepository(Chauffeur)
    private readonly chauffeurRepository: Repository<Chauffeur>,
    @InjectRepository(BonTransport)
    private readonly bonTransportRepository: Repository<BonTransport>,
    @InjectRepository(BonLocation)
    private readonly bonLocationRepository: Repository<BonLocation>,
    @InjectRepository(DotationCarburant)
    private readonly dotationRepository: Repository<DotationCarburant>,
    @InjectRepository(SortieStock)
    private readonly sortieStockRepository: Repository<SortieStock>,
    @InjectRepository(Panne)
    private readonly panneRepository: Repository<Panne>,
  ) {}

  /**
   * Synchronise les statuts de tous les camions et chauffeurs
   * en fonction des transports/locations en cours
   */
  async syncStatuts(): Promise<{ camionsMisAJour: number; chauffeursMisAJour: number }> {
    let camionsMisAJour = 0;
    let chauffeursMisAJour = 0;

    // Sync camions
    const camions = await this.camionRepository.find({ where: { actif: true } });

    for (const camion of camions) {
      // Ne pas toucher aux camions en maintenance ou hors service
      if (camion.statut === StatutCamion.EN_MAINTENANCE || camion.statut === StatutCamion.HORS_SERVICE) {
        continue;
      }

      const transportEnCours = await this.bonTransportRepository.count({
        where: { camionId: camion.id, statut: StatutBon.EN_COURS },
      });

      const locationEnCours = await this.bonLocationRepository.count({
        where: { camionId: camion.id, statut: StatutBon.EN_COURS },
      });

      const nouveauStatut = (transportEnCours > 0 || locationEnCours > 0)
        ? StatutCamion.EN_MISSION
        : StatutCamion.DISPONIBLE;

      if (camion.statut !== nouveauStatut) {
        camion.statut = nouveauStatut;
        await this.camionRepository.save(camion);
        camionsMisAJour++;
      }
    }

    // Sync chauffeurs
    const chauffeurs = await this.chauffeurRepository.find({ where: { actif: true } });

    for (const chauffeur of chauffeurs) {
      // Ne pas toucher aux chauffeurs en congé ou indisponibles
      if (chauffeur.statut === StatutChauffeur.CONGE || chauffeur.statut === StatutChauffeur.INDISPONIBLE) {
        continue;
      }

      const transportEnCours = await this.bonTransportRepository.count({
        where: { chauffeurId: chauffeur.id, statut: StatutBon.EN_COURS },
      });

      const locationEnCours = await this.bonLocationRepository.count({
        where: { chauffeurId: chauffeur.id, statut: StatutBon.EN_COURS },
      });

      const nouveauStatut = (transportEnCours > 0 || locationEnCours > 0)
        ? StatutChauffeur.EN_MISSION
        : StatutChauffeur.DISPONIBLE;

      if (chauffeur.statut !== nouveauStatut) {
        chauffeur.statut = nouveauStatut;
        await this.chauffeurRepository.save(chauffeur);
        chauffeursMisAJour++;
      }
    }

    return { camionsMisAJour, chauffeursMisAJour };
  }

  async findAll(): Promise<(Camion & { nombreVoyages?: number })[]> {
    const camions = await this.camionRepository.find({
      where: { actif: true },
      order: { numeroInterne: 'ASC' },
    });

    // Count voyages (transports + locations) for each camion
    const camionIds = camions.map(c => c.id);

    if (camionIds.length === 0) {
      return camions;
    }

    // Get transport counts
    const transportCounts = await this.bonTransportRepository
      .createQueryBuilder('bt')
      .select('bt.camion_id', 'camionId')
      .addSelect('COUNT(*)', 'count')
      .where('bt.camion_id IN (:...ids)', { ids: camionIds })
      .groupBy('bt.camion_id')
      .getRawMany();

    // Get location counts
    const locationCounts = await this.bonLocationRepository
      .createQueryBuilder('bl')
      .select('bl.camion_id', 'camionId')
      .addSelect('COUNT(*)', 'count')
      .where('bl.camion_id IN (:...ids)', { ids: camionIds })
      .groupBy('bl.camion_id')
      .getRawMany();

    // Create a map of camion id to voyage count
    const voyageCountMap = new Map<number, number>();

    for (const tc of transportCounts) {
      voyageCountMap.set(parseInt(tc.camionId), parseInt(tc.count));
    }

    for (const lc of locationCounts) {
      const camionId = parseInt(lc.camionId);
      const currentCount = voyageCountMap.get(camionId) || 0;
      voyageCountMap.set(camionId, currentCount + parseInt(lc.count));
    }

    // Add voyage count to each camion
    return camions.map(c => ({
      ...c,
      nombreVoyages: voyageCountMap.get(c.id) || 0,
    }));
  }

  async findOne(id: number): Promise<Camion> {
    const camion = await this.camionRepository.findOne({ where: { id } });
    if (!camion) {
      throw new NotFoundException(`Camion #${id} non trouvé`);
    }
    return camion;
  }

  async create(data: Partial<Camion>): Promise<Camion> {
    // Generate numero interne
    const lastCamion = await this.camionRepository
      .createQueryBuilder('c')
      .where("c.numero_interne ~ '^ACL[0-9]+$'")
      .orderBy("CAST(SUBSTRING(c.numero_interne FROM 4) AS INTEGER)", 'DESC')
      .getOne();

    const nextNum = lastCamion
      ? parseInt(lastCamion.numeroInterne.substring(3)) + 1
      : 1;

    const camion = this.camionRepository.create({
      ...data,
      numeroInterne: `ACL${String(nextNum).padStart(4, '0')}`,
    });

    return this.camionRepository.save(camion);
  }

  async update(id: number, data: Partial<Camion>): Promise<Camion> {
    const camion = await this.findOne(id);
    Object.assign(camion, data);
    return this.camionRepository.save(camion);
  }

  async updateKilometrage(id: number, km: number): Promise<Camion> {
    const camion = await this.findOne(id);
    camion.kilometrageActuel = km;
    return this.camionRepository.save(camion);
  }

  async remove(id: number): Promise<void> {
    const camion = await this.findOne(id);
    camion.actif = false;
    await this.camionRepository.save(camion);
  }

  async getHistorique(id: number): Promise<{
    transports: BonTransport[];
    locations: BonLocation[];
    dotations: DotationCarburant[];
    sorties: SortieStock[];
    pannes: Panne[];
    stats: any;
  }> {
    await this.findOne(id); // Verify camion exists

    const [transports, locations, dotations, sorties, pannes] = await Promise.all([
      this.bonTransportRepository.find({
        where: { camionId: id },
        relations: ['client', 'chauffeur'],
        order: { createdAt: 'DESC' },
      }),
      this.bonLocationRepository.find({
        where: { camionId: id },
        relations: ['client', 'chauffeur'],
        order: { createdAt: 'DESC' },
      }),
      this.dotationRepository.find({
        where: { camionId: id },
        relations: ['chauffeur', 'cuve'],
        order: { dateDotation: 'DESC' },
      }),
      this.sortieStockRepository.find({
        where: { camionId: id },
        relations: ['createur'],
        order: { dateSortie: 'DESC' },
      }),
      this.panneRepository.find({
        where: { camionId: id },
        relations: ['chauffeur'],
        order: { datePanne: 'DESC' },
      }),
    ]);

    // Calculate stats
    const totalMissions = transports.length + locations.length;
    const missionsTerminees = transports.filter(t => t.statut === 'LIVRE' || t.statut === 'FACTURE').length
      + locations.filter(l => l.statut === 'LIVRE' || l.statut === 'FACTURE').length;

    // Revenus confirmés (LIVRE ou FACTURE)
    const revenusTransport = transports
      .filter(t => t.statut === 'LIVRE' || t.statut === 'FACTURE')
      .reduce((sum, t) => sum + (Number(t.montantHt) || 0), 0);

    const revenusLocation = locations
      .filter(l => l.statut === 'LIVRE' || l.statut === 'FACTURE')
      .reduce((sum, l) => sum + (Number(l.montantTotal) || 0), 0);

    // Revenus en cours (EN_COURS) - potentiels
    const revenusTransportEnCours = transports
      .filter(t => t.statut === 'EN_COURS')
      .reduce((sum, t) => sum + (Number(t.montantHt) || 0), 0);

    const revenusLocationEnCours = locations
      .filter(l => l.statut === 'EN_COURS')
      .reduce((sum, l) => sum + (Number(l.montantTotal) || 0), 0);

    const totalCarburant = dotations.reduce((sum, d) => sum + (Number(d.quantiteLitres) || 0), 0);
    const coutCarburant = dotations.reduce((sum, d) => sum + (Number(d.coutTotal) || 0), 0);

    // Pannes stats
    const pannesActives = pannes.filter(p =>
      ['DECLAREE', 'EN_DIAGNOSTIC', 'EN_ATTENTE_PIECES', 'EN_REPARATION'].includes(p.statut)
    ).length;
    const coutPannes = pannes.reduce((sum, p) => sum + (Number(p.coutReel) || 0), 0);

    return {
      transports,
      locations,
      dotations,
      sorties,
      pannes,
      stats: {
        totalMissions,
        missionsTerminees,
        missionsEnCours: totalMissions - missionsTerminees,
        // Revenus confirmés
        revenusTransport,
        revenusLocation,
        totalRevenus: revenusTransport + revenusLocation,
        // Revenus en cours (potentiels)
        revenusTransportEnCours,
        revenusLocationEnCours,
        totalRevenusEnCours: revenusTransportEnCours + revenusLocationEnCours,
        // Total incluant en cours
        totalRevenusGlobal: revenusTransport + revenusLocation + revenusTransportEnCours + revenusLocationEnCours,
        // Carburant
        totalCarburantLitres: totalCarburant,
        coutCarburant,
        nombreSortiesPieces: sorties.length,
        totalPannes: pannes.length,
        pannesActives,
        coutPannes,
      },
    };
  }
}
