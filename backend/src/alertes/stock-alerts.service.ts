import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Alerte, CataloguePiece, StockPiece, User } from '../database/entities';
import { TypeAlerte, NiveauAlerte, StatutAlerte } from '../database/entities/alerte.entity';
import { EmailService } from '../email/email.service';

export interface StockAlert {
  pieceId: number;
  pieceName: string;
  reference: string;
  stockActuel: number;
  stockMinimum: number;
  deficit: number;
}

@Injectable()
export class StockAlertsService {
  private readonly logger = new Logger(StockAlertsService.name);

  constructor(
    @InjectRepository(Alerte)
    private readonly alerteRepository: Repository<Alerte>,
    @InjectRepository(CataloguePiece)
    private readonly cataloguePieceRepository: Repository<CataloguePiece>,
    @InjectRepository(StockPiece)
    private readonly stockPieceRepository: Repository<StockPiece>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Verifie les niveaux de stock tous les jours a 8h
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkStockLevels(): Promise<void> {
    this.logger.log('Verification des niveaux de stock...');

    const lowStockItems = await this.getLowStockItems();

    for (const item of lowStockItems) {
      await this.createOrUpdateStockAlert(item);
    }

    // Send batch email if there are critical items
    const criticalItems = lowStockItems.filter(i => i.stockActuel === 0);
    if (criticalItems.length > 0) {
      await this.sendLowStockEmail(criticalItems);
    }

    this.logger.log(`${lowStockItems.length} pieces en stock bas detectees`);
  }

  /**
   * Recupere toutes les pieces en stock bas
   */
  async getLowStockItems(): Promise<StockAlert[]> {
    const pieces = await this.cataloguePieceRepository.find({
      where: { actif: true },
    });

    const lowStockItems: StockAlert[] = [];

    for (const piece of pieces) {
      // Calculate total stock for this piece
      const stockRecords = await this.stockPieceRepository.find({
        where: { pieceId: piece.id },
      });

      const totalStock = stockRecords.reduce((sum, s) => sum + s.quantiteDisponible, 0);

      if (totalStock <= piece.stockMinimum) {
        lowStockItems.push({
          pieceId: piece.id,
          pieceName: piece.designation,
          reference: piece.reference,
          stockActuel: totalStock,
          stockMinimum: piece.stockMinimum,
          deficit: piece.stockMinimum - totalStock,
        });
      }
    }

    return lowStockItems.sort((a, b) => a.stockActuel - b.stockActuel);
  }

  /**
   * Cree ou met a jour une alerte de stock
   */
  private async createOrUpdateStockAlert(item: StockAlert): Promise<void> {
    const niveau = item.stockActuel === 0 ? NiveauAlerte.CRITICAL : NiveauAlerte.WARNING;

    // Check for existing alert
    const existingAlert = await this.alerteRepository.findOne({
      where: {
        typeAlerte: TypeAlerte.STOCK,
        referenceType: 'piece_stock',
        referenceId: item.pieceId,
        statut: In([StatutAlerte.ACTIVE, StatutAlerte.ACQUITTEE]),
      },
    });

    const message = item.stockActuel === 0
      ? `RUPTURE DE STOCK - ${item.pieceName} (${item.reference})`
      : `Stock bas: ${item.stockActuel} / ${item.stockMinimum} minimum - ${item.pieceName} (${item.reference})`;

    if (existingAlert) {
      existingAlert.message = message;
      existingAlert.niveau = niveau;
      await this.alerteRepository.save(existingAlert);
      return;
    }

    // Create new alert
    const alerte = this.alerteRepository.create({
      typeAlerte: TypeAlerte.STOCK,
      niveau,
      titre: `Stock bas - ${item.pieceName}`,
      message,
      referenceId: item.pieceId,
      referenceType: 'piece_stock',
      statut: StatutAlerte.ACTIVE,
    });

    await this.alerteRepository.save(alerte);
  }

  /**
   * Envoie un email pour les alertes de stock critique
   */
  private async sendLowStockEmail(items: StockAlert[]): Promise<void> {
    if (!this.emailService.isEmailConfigured()) {
      this.logger.warn('Email non configure - notification non envoyee');
      return;
    }

    try {
      // Get MAGASINIER and RESPONSABLE_LOGISTIQUE emails
      const users = await this.userRepository.find({
        where: {
          role: In(['ADMIN', 'RESPONSABLE_LOGISTIQUE', 'MAGASINIER']),
          actif: true,
        },
        select: ['email'],
      });

      const emails = users.map(u => u.email).filter(e => e);

      if (emails.length === 0) {
        this.logger.warn('Aucun destinataire email trouve pour les alertes stock');
        return;
      }

      const itemsList = items.map(i => `- ${i.pieceName} (${i.reference}): ${i.stockActuel} en stock`).join('\n');

      await this.emailService.sendAlertNotification(emails, {
        titre: `ALERTE STOCK - ${items.length} piece(s) en rupture`,
        message: `Les pieces suivantes sont en rupture de stock:\n\n${itemsList}`,
        niveau: NiveauAlerte.CRITICAL,
        typeAlerte: TypeAlerte.STOCK,
      });

      this.logger.log(`Email d'alerte stock envoye a ${emails.length} destinataire(s)`);
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi de l\'email d\'alerte stock:', error);
    }
  }

  /**
   * Endpoint pour declencher manuellement la verification
   */
  async runCheck(): Promise<{ alertesCreees: number; stockBas: StockAlert[] }> {
    const lowStockItems = await this.getLowStockItems();

    // Resolve alerts for items that are no longer low
    await this.resolveOutdatedAlerts(lowStockItems);

    for (const item of lowStockItems) {
      await this.createOrUpdateStockAlert(item);
    }

    return {
      alertesCreees: lowStockItems.length,
      stockBas: lowStockItems,
    };
  }

  /**
   * Resout les alertes pour les pieces qui ne sont plus en stock bas
   */
  private async resolveOutdatedAlerts(currentLowStock: StockAlert[]): Promise<void> {
    const activeAlerts = await this.alerteRepository.find({
      where: {
        typeAlerte: TypeAlerte.STOCK,
        referenceType: 'piece_stock',
        statut: In([StatutAlerte.ACTIVE, StatutAlerte.ACQUITTEE]),
      },
    });

    for (const alert of activeAlerts) {
      const stillLow = currentLowStock.some(item => item.pieceId === alert.referenceId);

      if (!stillLow) {
        alert.statut = StatutAlerte.RESOLUE;
        alert.resolueAt = new Date();
        await this.alerteRepository.save(alert);
        this.logger.log(`Alerte stock resolue: ${alert.titre}`);
      }
    }
  }
}
