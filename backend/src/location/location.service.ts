import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BonLocation, BonTransport, Camion, Chauffeur, Client } from '../database/entities';
import { StatutCamion } from '../database/entities/camion.entity';
import { StatutChauffeur } from '../database/entities/chauffeur.entity';
import { StatutBon } from '../database/entities/bon-transport.entity';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(BonLocation)
    private readonly bonLocationRepository: Repository<BonLocation>,
    @InjectRepository(BonTransport)
    private readonly bonTransportRepository: Repository<BonTransport>,
    @InjectRepository(Camion)
    private readonly camionRepository: Repository<Camion>,
    @InjectRepository(Chauffeur)
    private readonly chauffeurRepository: Repository<Chauffeur>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  // Met à jour le statut du camion en fonction des transports/locations en cours
  private async updateCamionStatus(camionId: number): Promise<void> {
    if (!camionId) return;

    const transportEnCours = await this.bonTransportRepository.count({
      where: { camionId, statut: StatutBon.EN_COURS },
    });

    const locationEnCours = await this.bonLocationRepository.count({
      where: { camionId, statut: StatutBon.EN_COURS },
    });

    const camion = await this.camionRepository.findOne({ where: { id: camionId } });
    if (!camion) return;

    if (camion.statut === StatutCamion.EN_MAINTENANCE || camion.statut === StatutCamion.HORS_SERVICE) {
      return;
    }

    if (transportEnCours > 0 || locationEnCours > 0) {
      camion.statut = StatutCamion.EN_MISSION;
    } else {
      camion.statut = StatutCamion.DISPONIBLE;
    }

    await this.camionRepository.save(camion);
  }

  async findAll(statut?: string): Promise<BonLocation[]> {
    const whereClause: any = {};
    if (statut) {
      whereClause.statut = statut;
    }

    return this.bonLocationRepository.find({
      where: whereClause,
      relations: ['client', 'camion', 'chauffeur', 'createur'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<BonLocation> {
    const bon = await this.bonLocationRepository.findOne({
      where: { id },
      relations: ['client', 'camion', 'chauffeur', 'createur'],
    });
    if (!bon) {
      throw new NotFoundException(`Bon de location #${id} non trouvé`);
    }
    return bon;
  }

  async create(data: Partial<BonLocation>, userId: number): Promise<BonLocation> {
    // Generate unique number
    const count = await this.bonLocationRepository.count();
    const numero = `LOC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Calculate montantTotal if dates and tarif are provided
    let montantTotal = data.montantTotal;
    if (data.dateDebut && data.dateFinPrevue && data.tarifJournalier && !montantTotal) {
      const debut = new Date(data.dateDebut);
      const fin = new Date(data.dateFinPrevue);
      const jours = Math.max(1, Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)));
      montantTotal = jours * Number(data.tarifJournalier);
      if (data.supplementCarburant) {
        montantTotal += Number(data.supplementCarburant);
      }
    }

    const bon = this.bonLocationRepository.create({
      ...data,
      numero,
      montantTotal,
      createdBy: userId,
    });

    return this.bonLocationRepository.save(bon);
  }

  async update(id: number, data: Partial<BonLocation>): Promise<BonLocation> {
    const bon = await this.findOne(id);
    const oldChauffeurId = bon.chauffeurId;
    const oldCamionId = bon.camionId;

    // Clear the relation objects to prevent conflicts with IDs
    if (data.chauffeurId !== undefined) {
      (bon as any).chauffeur = undefined;
    }
    if (data.camionId !== undefined) {
      (bon as any).camion = undefined;
    }
    if (data.clientId !== undefined) {
      (bon as any).client = undefined;
    }

    Object.assign(bon, data);

    // Recalculate montantTotal if relevant fields changed
    if (bon.dateDebut && bon.dateFinPrevue && bon.tarifJournalier) {
      const debut = new Date(bon.dateDebut);
      const fin = new Date(bon.dateFinPrevue);
      const jours = Math.max(1, Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)));
      bon.montantTotal = jours * Number(bon.tarifJournalier);
      if (bon.supplementCarburant) {
        bon.montantTotal += Number(bon.supplementCarburant);
      }
    }

    const savedBon = await this.bonLocationRepository.save(bon);

    // Update chauffeur statuses if chauffeur changed and bon is EN_COURS
    if (bon.statut === 'EN_COURS') {
      // Release old chauffeur if changed
      if (oldChauffeurId && oldChauffeurId !== savedBon.chauffeurId) {
        // Check if old chauffeur has other ongoing missions
        const otherMissions = await this.bonLocationRepository.count({
          where: { chauffeurId: oldChauffeurId, statut: StatutBon.EN_COURS },
        });
        const otherTransports = await this.bonTransportRepository.count({
          where: { chauffeurId: oldChauffeurId, statut: StatutBon.EN_COURS },
        });
        if (otherMissions === 0 && otherTransports === 0) {
          await this.chauffeurRepository.update(oldChauffeurId, { statut: StatutChauffeur.DISPONIBLE });
        }
      }
      // Mark new chauffeur as EN_MISSION
      if (savedBon.chauffeurId && savedBon.chauffeurId !== oldChauffeurId) {
        await this.chauffeurRepository.update(savedBon.chauffeurId, { statut: StatutChauffeur.EN_MISSION });
      }
    }

    // Update camion statuses if camion changed
    if (oldCamionId && oldCamionId !== savedBon.camionId) {
      await this.updateCamionStatus(oldCamionId);
    }
    if (savedBon.camionId && savedBon.camionId !== oldCamionId) {
      await this.updateCamionStatus(savedBon.camionId);
    }

    // Return with fresh relations
    return this.findOne(id);
  }

  async updateStatut(id: number, statut: string): Promise<BonLocation> {
    const bon = await this.findOne(id);
    bon.statut = statut as any;

    // If completed, set actual end date and recalculate montant
    if (statut === 'TERMINE') {
      bon.dateFinReelle = new Date();

      // Recalculate montantTotal with actual dates
      if (bon.dateDebut && bon.tarifJournalier) {
        const debut = new Date(bon.dateDebut);
        const fin = bon.dateFinReelle;
        const jours = Math.max(1, Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)));
        bon.montantTotal = jours * Number(bon.tarifJournalier);
        if (bon.supplementCarburant) {
          bon.montantTotal += Number(bon.supplementCarburant);
        }
      }
    }

    const savedBon = await this.bonLocationRepository.save(bon);

    // Mettre à jour le statut du camion (vérifie tous les transports/locations en cours)
    if (savedBon.camionId) {
      await this.updateCamionStatus(savedBon.camionId);
    }

    // Mettre à jour le statut du chauffeur
    if (savedBon.chauffeurId) {
      if (statut === 'EN_COURS') {
        await this.chauffeurRepository.update(savedBon.chauffeurId, { statut: StatutChauffeur.EN_MISSION });
      } else if (statut === 'TERMINE' || statut === 'ANNULE') {
        await this.chauffeurRepository.update(savedBon.chauffeurId, { statut: StatutChauffeur.DISPONIBLE });
      }
    }

    return savedBon;
  }

  async calculerMontant(id: number): Promise<BonLocation> {
    const bon = await this.findOne(id);

    if (bon.dateDebut && bon.dateFinPrevue && bon.tarifJournalier) {
      const debut = new Date(bon.dateDebut);
      const fin = bon.dateFinReelle ? new Date(bon.dateFinReelle) : new Date(bon.dateFinPrevue);
      const jours = Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24));

      let montant = jours * Number(bon.tarifJournalier);

      // Add fuel supplement if applicable
      if (bon.supplementCarburant) {
        montant += Number(bon.supplementCarburant);
      }

      bon.montantTotal = montant;
      return this.bonLocationRepository.save(bon);
    }

    return bon;
  }

  async getStats(): Promise<any> {
    const total = await this.bonLocationRepository.count();
    const enCours = await this.bonLocationRepository.count({ where: { statut: StatutBon.EN_COURS } });
    const livres = await this.bonLocationRepository.count({ where: { statut: StatutBon.LIVRE } });
    const factures = await this.bonLocationRepository.count({ where: { statut: StatutBon.FACTURE } });
    const brouillons = await this.bonLocationRepository.count({ where: { statut: StatutBon.BROUILLON } });

    // Calculate total revenue from completed bons (LIVRE and FACTURE)
    const result = await this.bonLocationRepository
      .createQueryBuilder('bon')
      .select('SUM(bon.montant_total)', 'totalRevenu')
      .where('bon.statut IN (:...statuts)', { statuts: [StatutBon.EN_COURS, StatutBon.LIVRE, StatutBon.FACTURE] })
      .getRawOne();

    return {
      total,
      enCours,
      livres,
      factures,
      termines: livres + factures, // Alias for backward compatibility
      brouillons,
      totalRevenu: Number(result?.totalRevenu) || 0,
    };
  }

  async getClients(): Promise<Client[]> {
    return this.clientRepository.find({
      where: { actif: true },
      order: { raisonSociale: 'ASC' },
    });
  }

  // Recalculate all montantTotal for existing bons
  async recalculerTousMontants(): Promise<{ updated: number }> {
    const bons = await this.bonLocationRepository.find();
    let updated = 0;

    for (const bon of bons) {
      if (bon.dateDebut && bon.dateFinPrevue && bon.tarifJournalier) {
        const debut = new Date(bon.dateDebut);
        const fin = bon.dateFinReelle ? new Date(bon.dateFinReelle) : new Date(bon.dateFinPrevue);
        const jours = Math.max(1, Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)));
        let montant = jours * Number(bon.tarifJournalier);
        if (bon.supplementCarburant) {
          montant += Number(bon.supplementCarburant);
        }

        if (bon.montantTotal !== montant) {
          bon.montantTotal = montant;
          await this.bonLocationRepository.save(bon);
          updated++;
        }
      }
    }

    return { updated };
  }
}
