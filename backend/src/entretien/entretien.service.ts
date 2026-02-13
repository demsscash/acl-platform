import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In, Not } from 'typeorm';
import { Maintenance, TypeMaintenance, StatutMaintenance, PrioriteMaintenance } from '../database/entities/maintenance.entity';
import { Camion, StatutCamion } from '../database/entities/camion.entity';
import { User, RoleUtilisateur } from '../database/entities/user.entity';
import { NiveauAlerte, TypeAlerte } from '../database/entities/alerte.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { AlertesService } from '../alertes/alertes.service';
import { EmailService } from '../email/email.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

// Roles to notify for maintenance events (excluding COMPTABLE and COORDINATEUR)
const MAINTENANCE_NOTIFICATION_ROLES = [
  RoleUtilisateur.ADMIN,
  RoleUtilisateur.RESPONSABLE_LOGISTIQUE,
  RoleUtilisateur.MAGASINIER,
  RoleUtilisateur.MAINTENANCIER,
];

export interface SearchMaintenanceDto {
  search?: string;
  camionId?: number;
  type?: TypeMaintenance;
  statut?: StatutMaintenance;
  priorite?: PrioriteMaintenance;
  dateDebut?: string;
  dateFin?: string;
}

@Injectable()
export class EntretienService {
  constructor(
    @InjectRepository(Maintenance)
    private readonly maintenanceRepo: Repository<Maintenance>,
    @InjectRepository(Camion)
    private readonly camionRepo: Repository<Camion>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly alertesService: AlertesService,
    private readonly emailService: EmailService,
  ) {}

  // Generate unique numero
  private async generateNumero(): Promise<string> {
    const today = new Date();
    const prefix = `MAINT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastMaint = await this.maintenanceRepo
      .createQueryBuilder('m')
      .where('m.numero LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('m.numero', 'DESC')
      .getOne();

    const nextNum = lastMaint
      ? parseInt(lastMaint.numero.substring(prefix.length + 1)) + 1
      : 1;

    return `${prefix}-${String(nextNum).padStart(4, '0')}`;
  }

  // Find all with search and filters
  async findAll(filters: SearchMaintenanceDto = {}): Promise<Maintenance[]> {
    const query = this.maintenanceRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.camion', 'camion')
      .leftJoinAndSelect('m.technicien', 'technicien')
      .leftJoinAndSelect('m.createdByUser', 'createdBy');

    if (filters.search) {
      query.andWhere(
        '(m.numero ILIKE :search OR m.titre ILIKE :search OR camion.immatriculation ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.camionId) {
      query.andWhere('m.camionId = :camionId', { camionId: filters.camionId });
    }

    if (filters.type) {
      query.andWhere('m.type = :type', { type: filters.type });
    }

    if (filters.statut) {
      query.andWhere('m.statut = :statut', { statut: filters.statut });
    }

    if (filters.priorite) {
      query.andWhere('m.priorite = :priorite', { priorite: filters.priorite });
    }

    if (filters.dateDebut && filters.dateFin) {
      query.andWhere('m.datePlanifiee BETWEEN :dateDebut AND :dateFin', {
        dateDebut: filters.dateDebut,
        dateFin: filters.dateFin,
      });
    }

    return query.orderBy('m.datePlanifiee', 'DESC').take(100).getMany();
  }

  // Find one by ID
  async findOne(id: number): Promise<Maintenance> {
    const maintenance = await this.maintenanceRepo.findOne({
      where: { id },
      relations: ['camion', 'technicien', 'createdByUser'],
    });

    if (!maintenance) {
      throw new NotFoundException(`Maintenance #${id} non trouvée`);
    }

    return maintenance;
  }

  // Create maintenance
  async create(dto: CreateMaintenanceDto, userId: number): Promise<Maintenance> {
    const numero = await this.generateNumero();

    const maintenance = this.maintenanceRepo.create({
      ...dto,
      numero,
      datePlanifiee: new Date(dto.datePlanifiee),
      createdBy: userId,
    });

    const saved = await this.maintenanceRepo.save(maintenance);

    // Load relations for notification
    const fullMaintenance = await this.findOne(saved.id);

    // Send notifications
    await this.notifyMaintenanceCreated(fullMaintenance);

    return fullMaintenance;
  }

  // Update maintenance
  async update(id: number, dto: UpdateMaintenanceDto): Promise<Maintenance> {
    const maintenance = await this.findOne(id);
    const oldStatut = maintenance.statut;

    // Update fields
    Object.assign(maintenance, dto);

    if (dto.datePlanifiee) {
      maintenance.datePlanifiee = new Date(dto.datePlanifiee);
    }
    if (dto.dateDebut) {
      maintenance.dateDebut = new Date(dto.dateDebut);
    }
    if (dto.dateFin) {
      maintenance.dateFin = new Date(dto.dateFin);
    }

    const saved = await this.maintenanceRepo.save(maintenance);

    // If status changed to EN_COURS, update camion status
    if (dto.statut === StatutMaintenance.EN_COURS && oldStatut !== StatutMaintenance.EN_COURS) {
      await this.updateCamionStatus(maintenance.camionId, StatutCamion.EN_MAINTENANCE);
      await this.notifyMaintenanceStarted(saved);
    }

    // If status changed to TERMINE, update camion status back
    if (dto.statut === StatutMaintenance.TERMINE && oldStatut !== StatutMaintenance.TERMINE) {
      await this.updateCamionStatus(maintenance.camionId, StatutCamion.DISPONIBLE);
      await this.notifyMaintenanceCompleted(saved);
    }

    return this.findOne(id);
  }

  // Delete maintenance
  async delete(id: number): Promise<void> {
    const maintenance = await this.findOne(id);
    await this.maintenanceRepo.remove(maintenance);
  }

  // Update camion status
  private async updateCamionStatus(camionId: number, statut: StatutCamion): Promise<void> {
    await this.camionRepo.update(camionId, { statut });
  }

  // Get maintenances for a specific camion
  async findByCamion(camionId: number): Promise<Maintenance[]> {
    return this.maintenanceRepo.find({
      where: { camionId },
      relations: ['technicien'],
      order: { datePlanifiee: 'DESC' },
    });
  }

  // Get upcoming maintenances (next 7 days)
  async getUpcoming(): Promise<Maintenance[]> {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return this.maintenanceRepo.find({
      where: {
        statut: In([StatutMaintenance.PLANIFIE, StatutMaintenance.EN_ATTENTE_PIECES]),
        datePlanifiee: Between(today, nextWeek),
      },
      relations: ['camion', 'technicien'],
      order: { datePlanifiee: 'ASC' },
    });
  }

  // Get overdue maintenances
  async getOverdue(): Promise<Maintenance[]> {
    const today = new Date();

    return this.maintenanceRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.camion', 'camion')
      .leftJoinAndSelect('m.technicien', 'technicien')
      .where('m.statut IN (:...statuts)', {
        statuts: [StatutMaintenance.PLANIFIE, StatutMaintenance.EN_ATTENTE_PIECES],
      })
      .andWhere('m.datePlanifiee < :today', { today })
      .orderBy('m.datePlanifiee', 'ASC')
      .getMany();
  }

  // Get statistics
  async getStats(): Promise<{
    total: number;
    planifie: number;
    enCours: number;
    termine: number;
    enRetard: number;
    coutTotalMois: number;
  }> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [total, planifie, enCours, termine, enRetard, coutMois] = await Promise.all([
      this.maintenanceRepo.count(),
      this.maintenanceRepo.count({ where: { statut: StatutMaintenance.PLANIFIE } }),
      this.maintenanceRepo.count({ where: { statut: StatutMaintenance.EN_COURS } }),
      this.maintenanceRepo.count({ where: { statut: StatutMaintenance.TERMINE } }),
      this.maintenanceRepo
        .createQueryBuilder('m')
        .where('m.statut IN (:...statuts)', {
          statuts: [StatutMaintenance.PLANIFIE, StatutMaintenance.EN_ATTENTE_PIECES],
        })
        .andWhere('m.datePlanifiee < :today', { today })
        .getCount(),
      this.maintenanceRepo
        .createQueryBuilder('m')
        .select('COALESCE(SUM(m.cout_pieces + m.cout_main_oeuvre + m.cout_externe), 0)', 'total')
        .where('m.statut = :statut', { statut: StatutMaintenance.TERMINE })
        .andWhere('m.date_fin >= :startOfMonth', { startOfMonth })
        .getRawOne(),
    ]);

    return {
      total,
      planifie,
      enCours,
      termine,
      enRetard,
      coutTotalMois: Number(coutMois?.total || 0),
    };
  }

  // ===== NOTIFICATIONS =====

  // Get emails of users to notify for maintenance (excluding COMPTABLE and COORDINATEUR)
  private async getMaintenanceNotificationEmails(): Promise<string[]> {
    const users = await this.userRepo.find({
      where: {
        role: In(MAINTENANCE_NOTIFICATION_ROLES),
        actif: true,
      },
      select: ['email'],
    });
    return users.map((u) => u.email).filter((email) => email);
  }

  private async notifyMaintenanceCreated(maintenance: Maintenance): Promise<void> {
    const titre = `Nouvelle maintenance: ${maintenance.numero}`;
    const message = `Maintenance planifiée pour le camion ${maintenance.camion?.immatriculation || 'N/A'}.\nType: ${maintenance.type}\nDate prévue: ${new Date(maintenance.datePlanifiee).toLocaleDateString('fr-FR')}`;
    const camionImmat = maintenance.camion?.immatriculation || 'N/A';

    // Notify all roles except COMPTABLE and COORDINATEUR
    await this.notificationsService.notifyRoles(
      MAINTENANCE_NOTIFICATION_ROLES,
      'ALERT' as any,
      titre,
      message,
      'maintenance',
      maintenance.id,
    );

    // Determine alert level based on priority
    let niveau = NiveauAlerte.INFO;
    if (maintenance.priorite === PrioriteMaintenance.URGENTE) {
      niveau = NiveauAlerte.CRITICAL;
    } else if (maintenance.priorite === PrioriteMaintenance.HAUTE) {
      niveau = NiveauAlerte.WARNING;
    }

    // Always create system alert for maintenance
    await this.alertesService.create({
      typeAlerte: TypeAlerte.MAINTENANCE,
      niveau,
      titre,
      message,
      camionId: maintenance.camionId,
    });

    // Send email notification
    const emails = await this.getMaintenanceNotificationEmails();
    if (emails.length > 0) {
      await this.emailService.sendAlertNotification(emails, {
        titre,
        message,
        niveau: niveau,
        typeAlerte: 'Maintenance planifiée',
        camion: camionImmat,
      });
    }
  }

  private async notifyMaintenanceStarted(maintenance: Maintenance): Promise<void> {
    const camion = await this.camionRepo.findOne({ where: { id: maintenance.camionId } });
    const camionImmat = camion?.immatriculation || maintenance.camion?.immatriculation || 'N/A';
    const titre = `Maintenance démarrée: ${maintenance.numero}`;
    const message = `La maintenance du camion ${camionImmat} a commencé.\nType: ${maintenance.type}`;

    // Notify all roles except COMPTABLE and COORDINATEUR
    await this.notificationsService.notifyRoles(
      MAINTENANCE_NOTIFICATION_ROLES,
      'ALERT' as any,
      titre,
      message,
      'maintenance',
      maintenance.id,
    );

    // Create system alert
    await this.alertesService.create({
      typeAlerte: TypeAlerte.MAINTENANCE,
      niveau: NiveauAlerte.INFO,
      titre,
      message,
      camionId: maintenance.camionId,
    });

    // Send email notification
    const emails = await this.getMaintenanceNotificationEmails();
    if (emails.length > 0) {
      await this.emailService.sendAlertNotification(emails, {
        titre,
        message,
        niveau: 'INFO',
        typeAlerte: 'Maintenance en cours',
        camion: camionImmat,
      });
    }
  }

  private async notifyMaintenanceCompleted(maintenance: Maintenance): Promise<void> {
    const camion = await this.camionRepo.findOne({ where: { id: maintenance.camionId } });
    const camionImmat = camion?.immatriculation || 'N/A';
    const titre = `Maintenance terminée: ${maintenance.numero}`;
    const coutTotal = (maintenance.coutPieces || 0) + (maintenance.coutMainOeuvre || 0) + (maintenance.coutExterne || 0);
    const message = `La maintenance du camion ${camionImmat} est terminée. Le véhicule est de nouveau disponible.\nCoût total: ${coutTotal.toLocaleString('fr-FR')} DH`;

    // Notify all roles except COMPTABLE and COORDINATEUR
    await this.notificationsService.notifyRoles(
      MAINTENANCE_NOTIFICATION_ROLES,
      'ALERT' as any,
      titre,
      message,
      'maintenance',
      maintenance.id,
    );

    // Create system alert
    await this.alertesService.create({
      typeAlerte: TypeAlerte.MAINTENANCE,
      niveau: NiveauAlerte.INFO,
      titre,
      message,
      camionId: maintenance.camionId,
    });

    // Send email notification
    const emails = await this.getMaintenanceNotificationEmails();
    if (emails.length > 0) {
      await this.emailService.sendAlertNotification(emails, {
        titre,
        message,
        niveau: 'INFO',
        typeAlerte: 'Maintenance terminée',
        camion: camionImmat,
      });
    }
  }

  // Check and send alerts for upcoming maintenances (to be called by cron)
  async checkMaintenanceAlerts(): Promise<void> {
    const upcoming = await this.getUpcoming();
    const overdue = await this.getOverdue();

    // Get emails for notifications
    const emails = await this.getMaintenanceNotificationEmails();

    // Alert for overdue maintenances
    for (const m of overdue) {
      const daysOverdue = Math.floor((Date.now() - new Date(m.datePlanifiee).getTime()) / (1000 * 60 * 60 * 24));
      const niveau = daysOverdue > 7 ? NiveauAlerte.CRITICAL : NiveauAlerte.WARNING;
      const titre = `Maintenance en retard: ${m.numero}`;
      const message = `La maintenance du camion ${m.camion?.immatriculation} était prévue il y a ${daysOverdue} jour(s).`;
      const camionImmat = m.camion?.immatriculation || 'N/A';

      // Create alerte
      await this.alertesService.create({
        typeAlerte: TypeAlerte.MAINTENANCE,
        niveau,
        titre,
        message,
        camionId: m.camionId,
      });

      // Notify roles
      await this.notificationsService.notifyRoles(
        MAINTENANCE_NOTIFICATION_ROLES,
        'ALERT' as any,
        titre,
        message,
        'maintenance',
        m.id,
      );

      // Send email
      if (emails.length > 0) {
        await this.emailService.sendAlertNotification(emails, {
          titre,
          message,
          niveau: niveau,
          typeAlerte: 'Maintenance en retard',
          camion: camionImmat,
        });
      }
    }

    // Alert for upcoming maintenances (within 2 days)
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    for (const m of upcoming) {
      const datePlanifiee = new Date(m.datePlanifiee);
      if (datePlanifiee <= twoDaysFromNow) {
        const daysUntil = Math.ceil((datePlanifiee.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const titre = `Maintenance à venir: ${m.numero}`;
        const message = `La maintenance du camion ${m.camion?.immatriculation} est prévue dans ${daysUntil} jour(s).`;
        const camionImmat = m.camion?.immatriculation || 'N/A';

        // Create alerte (info level for upcoming)
        await this.alertesService.create({
          typeAlerte: TypeAlerte.MAINTENANCE,
          niveau: NiveauAlerte.INFO,
          titre,
          message,
          camionId: m.camionId,
        });

        // Notify roles
        await this.notificationsService.notifyRoles(
          MAINTENANCE_NOTIFICATION_ROLES,
          'ALERT' as any,
          titre,
          message,
          'maintenance',
          m.id,
        );

        // Send email
        if (emails.length > 0) {
          await this.emailService.sendAlertNotification(emails, {
            titre,
            message,
            niveau: 'INFO',
            typeAlerte: 'Maintenance à venir',
            camion: camionImmat,
          });
        }
      }
    }
  }
}
