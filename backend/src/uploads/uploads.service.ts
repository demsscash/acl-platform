import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Fichier, TypeFichier, CategorieFichier } from '../database/entities';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private uploadPath: string;

  constructor(
    @InjectRepository(Fichier)
    private fichierRepo: Repository<Fichier>,
    private configService: ConfigService,
  ) {
    this.uploadPath = this.configService.get('STORAGE_PATH') || './uploads';
    // Create upload directory if it doesn't exist
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  private getTypeFichier(mimeType: string): TypeFichier {
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    if (mimeType === 'application/pdf') return 'PDF';
    return 'DOCUMENT';
  }

  private validateFile(file: Express.Multer.File): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('Fichier trop volumineux (max 10MB)');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non autorisé');
    }
  }

  async upload(
    file: Express.Multer.File,
    entiteType: string,
    entiteId: number,
    categorie?: CategorieFichier,
    description?: string,
    userId?: number,
  ): Promise<Fichier> {
    this.validateFile(file);

    const ext = path.extname(file.originalname);
    const nomStockage = `${uuidv4()}${ext}`;
    const subDir = `${entiteType}/${entiteId}`;
    const fullDir = path.join(this.uploadPath, subDir);
    const chemin = path.join(subDir, nomStockage);

    // Create subdirectory
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    // Save file
    const fullPath = path.join(this.uploadPath, chemin);
    fs.writeFileSync(fullPath, file.buffer);

    // Save metadata to database
    const fichier = this.fichierRepo.create({
      nomOriginal: file.originalname,
      nomStockage,
      chemin,
      typeMime: file.mimetype,
      typeFichier: this.getTypeFichier(file.mimetype),
      categorie,
      taille: file.size,
      entiteType,
      entiteId,
      description,
      uploadedById: userId,
    });

    return this.fichierRepo.save(fichier);
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    entiteType: string,
    entiteId: number,
    categorie?: CategorieFichier,
    userId?: number,
  ): Promise<Fichier[]> {
    const results: Fichier[] = [];
    for (const file of files) {
      const fichier = await this.upload(file, entiteType, entiteId, categorie, undefined, userId);
      results.push(fichier);
    }
    return results;
  }

  async getByEntite(entiteType: string, entiteId: number): Promise<Fichier[]> {
    return this.fichierRepo.find({
      where: { entiteType, entiteId },
      order: { createdAt: 'DESC' },
      relations: ['uploadedBy'],
    });
  }

  async getById(id: number): Promise<Fichier> {
    const fichier = await this.fichierRepo.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });
    if (!fichier) throw new NotFoundException('Fichier non trouvé');
    return fichier;
  }

  async delete(id: number): Promise<void> {
    const fichier = await this.getById(id);

    // Delete physical file
    const fullPath = path.join(this.uploadPath, fichier.chemin);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Delete from database
    await this.fichierRepo.delete(id);
  }

  async updateDescription(id: number, description: string): Promise<Fichier> {
    await this.fichierRepo.update(id, { description });
    return this.getById(id);
  }

  getFilePath(fichier: Fichier): string {
    return path.join(this.uploadPath, fichier.chemin);
  }
}
