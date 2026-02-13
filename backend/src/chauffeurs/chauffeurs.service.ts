import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Chauffeur, BonTransport, BonLocation, DotationCarburant, Panne } from '../database/entities';

@Injectable()
export class ChauffeursService {
  constructor(
    @InjectRepository(Chauffeur)
    private readonly chauffeurRepository: Repository<Chauffeur>,
    @InjectRepository(BonTransport)
    private readonly bonTransportRepository: Repository<BonTransport>,
    @InjectRepository(BonLocation)
    private readonly bonLocationRepository: Repository<BonLocation>,
    @InjectRepository(DotationCarburant)
    private readonly dotationRepository: Repository<DotationCarburant>,
    @InjectRepository(Panne)
    private readonly panneRepository: Repository<Panne>,
  ) {}

  async findAll(): Promise<(Chauffeur & { nombreVoyages?: number })[]> {
    const chauffeurs = await this.chauffeurRepository.find({
      where: { actif: true },
      order: { nom: 'ASC', prenom: 'ASC' },
    });

    // Count voyages (transports + locations) for each chauffeur
    const chauffeurIds = chauffeurs.map(c => c.id);

    if (chauffeurIds.length === 0) {
      return chauffeurs;
    }

    // Get transport counts
    const transportCounts = await this.bonTransportRepository
      .createQueryBuilder('bt')
      .select('bt.chauffeur_id', 'chauffeurId')
      .addSelect('COUNT(*)', 'count')
      .where('bt.chauffeur_id IN (:...ids)', { ids: chauffeurIds })
      .groupBy('bt.chauffeur_id')
      .getRawMany();

    // Get location counts
    const locationCounts = await this.bonLocationRepository
      .createQueryBuilder('bl')
      .select('bl.chauffeur_id', 'chauffeurId')
      .addSelect('COUNT(*)', 'count')
      .where('bl.chauffeur_id IN (:...ids)', { ids: chauffeurIds })
      .groupBy('bl.chauffeur_id')
      .getRawMany();

    // Create a map of chauffeur id to voyage count
    const voyageCountMap = new Map<number, number>();

    for (const tc of transportCounts) {
      voyageCountMap.set(parseInt(tc.chauffeurId), parseInt(tc.count));
    }

    for (const lc of locationCounts) {
      const chauffeurId = parseInt(lc.chauffeurId);
      const currentCount = voyageCountMap.get(chauffeurId) || 0;
      voyageCountMap.set(chauffeurId, currentCount + parseInt(lc.count));
    }

    // Add voyage count to each chauffeur
    return chauffeurs.map(c => ({
      ...c,
      nombreVoyages: voyageCountMap.get(c.id) || 0,
    }));
  }

  async findOne(id: number): Promise<Chauffeur> {
    const chauffeur = await this.chauffeurRepository.findOne({ where: { id } });
    if (!chauffeur) {
      throw new NotFoundException(`Chauffeur #${id} non trouvé`);
    }
    return chauffeur;
  }

  async create(data: Partial<Chauffeur>): Promise<Chauffeur> {
    const chauffeur = this.chauffeurRepository.create(data);
    return this.chauffeurRepository.save(chauffeur);
  }

  async update(id: number, data: Partial<Chauffeur>): Promise<Chauffeur> {
    const chauffeur = await this.findOne(id);
    Object.assign(chauffeur, data);
    return this.chauffeurRepository.save(chauffeur);
  }

  async remove(id: number): Promise<void> {
    const chauffeur = await this.findOne(id);
    chauffeur.actif = false;
    await this.chauffeurRepository.save(chauffeur);
  }

  async findDisponibles(): Promise<Chauffeur[]> {
    return this.chauffeurRepository.find({
      where: { actif: true, statut: 'DISPONIBLE' as any },
      order: { nom: 'ASC' },
    });
  }

  async getHistorique(id: number): Promise<{
    transports: BonTransport[];
    locations: BonLocation[];
    dotations: DotationCarburant[];
    pannes: Panne[];
    stats: any;
  }> {
    await this.findOne(id); // Verify chauffeur exists

    const [transports, locations, dotations, pannes] = await Promise.all([
      this.bonTransportRepository.find({
        where: { chauffeurId: id },
        relations: ['client', 'camion'],
        order: { createdAt: 'DESC' },
      }),
      this.bonLocationRepository.find({
        where: { chauffeurId: id },
        relations: ['client', 'camion'],
        order: { createdAt: 'DESC' },
      }),
      this.dotationRepository.find({
        where: { chauffeurId: id },
        relations: ['camion'],
        order: { dateDotation: 'DESC' },
      }),
      this.panneRepository.find({
        where: { chauffeurId: id },
        relations: ['camion'],
        order: { datePanne: 'DESC' },
      }),
    ]);

    // Calculate stats
    const totalMissions = transports.length + locations.length;
    const missionsTerminees = transports.filter(t => t.statut === 'LIVRE' || t.statut === 'FACTURE').length
      + locations.filter(l => l.statut === 'LIVRE' || l.statut === 'FACTURE').length;

    const revenusTransport = transports
      .filter(t => t.statut === 'LIVRE' || t.statut === 'FACTURE')
      .reduce((sum, t) => sum + (Number(t.montantHt) || 0), 0);

    const revenusLocation = locations
      .filter(l => l.statut === 'LIVRE' || l.statut === 'FACTURE')
      .reduce((sum, l) => sum + (Number(l.montantTotal) || 0), 0);

    const totalCarburant = dotations.reduce((sum, d) => sum + (Number(d.quantiteLitres) || 0), 0);

    // Calculate total km from locations (kmRetour - kmDepart)
    const totalKm = locations.reduce((sum, l) => {
      if (l.kmDepart && l.kmRetour) {
        return sum + (Number(l.kmRetour) - Number(l.kmDepart));
      }
      return sum;
    }, 0);

    // Calculate total weight transported
    const totalPoidsTransporte = transports.reduce((sum, t) => sum + (Number(t.poidsKg) || 0), 0);

    // Calculate average per mission
    const moyenneParMission = missionsTerminees > 0
      ? (revenusTransport + revenusLocation) / missionsTerminees
      : 0;

    // Count pannes by status
    const pannesResolues = pannes.filter(p => p.statut === 'REPAREE' || p.statut === 'CLOTUREE').length;

    return {
      transports,
      locations,
      dotations,
      pannes,
      stats: {
        totalMissions,
        missionsTerminees,
        tauxCompletion: totalMissions > 0 ? Math.round((missionsTerminees / totalMissions) * 100) : 0,
        revenusTransport,
        revenusLocation,
        totalRevenus: revenusTransport + revenusLocation,
        moyenneParMission,
        totalCarburantLitres: totalCarburant,
        totalKmParcourus: totalKm,
        totalPoidsTransporte,
        totalPannes: pannes.length,
        pannesResolues,
      },
    };
  }
}
