import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Client, ContactClient, BonTransport, BonLocation } from '../database/entities';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ContactClient)
    private readonly contactRepository: Repository<ContactClient>,
    @InjectRepository(BonTransport)
    private readonly bonTransportRepository: Repository<BonTransport>,
    @InjectRepository(BonLocation)
    private readonly bonLocationRepository: Repository<BonLocation>,
  ) {}

  async findAll(): Promise<Client[]> {
    return this.clientRepository.find({
      where: { actif: true },
      relations: ['contacts'],
      order: { raisonSociale: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Client> {
    const client = await this.clientRepository.findOne({
      where: { id },
      relations: ['contacts'],
    });
    if (!client) {
      throw new NotFoundException(`Client #${id} non trouvé`);
    }
    return client;
  }

  async create(data: Partial<Client>): Promise<Client> {
    // Validation des données obligatoires
    if (!data.code || !data.raisonSociale) {
      throw new BadRequestException('Le code et la raison sociale sont obligatoires');
    }

    // Vérifier que le code est unique
    const existing = await this.clientRepository.findOne({ where: { code: data.code } });
    if (existing) {
      throw new BadRequestException(`Un client avec le code ${data.code} existe déjà`);
    }

    // Validation du format email si fourni
    if (data.email && !this.isValidEmail(data.email)) {
      throw new BadRequestException('Format d\'email invalide');
    }

    // Validation du format téléphone sénégalais si fourni
    if (data.telephone && !this.isValidSenegalPhone(data.telephone)) {
      throw new BadRequestException('Format de téléphone invalide. Utilisez le format sénégalais (+221 XX XXX XX XX)');
    }

    const client = this.clientRepository.create(data);
    return this.clientRepository.save(client);
  }

  async update(id: number, data: Partial<Client>): Promise<Client> {
    const client = await this.findOne(id);

    // Vérifier l'unicité du code si modifié
    if (data.code && data.code !== client.code) {
      const existing = await this.clientRepository.findOne({ where: { code: data.code } });
      if (existing) {
        throw new BadRequestException(`Un client avec le code ${data.code} existe déjà`);
      }
    }

    // Validation du format email si fourni
    if (data.email && !this.isValidEmail(data.email)) {
      throw new BadRequestException('Format d\'email invalide');
    }

    // Validation du format téléphone sénégalais si fourni
    if (data.telephone && !this.isValidSenegalPhone(data.telephone)) {
      throw new BadRequestException('Format de téléphone invalide. Utilisez le format sénégalais (+221 XX XXX XX XX)');
    }

    Object.assign(client, data);
    return this.clientRepository.save(client);
  }

  async remove(id: number): Promise<void> {
    const client = await this.findOne(id);
    client.actif = false;
    await this.clientRepository.save(client);
  }

  async getHistorique(id: number): Promise<{
    transports: BonTransport[];
    locations: BonLocation[];
    stats: any;
  }> {
    await this.findOne(id);

    const [transports, locations] = await Promise.all([
      this.bonTransportRepository.find({
        where: { clientId: id },
        relations: ['camion', 'chauffeur'],
        order: { createdAt: 'DESC' },
      }),
      this.bonLocationRepository.find({
        where: { clientId: id },
        relations: ['camion', 'chauffeur'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    // Statistiques
    const totalTransports = transports.length;
    const totalLocations = locations.length;

    const revenusTransport = transports
      .filter(t => t.statut === 'LIVRE' || t.statut === 'FACTURE')
      .reduce((sum, t) => sum + (Number(t.montantHt) || 0), 0);

    const revenusLocation = locations
      .filter(l => l.statut === 'LIVRE' || l.statut === 'FACTURE')
      .reduce((sum, l) => sum + (Number(l.montantTotal) || 0), 0);

    const transportsEnCours = transports.filter(t => t.statut === 'EN_COURS').length;
    const locationsEnCours = locations.filter(l => l.statut === 'EN_COURS').length;

    return {
      transports,
      locations,
      stats: {
        totalTransports,
        totalLocations,
        totalOperations: totalTransports + totalLocations,
        revenusTransport,
        revenusLocation,
        totalRevenus: revenusTransport + revenusLocation,
        enCours: transportsEnCours + locationsEnCours,
      },
    };
  }

  async generateCode(): Promise<string> {
    const lastClient = await this.clientRepository.find({
      order: { id: 'DESC' },
      take: 1,
    });

    const nextNumber = lastClient.length > 0 ? lastClient[0].id + 1 : 1;
    return `CLI-${String(nextNumber).padStart(3, '0')}`;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidSenegalPhone(phone: string): boolean {
    // Format sénégalais:
    // - Mobiles: +221 7X XXX XX XX (70-78)
    // - Fixes: +221 33 XXX XX XX
    // Avec ou sans espaces
    const cleanPhone = phone.replace(/\s/g, '');
    const phoneRegex = /^(\+221)?(7[0-8]|33)\d{7}$/;
    return phoneRegex.test(cleanPhone);
  }

  // ============================================
  // GESTION DES CONTACTS
  // ============================================

  async getContacts(clientId: number): Promise<ContactClient[]> {
    await this.findOne(clientId); // Vérifie que le client existe
    return this.contactRepository.find({
      where: { clientId, actif: true },
      order: { estPrincipal: 'DESC', nom: 'ASC' },
    });
  }

  async addContact(clientId: number, data: Partial<ContactClient>): Promise<ContactClient> {
    await this.findOne(clientId); // Vérifie que le client existe

    // Si c'est le premier contact ou s'il est marqué comme principal
    if (data.estPrincipal) {
      // Retirer le statut principal des autres contacts
      await this.contactRepository.update(
        { clientId, estPrincipal: true },
        { estPrincipal: false },
      );
    }

    const contact = this.contactRepository.create({
      ...data,
      clientId,
    });
    return this.contactRepository.save(contact);
  }

  async updateContact(clientId: number, contactId: number, data: Partial<ContactClient>): Promise<ContactClient> {
    await this.findOne(clientId); // Vérifie que le client existe

    const contact = await this.contactRepository.findOne({
      where: { id: contactId, clientId },
    });
    if (!contact) {
      throw new NotFoundException(`Contact #${contactId} non trouvé pour ce client`);
    }

    // Si on définit ce contact comme principal
    if (data.estPrincipal && !contact.estPrincipal) {
      await this.contactRepository.update(
        { clientId, estPrincipal: true },
        { estPrincipal: false },
      );
    }

    Object.assign(contact, data);
    return this.contactRepository.save(contact);
  }

  async removeContact(clientId: number, contactId: number): Promise<void> {
    await this.findOne(clientId); // Vérifie que le client existe

    const contact = await this.contactRepository.findOne({
      where: { id: contactId, clientId },
    });
    if (!contact) {
      throw new NotFoundException(`Contact #${contactId} non trouvé pour ce client`);
    }

    // Désactiver au lieu de supprimer
    contact.actif = false;
    await this.contactRepository.save(contact);
  }

  async setContactPrincipal(clientId: number, contactId: number): Promise<ContactClient> {
    await this.findOne(clientId); // Vérifie que le client existe

    const contact = await this.contactRepository.findOne({
      where: { id: contactId, clientId },
    });
    if (!contact) {
      throw new NotFoundException(`Contact #${contactId} non trouvé pour ce client`);
    }

    // Retirer le statut principal des autres contacts
    await this.contactRepository.update(
      { clientId, estPrincipal: true },
      { estPrincipal: false },
    );

    // Définir ce contact comme principal
    contact.estPrincipal = true;
    return this.contactRepository.save(contact);
  }
}
