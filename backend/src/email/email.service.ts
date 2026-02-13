import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn(
        'Configuration SMTP incomplète. Les emails ne seront pas envoyés. ' +
        'Configurez SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS dans le .env'
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      this.isConfigured = true;
      this.logger.log('Service email configuré avec succès');
    } catch (error) {
      this.logger.error('Erreur lors de la configuration du service email:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      this.logger.warn('Email non envoyé (service non configuré):', options.subject);
      return false;
    }

    try {
      const fromEmail = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');

      await this.transporter.sendMail({
        from: `ACL Platform <${fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Email envoyé avec succès: ${options.subject}`);
      return true;
    } catch (error) {
      this.logger.error('Erreur lors de l\'envoi de l\'email:', error);
      return false;
    }
  }

  async sendAlertNotification(
    recipientEmails: string[],
    alerteInfo: {
      titre: string;
      message: string;
      niveau: string;
      typeAlerte: string;
      camion?: string;
    }
  ): Promise<boolean> {
    const niveauColors = {
      CRITICAL: '#DC2626',
      WARNING: '#F59E0B',
      INFO: '#3B82F6',
    };

    const niveauLabels = {
      CRITICAL: 'Critique',
      WARNING: 'Attention',
      INFO: 'Information',
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1F2937; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #F9FAFB; padding: 20px; border: 1px solid #E5E7EB; }
          .alert-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 12px; color: white; background: ${niveauColors[alerteInfo.niveau] || '#6B7280'}; }
          .alert-title { font-size: 18px; font-weight: bold; margin: 15px 0 10px; }
          .alert-message { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid ${niveauColors[alerteInfo.niveau] || '#6B7280'}; }
          .info-row { margin: 10px 0; }
          .info-label { font-weight: bold; color: #6B7280; }
          .footer { text-align: center; padding: 15px; font-size: 12px; color: #9CA3AF; }
          .btn { display: inline-block; padding: 10px 20px; background: #F59E0B; color: #1F2937; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ACL Platform - Alerte</h1>
          </div>
          <div class="content">
            <span class="alert-badge">${niveauLabels[alerteInfo.niveau] || alerteInfo.niveau}</span>
            <p class="alert-title">${alerteInfo.titre}</p>
            <div class="alert-message">
              ${alerteInfo.message}
            </div>
            ${alerteInfo.camion ? `
            <div class="info-row">
              <span class="info-label">Camion:</span> ${alerteInfo.camion}
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Type:</span> ${alerteInfo.typeAlerte}
            </div>
            <div class="info-row">
              <span class="info-label">Date:</span> ${new Date().toLocaleString('fr-FR')}
            </div>
            <center>
              <a href="${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173'}/alertes" class="btn">
                Voir les alertes
              </a>
            </center>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement par ACL Platform.</p>
            <p>Ne pas répondre à cet email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: recipientEmails,
      subject: `[${niveauLabels[alerteInfo.niveau] || alerteInfo.niveau}] ${alerteInfo.titre}`,
      html,
      text: `Alerte ACL Platform\n\nNiveau: ${niveauLabels[alerteInfo.niveau] || alerteInfo.niveau}\nTitre: ${alerteInfo.titre}\nMessage: ${alerteInfo.message}${alerteInfo.camion ? `\nCamion: ${alerteInfo.camion}` : ''}\nType: ${alerteInfo.typeAlerte}\nDate: ${new Date().toLocaleString('fr-FR')}`,
    });
  }

  isEmailConfigured(): boolean {
    return this.isConfigured;
  }
}
