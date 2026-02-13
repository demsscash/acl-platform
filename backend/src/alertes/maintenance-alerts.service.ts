import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Alerte, Maintenance, Camion, User } from '../database/entities';
import { TypeAlerte, NiveauAlerte, StatutAlerte } from '../database/entities/alerte.entity';
import { StatutMaintenance } from '../database/entities/maintenance.entity';
import { EmailService } from '../email/email.service';

export interface MaintenanceAlert {
  maintenanceId: number;
  camionImmat: string;
  camionNumInterne: string;
  titre: string;
  datePlanifiee: Date;
  daysUntil: number;
  isOverdue: boolean;
}

@Injectable()
export class MaintenanceAlertsService {
  private readonly logger = new Logger(MaintenanceAlertsService.name);

  constructor(
    @InjectRepository(Alerte)
    private readonly alerteRepository: Repository<Alerte>,
    @InjectRepository(Maintenance)
    private readonly maintenanceRepository: Repository<Maintenance>,
    @InjectRepository(Camion)
    private readonly camionRepository: Repository<Camion>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Verifie les maintenances planifiees tous les jours a 7h30
   */
  @Cron('0 30 7 * * *')
  async checkUpcomingMaintenance(): Promise<void> {
    this.logger.log('Verification des maintenances planifiees...');

    const upcomingMaintenance = await this.getUpcomingMaintenance(7); // 7 jours a l'avance
    const overdueMaintenance = await this.getOverdueMaintenance();

    const allAlerts = [...upcomingMaintenance, ...overdueMaintenance];

    for (const maintenance of allAlerts) {
      await this.createOrUpdateMaintenanceAlert(maintenance);
    }

    // Send email for overdue maintenance
    if (overdueMaintenance.length > 0) {
      await this.sendMaintenanceEmail(overdueMaintenance, 'en retard');
    }

    // Send email for maintenance due tomorrow
    const dueTomorrow = upcomingMaintenance.filter(m => m.daysUntil === 1);
    if (dueTomorrow.length > 0) {
      await this.sendMaintenanceEmail(dueTomorrow, 'prevue demain');
    }

    this.logger.log(`${allAlerts.length} alertes de maintenance detectees`);
  }

  /**
   * Recupere les maintenances planifiees dans les X prochains jours
   */
  async getUpcomingMaintenance(daysAhead: number = 7): Promise<MaintenanceAlert[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);
    futureDate.setHours(23, 59, 59, 999);

    const maintenances = await this.maintenanceRepository.find({
      where: {
        statut: StatutMaintenance.PLANIFIE,
        datePlanifiee: Between(today, futureDate),
      },
      relations: ['camion'],
    });

    return maintenances.map(m => ({
      maintenanceId: m.id,
      camionImmat: m.camion?.immatriculation || 'N/A',
      camionNumInterne: m.camion?.numeroInterne || '',
      titre: m.titre,
      datePlanifiee: m.datePlanifiee,
      daysUntil: this.getDaysUntil(m.datePlanifiee),
      isOverdue: false,
    }));
  }

  /**
   * Recupere les maintenances en retard (date passee mais toujours planifiee)
   */
  async getOverdueMaintenance(): Promise<MaintenanceAlert[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maintenances = await this.maintenanceRepository.find({
      where: {
        statut: StatutMaintenance.PLANIFIE,
        datePlanifiee: LessThanOrEqual(today),
      },
      relations: ['camion'],
    });

    return maintenances.map(m => ({
      maintenanceId: m.id,
      camionImmat: m.camion?.immatriculation || 'N/A',
      camionNumInterne: m.camion?.numeroInterne || '',
      titre: m.titre,
      datePlanifiee: m.datePlanifiee,
      daysUntil: this.getDaysUntil(m.datePlanifiee),
      isOverdue: true,
    }));
  }

  /**
   * Cree ou met a jour une alerte de maintenance
   */
  private async createOrUpdateMaintenanceAlert(maintenance: MaintenanceAlert): Promise<void> {
    let niveau: NiveauAlerte;
    let message: string;

    if (maintenance.isOverdue) {
      niveau = NiveauAlerte.CRITICAL;
      message = `MAINTENANCE EN RETARD: ${maintenance.titre} pour ${maintenance.camionImmat} - Prevue le ${new Date(maintenance.datePlanifiee).toLocaleDateString('fr-FR')}`;
    } else if (maintenance.daysUntil <= 1) {
      niveau = NiveauAlerte.WARNING;
      message = maintenance.daysUntil === 0
        ? `Maintenance prevue AUJOURD'HUI: ${maintenance.titre} pour ${maintenance.camionImmat}`
        : `Maintenance prevue DEMAIN: ${maintenance.titre} pour ${maintenance.camionImmat}`;
    } else {
      niveau = NiveauAlerte.INFO;
      message = `Maintenance dans ${maintenance.daysUntil} jours: ${maintenance.titre} pour ${maintenance.camionImmat} - ${new Date(maintenance.datePlanifiee).toLocaleDateString('fr-FR')}`;
    }

    // Check for existing alert
    const existingAlert = await this.alerteRepository.findOne({
      where: {
        typeAlerte: TypeAlerte.MAINTENANCE,
        referenceType: 'maintenance',
        referenceId: maintenance.maintenanceId,
        statut: In([StatutAlerte.ACTIVE, StatutAlerte.ACQUITTEE]),
      },
    });

    if (existingAlert) {
      existingAlert.message = message;
      existingAlert.niveau = niveau;
      await this.alerteRepository.save(existingAlert);
      return;
    }

    // Get camion for the alert
    const camion = await this.camionRepository.findOne({
      where: { immatriculation: maintenance.camionImmat },
    });

    // Create new alert
    const alerte = this.alerteRepository.create({
      typeAlerte: TypeAlerte.MAINTENANCE,
      niveau,
      camionId: camion?.id,
      titre: `Maintenance - ${maintenance.camionImmat}`,
      message,
      referenceId: maintenance.maintenanceId,
      referenceType: 'maintenance',
      statut: StatutAlerte.ACTIVE,
    });

    await this.alerteRepository.save(alerte);
  }

  /**
   * Envoie un email pour les alertes de maintenance
   */
  private async sendMaintenanceEmail(maintenances: MaintenanceAlert[], status: string): Promise<void> {
    if (!this.emailService.isEmailConfigured()) {
      this.logger.warn('Email non configure - notification non envoyee');
      return;
    }

    try {
      // Get MAINTENANCIER and RESPONSABLE_LOGISTIQUE emails
      const users = await this.userRepository.find({
        where: {
          role: In(['ADMIN', 'RESPONSABLE_LOGISTIQUE', 'MAINTENANCIER']),
          actif: true,
        },
        select: ['email'],
      });

      const emails = users.map(u => u.email).filter(e => e);

      if (emails.length === 0) {
        this.logger.warn('Aucun destinataire email trouve pour les alertes maintenance');
        return;
      }

      const maintenanceList = maintenances.map(m =>
        `- ${m.titre} (${m.camionImmat}) - ${new Date(m.datePlanifiee).toLocaleDateString('fr-FR')}`
      ).join('\n');

      const niveau = status === 'en retard' ? NiveauAlerte.CRITICAL : NiveauAlerte.WARNING;

      await this.emailService.sendAlertNotification(emails, {
        titre: `MAINTENANCE ${status.toUpperCase()} - ${maintenances.length} intervention(s)`,
        message: `Les maintenances suivantes sont ${status}:\n\n${maintenanceList}`,
        niveau,
        typeAlerte: TypeAlerte.MAINTENANCE,
      });

      this.logger.log(`Email d'alerte maintenance envoye a ${emails.length} destinataire(s)`);
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi de l\'email d\'alerte maintenance:', error);
    }
  }

  private getDaysUntil(date: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    return Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Endpoint pour declencher manuellement la verification
   */
  async runCheck(): Promise<{ upcoming: MaintenanceAlert[]; overdue: MaintenanceAlert[] }> {
    const upcoming = await this.getUpcomingMaintenance(7);
    const overdue = await this.getOverdueMaintenance();

    // Process all alerts
    for (const maintenance of [...upcoming, ...overdue]) {
      await this.createOrUpdateMaintenanceAlert(maintenance);
    }

    // Resolve alerts for completed maintenance
    await this.resolveCompletedMaintenanceAlerts();

    return { upcoming, overdue };
  }

  /**
   * Resout les alertes pour les maintenances completees
   */
  private async resolveCompletedMaintenanceAlerts(): Promise<void> {
    const activeAlerts = await this.alerteRepository.find({
      where: {
        typeAlerte: TypeAlerte.MAINTENANCE,
        referenceType: 'maintenance',
        statut: In([StatutAlerte.ACTIVE, StatutAlerte.ACQUITTEE]),
      },
    });

    for (const alert of activeAlerts) {
      const maintenance = await this.maintenanceRepository.findOne({
        where: { id: alert.referenceId },
      });

      // Resolve alert if maintenance is completed or cancelled
      if (!maintenance || maintenance.statut !== StatutMaintenance.PLANIFIE) {
        alert.statut = StatutAlerte.RESOLUE;
        alert.resolueAt = new Date();
        await this.alerteRepository.save(alert);
        this.logger.log(`Alerte maintenance resolue: ${alert.titre}`);
      }
    }
  }
}
