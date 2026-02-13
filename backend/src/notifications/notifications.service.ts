import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from '../database/entities/notification.entity';
import { User, RoleUtilisateur } from '../database/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // Get notifications for a specific user (including role-based notifications)
  async getForUser(userId: number, userRole: RoleUtilisateur, onlyUnread = false) {
    const query = this.notificationRepo
      .createQueryBuilder('n')
      .where('(n.userId = :userId OR n.targetRole = :role)', { userId, role: userRole })
      .orderBy('n.createdAt', 'DESC')
      .take(50);

    if (onlyUnread) {
      query.andWhere('n.lue = false');
    }

    return query.getMany();
  }

  // Get unread count for a user
  async getUnreadCount(userId: number, userRole: RoleUtilisateur): Promise<number> {
    return this.notificationRepo
      .createQueryBuilder('n')
      .where('(n.userId = :userId OR n.targetRole = :role)', { userId, role: userRole })
      .andWhere('n.lue = false')
      .getCount();
  }

  // Mark a notification as read
  async markAsRead(notificationId: number, userId: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      return null;
    }

    // For user-specific notifications, update directly
    // For role-based notifications, we need a different approach (user-specific read status)
    notification.lue = true;
    notification.lueAt = new Date();
    return this.notificationRepo.save(notification);
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: number, userRole: RoleUtilisateur) {
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ lue: true, lueAt: new Date() })
      .where('(userId = :userId OR targetRole = :role)', { userId, role: userRole })
      .andWhere('lue = false')
      .execute();
  }

  // Create a notification for a specific user
  async notifyUser(
    userId: number,
    type: NotificationType,
    titre: string,
    message: string,
    referenceType?: string,
    referenceId?: number,
  ) {
    const notification = this.notificationRepo.create({
      userId,
      type,
      titre,
      message,
      referenceType,
      referenceId,
      lue: false,
    });
    return this.notificationRepo.save(notification);
  }

  // Create a notification for all users with a specific role
  async notifyRole(
    role: RoleUtilisateur,
    type: NotificationType,
    titre: string,
    message: string,
    referenceType?: string,
    referenceId?: number,
  ) {
    const notification = this.notificationRepo.create({
      targetRole: role,
      type,
      titre,
      message,
      referenceType,
      referenceId,
      lue: false,
    });
    return this.notificationRepo.save(notification);
  }

  // Notify multiple roles
  async notifyRoles(
    roles: RoleUtilisateur[],
    type: NotificationType,
    titre: string,
    message: string,
    referenceType?: string,
    referenceId?: number,
  ) {
    const notifications = roles.map((role) =>
      this.notificationRepo.create({
        targetRole: role,
        type,
        titre,
        message,
        referenceType,
        referenceId,
        lue: false,
      }),
    );
    return this.notificationRepo.save(notifications);
  }

  // ===== SPECIFIC NOTIFICATION TRIGGERS =====

  // When a transport bon is created, notify Magasinier to prepare the truck
  async onTransportCreated(bonId: number, bonNumero: string, camionImmat: string, chauffeurNom: string) {
    const titre = `Nouveau bon de transport: ${bonNumero}`;
    const message = `Un nouveau bon de transport a été créé.\nCamion: ${camionImmat}\nChauffeur: ${chauffeurNom}\nVeuillez préparer le véhicule.`;

    return this.notifyRole(
      RoleUtilisateur.MAGASINIER,
      NotificationType.TRANSPORT_CREATED,
      titre,
      message,
      'transport',
      bonId,
    );
  }

  // When a transport status changes to EN_COURS
  async onTransportStarted(bonId: number, bonNumero: string, camionImmat: string) {
    const titre = `Transport démarré: ${bonNumero}`;
    const message = `Le transport ${bonNumero} (${camionImmat}) est maintenant en cours.`;

    return this.notifyRoles(
      [RoleUtilisateur.COORDINATEUR, RoleUtilisateur.RESPONSABLE_LOGISTIQUE],
      NotificationType.TRANSPORT_UPDATED,
      titre,
      message,
      'transport',
      bonId,
    );
  }

  // When a panne is declared, notify relevant roles
  async onPanneDeclared(panneId: number, camionImmat: string, description: string) {
    const titre = `Panne déclarée: ${camionImmat}`;
    const message = `Une panne a été déclarée pour le camion ${camionImmat}.\n${description}`;

    return this.notifyRoles(
      [RoleUtilisateur.MAGASINIER, RoleUtilisateur.RESPONSABLE_LOGISTIQUE, RoleUtilisateur.COORDINATEUR],
      NotificationType.PANNE_DECLARED,
      titre,
      message,
      'panne',
      panneId,
    );
  }

  // Delete old read notifications (cleanup)
  async cleanupOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await this.notificationRepo
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('lue = true')
      .andWhere('createdAt < :cutoffDate', { cutoffDate })
      .execute();
  }
}
