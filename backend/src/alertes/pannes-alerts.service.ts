import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Alerte, Panne, User } from '../database/entities';
import { TypeAlerte, NiveauAlerte, StatutAlerte } from '../database/entities/alerte.entity';
import { StatutPanne } from '../database/entities/panne.entity';
import { EmailService } from '../email/email.service';

export interface PanneAlert {
  panneId: number;
  numeroPanne: string;
  camionImmat: string;
  description: string;
  datePanne: Date;
  daysOpen: number;
  statut: string;
  priorite: string;
}

@Injectable()
export class PannesAlertsService {
  private readonly logger = new Logger(PannesAlertsService.name);

  // Seuil en jours pour considerer une panne comme non resolue trop longtemps
  private static readonly SEUIL_JOURS = 14;

  constructor(
    @InjectRepository(Alerte)
    private readonly alerteRepository: Repository<Alerte>,
    @InjectRepository(Panne)
    private readonly panneRepository: Repository<Panne>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Verifie tous les jours a 9h les pannes non resolues depuis plus de 2 semaines
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkUnresolvedPannes(): Promise<void> {
    this.logger.log('Verification des pannes non resolues depuis plus de 2 semaines...');

    const unresolvedPannes = await this.getUnresolvedPannes();

    for (const panne of unresolvedPannes) {
      await this.createOrUpdatePanneAlert(panne);
    }

    if (unresolvedPannes.length > 0) {
      await this.sendUnresolvedPannesEmail(unresolvedPannes);
    }

    // Resoudre les anciennes alertes pour les pannes maintenant cloturees
    await this.resolveCompletedPanneAlerts();

    this.logger.log(`${unresolvedPannes.length} pannes non resolues detectees`);
  }

  /**
   * Recupere toutes les pannes ouvertes depuis plus de SEUIL_JOURS jours
   */
  async getUnresolvedPannes(): Promise<PanneAlert[]> {
    const seuil = new Date();
    seuil.setDate(seuil.getDate() - PannesAlertsService.SEUIL_JOURS);

    const pannes = await this.panneRepository.find({
      where: {
        datePanne: LessThan(seuil),
        statut: In([
          StatutPanne.DECLAREE,
          StatutPanne.EN_DIAGNOSTIC,
          StatutPanne.EN_ATTENTE_PIECES,
          StatutPanne.EN_REPARATION,
        ]),
      },
      relations: ['camion'],
      order: { datePanne: 'ASC' },
    });

    return pannes.map(p => ({
      panneId: p.id,
      numeroPanne: p.numeroPanne,
      camionImmat: p.camion?.immatriculation || 'N/A',
      description: p.description,
      datePanne: p.datePanne,
      daysOpen: this.getDaysOpen(p.datePanne),
      statut: p.statut,
      priorite: p.priorite,
    }));
  }

  /**
   * Cree ou met a jour une alerte pour une panne non resolue
   */
  private async createOrUpdatePanneAlert(panne: PanneAlert): Promise<void> {
    const niveau = panne.daysOpen >= 30 ? NiveauAlerte.CRITICAL : NiveauAlerte.WARNING;
    const message = `Panne ${panne.numeroPanne} non resolue depuis ${panne.daysOpen} jours - ${panne.camionImmat} - Statut: ${panne.statut}`;

    const existingAlert = await this.alerteRepository.findOne({
      where: {
        typeAlerte: TypeAlerte.MAINTENANCE,
        referenceType: 'panne',
        referenceId: panne.panneId,
        statut: In([StatutAlerte.ACTIVE, StatutAlerte.ACQUITTEE]),
      },
    });

    if (existingAlert) {
      existingAlert.message = message;
      existingAlert.niveau = niveau;
      await this.alerteRepository.save(existingAlert);
      return;
    }

    const panneRecord = await this.panneRepository.findOne({
      where: { id: panne.panneId },
    });

    const alerte = this.alerteRepository.create({
      typeAlerte: TypeAlerte.MAINTENANCE,
      niveau,
      camionId: panneRecord?.camionId,
      titre: `Panne non resolue - ${panne.camionImmat}`,
      message,
      referenceId: panne.panneId,
      referenceType: 'panne',
      statut: StatutAlerte.ACTIVE,
    });

    await this.alerteRepository.save(alerte);
  }

  /**
   * Envoie un email pour les pannes non resolues
   */
  private async sendUnresolvedPannesEmail(pannes: PanneAlert[]): Promise<void> {
    if (!this.emailService.isEmailConfigured()) {
      this.logger.warn('Email non configure - notification pannes non envoyee');
      return;
    }

    try {
      const users = await this.userRepository.find({
        where: {
          role: In(['ADMIN', 'RESPONSABLE_LOGISTIQUE', 'MAINTENANCIER']),
          actif: true,
        },
        select: ['email'],
      });

      const emails = users.map(u => u.email).filter(e => e);

      if (emails.length === 0) {
        this.logger.warn('Aucun destinataire email trouve pour les alertes pannes');
        return;
      }

      const pannesList = pannes.map(p =>
        `- ${p.numeroPanne} (${p.camionImmat}) - ${p.daysOpen} jours - ${p.statut}`
      ).join('\n');

      await this.emailService.sendAlertNotification(emails, {
        titre: `PANNES NON RESOLUES - ${pannes.length} panne(s) ouverte(s) depuis plus de 2 semaines`,
        message: `Les pannes suivantes sont ouvertes depuis plus de ${PannesAlertsService.SEUIL_JOURS} jours et necessitent une action:\n\n${pannesList}`,
        niveau: NiveauAlerte.WARNING,
        typeAlerte: TypeAlerte.MAINTENANCE,
      });

      this.logger.log(`Email d'alerte pannes envoye a ${emails.length} destinataire(s)`);
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi de l\'email d\'alerte pannes:', error);
    }
  }

  /**
   * Resout les alertes pour les pannes desormais cloturees ou reparees
   */
  private async resolveCompletedPanneAlerts(): Promise<void> {
    const activeAlerts = await this.alerteRepository.find({
      where: {
        typeAlerte: TypeAlerte.MAINTENANCE,
        referenceType: 'panne',
        statut: In([StatutAlerte.ACTIVE, StatutAlerte.ACQUITTEE]),
      },
    });

    for (const alert of activeAlerts) {
      const panne = await this.panneRepository.findOne({
        where: { id: alert.referenceId },
      });

      if (!panne || panne.statut === StatutPanne.REPAREE || panne.statut === StatutPanne.CLOTUREE) {
        alert.statut = StatutAlerte.RESOLUE;
        alert.resolueAt = new Date();
        await this.alerteRepository.save(alert);
        this.logger.log(`Alerte panne resolue: ${alert.titre}`);
      }
    }
  }

  private getDaysOpen(date: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Endpoint pour declencher manuellement la verification
   */
  async runCheck(): Promise<{ alertesCreees: number; pannesNonResolues: PanneAlert[] }> {
    const unresolvedPannes = await this.getUnresolvedPannes();

    for (const panne of unresolvedPannes) {
      await this.createOrUpdatePanneAlert(panne);
    }

    await this.resolveCompletedPanneAlerts();

    return {
      alertesCreees: unresolvedPannes.length,
      pannesNonResolues: unresolvedPannes,
    };
  }
}
