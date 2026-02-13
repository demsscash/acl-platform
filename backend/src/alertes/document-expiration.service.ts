import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull, Not, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Alerte, Camion, Chauffeur, User } from '../database/entities';
import { TypeAlerte, NiveauAlerte, StatutAlerte } from '../database/entities/alerte.entity';
import { EmailService } from '../email/email.service';

export interface DocumentExpiration {
  type: 'camion' | 'chauffeur';
  entityId: number;
  entityName: string;
  documentType: string;
  expirationDate: Date;
  daysUntilExpiration: number;
}

@Injectable()
export class DocumentExpirationService {
  private readonly logger = new Logger(DocumentExpirationService.name);

  constructor(
    @InjectRepository(Alerte)
    private readonly alerteRepository: Repository<Alerte>,
    @InjectRepository(Camion)
    private readonly camionRepository: Repository<Camion>,
    @InjectRepository(Chauffeur)
    private readonly chauffeurRepository: Repository<Chauffeur>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Vérifie les documents expirants tous les jours à 7h
   */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async checkExpiringDocuments(): Promise<void> {
    this.logger.log('Vérification des documents expirants...');

    const expirations = await this.getExpiringDocuments(30); // 30 jours

    for (const exp of expirations) {
      await this.createOrUpdateAlert(exp);
    }

    this.logger.log(`${expirations.length} documents proches de l'expiration trouvés`);
  }

  /**
   * Récupère tous les documents qui expirent dans les X prochains jours
   */
  async getExpiringDocuments(daysAhead: number = 30): Promise<DocumentExpiration[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const expirations: DocumentExpiration[] = [];

    // Vérifier les camions
    const camions = await this.camionRepository.find({
      where: { actif: true },
    });

    for (const camion of camions) {
      // Assurance
      if (camion.dateExpirationAssurance) {
        const days = this.getDaysUntil(camion.dateExpirationAssurance);
        if (days <= daysAhead) {
          expirations.push({
            type: 'camion',
            entityId: camion.id,
            entityName: `${camion.immatriculation} (${camion.numeroInterne})`,
            documentType: 'Assurance',
            expirationDate: camion.dateExpirationAssurance,
            daysUntilExpiration: days,
          });
        }
      }

      // Visite technique
      if (camion.dateExpirationVisiteTechnique) {
        const days = this.getDaysUntil(camion.dateExpirationVisiteTechnique);
        if (days <= daysAhead) {
          expirations.push({
            type: 'camion',
            entityId: camion.id,
            entityName: `${camion.immatriculation} (${camion.numeroInterne})`,
            documentType: 'Visite technique',
            expirationDate: camion.dateExpirationVisiteTechnique,
            daysUntilExpiration: days,
          });
        }
      }

      // Licence
      if (camion.dateExpirationLicence) {
        const days = this.getDaysUntil(camion.dateExpirationLicence);
        if (days <= daysAhead) {
          expirations.push({
            type: 'camion',
            entityId: camion.id,
            entityName: `${camion.immatriculation} (${camion.numeroInterne})`,
            documentType: 'Licence',
            expirationDate: camion.dateExpirationLicence,
            daysUntilExpiration: days,
          });
        }
      }

      // Révision prévue
      if (camion.dateProchaineRevision) {
        const days = this.getDaysUntil(camion.dateProchaineRevision);
        if (days <= daysAhead) {
          expirations.push({
            type: 'camion',
            entityId: camion.id,
            entityName: `${camion.immatriculation} (${camion.numeroInterne})`,
            documentType: 'Révision',
            expirationDate: camion.dateProchaineRevision,
            daysUntilExpiration: days,
          });
        }
      }
    }

    // Vérifier les chauffeurs
    const chauffeurs = await this.chauffeurRepository.find({
      where: { actif: true },
    });

    for (const chauffeur of chauffeurs) {
      if (chauffeur.dateExpirationPermis) {
        const days = this.getDaysUntil(chauffeur.dateExpirationPermis);
        if (days <= daysAhead) {
          expirations.push({
            type: 'chauffeur',
            entityId: chauffeur.id,
            entityName: `${chauffeur.prenom} ${chauffeur.nom} (${chauffeur.matricule})`,
            documentType: 'Permis de conduire',
            expirationDate: chauffeur.dateExpirationPermis,
            daysUntilExpiration: days,
          });
        }
      }
    }

    // Trier par urgence (jours restants)
    return expirations.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
  }

  /**
   * Crée ou met à jour une alerte pour un document expirant
   */
  private async createOrUpdateAlert(exp: DocumentExpiration): Promise<void> {
    const referenceType = exp.type === 'camion' ? 'camion_document' : 'chauffeur_document';
    const referenceId = exp.entityId;
    const niveau = this.getAlertLevel(exp.daysUntilExpiration);

    // Vérifier si une alerte existe déjà pour ce document
    const existingAlert = await this.alerteRepository.findOne({
      where: {
        referenceType,
        referenceId,
        titre: `${exp.documentType} - ${exp.entityName}`,
        statut: Not(StatutAlerte.RESOLUE),
      },
    });

    if (existingAlert) {
      // Mettre à jour le message avec les jours restants
      const wasNotCritical = existingAlert.niveau !== NiveauAlerte.CRITICAL;
      existingAlert.message = this.getAlertMessage(exp);
      existingAlert.niveau = niveau;
      await this.alerteRepository.save(existingAlert);

      // Envoyer un email si l'alerte devient critique
      if (wasNotCritical && niveau === NiveauAlerte.CRITICAL) {
        await this.sendAlertEmail(existingAlert);
      }
      return;
    }

    // Créer une nouvelle alerte
    const alerte = this.alerteRepository.create({
      typeAlerte: TypeAlerte.DOCUMENT,
      niveau,
      camionId: exp.type === 'camion' ? exp.entityId : undefined,
      titre: `${exp.documentType} - ${exp.entityName}`,
      message: this.getAlertMessage(exp),
      referenceId,
      referenceType,
      statut: StatutAlerte.ACTIVE,
    });

    const savedAlerte = await this.alerteRepository.save(alerte);

    // Envoyer un email pour les nouvelles alertes critiques
    if (niveau === NiveauAlerte.CRITICAL) {
      await this.sendAlertEmail(savedAlerte);
    }
  }

  /**
   * Envoie un email de notification pour une alerte
   */
  private async sendAlertEmail(alerte: Alerte): Promise<void> {
    if (!this.emailService.isEmailConfigured()) {
      this.logger.warn('Email non configuré - notification non envoyée');
      return;
    }

    try {
      // Récupérer les emails des utilisateurs DIRECTION et COORDINATEUR
      const admins = await this.userRepository.find({
        where: {
          role: In(['DIRECTION', 'COORDINATEUR']),
          actif: true,
        },
        select: ['email'],
      });

      const emails = admins.map(u => u.email).filter(e => e);

      if (emails.length === 0) {
        this.logger.warn('Aucun destinataire email trouvé pour la notification');
        return;
      }

      // Récupérer les infos du camion si applicable
      let camionInfo = '';
      if (alerte.camionId) {
        const camion = await this.camionRepository.findOne({ where: { id: alerte.camionId } });
        if (camion) {
          camionInfo = `${camion.immatriculation} (${camion.numeroInterne})`;
        }
      }

      await this.emailService.sendAlertNotification(emails, {
        titre: alerte.titre,
        message: alerte.message || '',
        niveau: alerte.niveau,
        typeAlerte: alerte.typeAlerte,
        camion: camionInfo || undefined,
      });

      this.logger.log(`Email de notification envoyé à ${emails.length} destinataire(s)`);
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi de l\'email de notification:', error);
    }
  }

  private getDaysUntil(date: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    return Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getAlertLevel(daysUntil: number): NiveauAlerte {
    if (daysUntil <= 0) return NiveauAlerte.CRITICAL;
    if (daysUntil <= 7) return NiveauAlerte.CRITICAL;
    if (daysUntil <= 15) return NiveauAlerte.WARNING;
    return NiveauAlerte.INFO;
  }

  private getAlertMessage(exp: DocumentExpiration): string {
    if (exp.daysUntilExpiration < 0) {
      return `${exp.documentType} EXPIRÉ depuis ${Math.abs(exp.daysUntilExpiration)} jour(s) !`;
    }
    if (exp.daysUntilExpiration === 0) {
      return `${exp.documentType} expire AUJOURD'HUI !`;
    }
    return `${exp.documentType} expire dans ${exp.daysUntilExpiration} jour(s) (${new Date(exp.expirationDate).toLocaleDateString('fr-FR')})`;
  }

  /**
   * Endpoint pour déclencher manuellement la vérification
   */
  async runCheck(): Promise<{ alertesCreees: number; documentsExpirants: DocumentExpiration[] }> {
    const expirations = await this.getExpiringDocuments(30);

    // Résoudre les alertes pour les documents qui ne sont plus expirants
    await this.resolveOutdatedAlerts(expirations);

    for (const exp of expirations) {
      await this.createOrUpdateAlert(exp);
    }

    return {
      alertesCreees: expirations.length,
      documentsExpirants: expirations,
    };
  }

  /**
   * Résout les alertes pour les documents qui ont été mis à jour
   * et ne sont plus dans la liste des documents expirants
   */
  private async resolveOutdatedAlerts(currentExpirations: DocumentExpiration[]): Promise<void> {
    // Récupérer toutes les alertes de type DOCUMENT qui sont actives ou acquittées
    const activeAlerts = await this.alerteRepository.find({
      where: {
        typeAlerte: TypeAlerte.DOCUMENT,
        statut: In([StatutAlerte.ACTIVE, StatutAlerte.ACQUITTEE]),
      },
    });

    for (const alert of activeAlerts) {
      // Vérifier si cette alerte a un document correspondant dans la liste actuelle
      const stillExpiring = currentExpirations.some(exp => {
        const matchesTitle = alert.titre === `${exp.documentType} - ${exp.entityName}`;
        const matchesRef = alert.referenceId === exp.entityId &&
          ((alert.referenceType === 'camion_document' && exp.type === 'camion') ||
           (alert.referenceType === 'chauffeur_document' && exp.type === 'chauffeur'));
        return matchesTitle || matchesRef;
      });

      // Si le document n'est plus dans la liste des expirations, résoudre l'alerte
      if (!stillExpiring) {
        alert.statut = StatutAlerte.RESOLUE;
        alert.resolueAt = new Date();
        await this.alerteRepository.save(alert);
        this.logger.log(`Alerte résolue automatiquement: ${alert.titre}`);
      }
    }
  }
}
