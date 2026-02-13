import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { BonTransport, Client, Camion, BonLocation, Chauffeur } from '../database/entities';
import { StatutCamion } from '../database/entities/camion.entity';
import { StatutChauffeur } from '../database/entities/chauffeur.entity';
import { StatutBon } from '../database/entities/bon-transport.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TransportService {
  constructor(
    @InjectRepository(BonTransport)
    private readonly bonRepository: Repository<BonTransport>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Camion)
    private readonly camionRepository: Repository<Camion>,
    @InjectRepository(BonLocation)
    private readonly bonLocationRepository: Repository<BonLocation>,
    @InjectRepository(Chauffeur)
    private readonly chauffeurRepository: Repository<Chauffeur>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Met à jour le statut du camion en fonction des transports/locations en cours
  private async updateCamionStatus(camionId: number): Promise<void> {
    if (!camionId) return;

    const transportEnCours = await this.bonRepository.count({
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

  // Met à jour le statut du chauffeur en fonction des transports/locations en cours
  private async updateChauffeurStatus(chauffeurId: number): Promise<void> {
    if (!chauffeurId) return;

    const transportEnCours = await this.bonRepository.count({
      where: { chauffeurId, statut: StatutBon.EN_COURS },
    });

    const locationEnCours = await this.bonLocationRepository.count({
      where: { chauffeurId, statut: StatutBon.EN_COURS },
    });

    const chauffeur = await this.chauffeurRepository.findOne({ where: { id: chauffeurId } });
    if (!chauffeur) return;

    if (chauffeur.statut === StatutChauffeur.CONGE || chauffeur.statut === StatutChauffeur.INDISPONIBLE) {
      return;
    }

    if (transportEnCours > 0 || locationEnCours > 0) {
      chauffeur.statut = StatutChauffeur.EN_MISSION;
    } else {
      chauffeur.statut = StatutChauffeur.DISPONIBLE;
    }

    await this.chauffeurRepository.save(chauffeur);
  }

  // Bons de transport
  async findAllBons(): Promise<BonTransport[]> {
    return this.bonRepository.find({
      relations: ['client', 'camion', 'chauffeur'],
      order: { dateCreation: 'DESC' },
      take: 100,
    });
  }

  async findOneBon(id: number): Promise<BonTransport> {
    const bon = await this.bonRepository.findOne({
      where: { id },
      relations: ['client', 'camion', 'chauffeur'],
    });
    if (!bon) {
      throw new NotFoundException(`Bon de transport #${id} non trouvé`);
    }
    return bon;
  }

  async createBon(data: Partial<BonTransport>, userId: number): Promise<BonTransport> {
    // Generate numero
    const today = new Date();
    const prefix = `BT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastBon = await this.bonRepository
      .createQueryBuilder('b')
      .where('b.numero LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('b.numero', 'DESC')
      .getOne();

    const nextNum = lastBon
      ? parseInt(lastBon.numero.substring(prefix.length + 1)) + 1
      : 1;

    const numero = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    // Auto-calculate montantHt if tonnage and prixTonne are provided
    if (data.tonnage && data.prixTonne && !data.montantHt) {
      data.montantHt = Number(data.tonnage) * Number(data.prixTonne);
    }

    const bon = this.bonRepository.create({
      ...data,
      numero,
      createdBy: userId,
    });

    const savedBon = await this.bonRepository.save(bon);

    // Mettre à jour les statuts
    if (savedBon.camionId) {
      await this.updateCamionStatus(savedBon.camionId);
    }
    if (savedBon.chauffeurId) {
      await this.updateChauffeurStatus(savedBon.chauffeurId);
    }

    // Notifier le magasinier pour préparer le camion
    try {
      const camion = savedBon.camionId
        ? await this.camionRepository.findOne({ where: { id: savedBon.camionId } })
        : null;
      const chauffeur = savedBon.chauffeurId
        ? await this.chauffeurRepository.findOne({ where: { id: savedBon.chauffeurId } })
        : null;

      await this.notificationsService.onTransportCreated(
        savedBon.id,
        savedBon.numero,
        camion?.immatriculation || 'Non assigné',
        chauffeur ? `${chauffeur.prenom} ${chauffeur.nom}` : 'Non assigné',
      );
    } catch (error) {
      // Log error but don't fail the creation
      console.error('Failed to send notification:', error);
    }

    return savedBon;
  }

  async updateBon(id: number, data: Partial<BonTransport>): Promise<BonTransport> {
    const bon = await this.findOneBon(id);
    const oldCamionId = bon.camionId;
    const oldChauffeurId = bon.chauffeurId;

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

    // Auto-calculate montantHt if tonnage or prixTonne changed
    if (bon.tonnage && bon.prixTonne) {
      bon.montantHt = Number(bon.tonnage) * Number(bon.prixTonne);
    }

    const savedBon = await this.bonRepository.save(bon);

    // Mettre à jour les statuts des camions concernés
    if (oldCamionId) {
      await this.updateCamionStatus(oldCamionId);
    }
    if (savedBon.camionId && savedBon.camionId !== oldCamionId) {
      await this.updateCamionStatus(savedBon.camionId);
    }

    // Mettre à jour les statuts des chauffeurs concernés
    if (oldChauffeurId) {
      await this.updateChauffeurStatus(oldChauffeurId);
    }
    if (savedBon.chauffeurId && savedBon.chauffeurId !== oldChauffeurId) {
      await this.updateChauffeurStatus(savedBon.chauffeurId);
    }

    // Return with fresh relations
    return this.findOneBon(id);
  }

  async updateStatut(id: number, statut: string): Promise<BonTransport> {
    const bon = await this.findOneBon(id);
    bon.statut = statut as any;
    if (statut === 'LIVRE') {
      bon.dateLivraison = new Date();
    }
    const savedBon = await this.bonRepository.save(bon);

    // Mettre à jour les statuts
    if (savedBon.camionId) {
      await this.updateCamionStatus(savedBon.camionId);
    }
    if (savedBon.chauffeurId) {
      await this.updateChauffeurStatus(savedBon.chauffeurId);
    }

    return savedBon;
  }

  // Clients
  async findAllClients(): Promise<Client[]> {
    return this.clientRepository.find({
      where: { actif: true },
      order: { raisonSociale: 'ASC' },
    });
  }

  async findOneClient(id: number): Promise<Client> {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException(`Client #${id} non trouvé`);
    }
    return client;
  }

  async createClient(data: Partial<Client>): Promise<Client> {
    const client = this.clientRepository.create(data);
    return this.clientRepository.save(client);
  }

  async updateClient(id: number, data: Partial<Client>): Promise<Client> {
    const client = await this.findOneClient(id);
    Object.assign(client, data);
    return this.clientRepository.save(client);
  }

  // Stats
  async getStats(): Promise<any> {
    const total = await this.bonRepository.count();
    const enCours = await this.bonRepository.count({ where: { statut: 'EN_COURS' as any } });
    const livres = await this.bonRepository.count({ where: { statut: 'LIVRE' as any } });

    return { total, enCours, livres };
  }

  // Statistiques de revenus par mois (12 derniers mois)
  async getRevenueStats(): Promise<{
    parMois: { mois: string; transport: number; location: number; total: number }[];
    parCamion: { camion: string; total: number }[];
    parClient: { client: string; total: number }[];
    totaux: { transport: number; location: number; total: number };
  }> {
    // Revenus transport par mois
    const transportParMois = await this.bonRepository
      .createQueryBuilder('b')
      .select("TO_CHAR(b.date_creation, 'YYYY-MM')", 'mois')
      .addSelect('COALESCE(SUM(b.montant_ht), 0)', 'montant')
      .where("b.statut IN ('LIVRE', 'FACTURE')")
      .andWhere("b.date_creation >= NOW() - INTERVAL '12 months'")
      .groupBy("TO_CHAR(b.date_creation, 'YYYY-MM')")
      .orderBy('mois', 'ASC')
      .getRawMany();

    // Revenus location par mois
    const locationParMois = await this.bonLocationRepository
      .createQueryBuilder('b')
      .select("TO_CHAR(b.created_at, 'YYYY-MM')", 'mois')
      .addSelect('COALESCE(SUM(b.montant_total), 0)', 'montant')
      .where("b.statut IN ('TERMINE', 'FACTURE')")
      .andWhere("b.created_at >= NOW() - INTERVAL '12 months'")
      .groupBy("TO_CHAR(b.created_at, 'YYYY-MM')")
      .orderBy('mois', 'ASC')
      .getRawMany();

    // Fusionner les données par mois
    const moisSet = new Set<string>();
    transportParMois.forEach(t => moisSet.add(t.mois));
    locationParMois.forEach(l => moisSet.add(l.mois));

    const parMois = Array.from(moisSet).sort().map(mois => {
      const transport = Number(transportParMois.find(t => t.mois === mois)?.montant || 0);
      const location = Number(locationParMois.find(l => l.mois === mois)?.montant || 0);
      return {
        mois,
        transport,
        location,
        total: transport + location,
      };
    });

    // Revenus par camion (top 10)
    const transportParCamion = await this.bonRepository
      .createQueryBuilder('b')
      .leftJoin('b.camion', 'c')
      .select('c.immatriculation', 'camion')
      .addSelect('COALESCE(SUM(b.montant_ht), 0)', 'total')
      .where("b.statut IN ('LIVRE', 'FACTURE')")
      .andWhere('c.id IS NOT NULL')
      .groupBy('c.immatriculation')
      .orderBy('total', 'DESC')
      .limit(10)
      .getRawMany();

    const parCamion = transportParCamion.map(r => ({
      camion: r.camion || 'Non assigné',
      total: Number(r.total),
    }));

    // Revenus par client (top 10)
    const transportParClient = await this.bonRepository
      .createQueryBuilder('b')
      .leftJoin('b.client', 'cl')
      .select('cl.raison_sociale', 'client')
      .addSelect('COALESCE(SUM(b.montant_ht), 0)', 'total')
      .where("b.statut IN ('LIVRE', 'FACTURE')")
      .andWhere('cl.id IS NOT NULL')
      .groupBy('cl.raison_sociale')
      .orderBy('total', 'DESC')
      .limit(10)
      .getRawMany();

    const parClient = transportParClient.map(r => ({
      client: r.client || 'Non assigné',
      total: Number(r.total),
    }));

    // Totaux globaux
    const totalTransport = await this.bonRepository
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.montant_ht), 0)', 'total')
      .where("b.statut IN ('LIVRE', 'FACTURE')")
      .getRawOne();

    const totalLocation = await this.bonLocationRepository
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.montant_total), 0)', 'total')
      .where("b.statut IN ('TERMINE', 'FACTURE')")
      .getRawOne();

    const totaux = {
      transport: Number(totalTransport?.total || 0),
      location: Number(totalLocation?.total || 0),
      total: Number(totalTransport?.total || 0) + Number(totalLocation?.total || 0),
    };

    return { parMois, parCamion, parClient, totaux };
  }
}
