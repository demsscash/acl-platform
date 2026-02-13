import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseIntPipe,
  Request,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import { Fichier } from '../database/entities';
import type { CategorieFichier } from '../database/entities/fichier.entity';
import * as fs from 'fs';

@Controller('api/uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('entiteType') entiteType: string,
    @Body('entiteId') entiteId: string,
    @Body('categorie') categorie?: CategorieFichier,
    @Body('description') description?: string,
    @Request() req?: any,
  ): Promise<Fichier> {
    return this.uploadsService.upload(
      file,
      entiteType,
      parseInt(entiteId),
      categorie,
      description,
      req?.user?.id,
    );
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('entiteType') entiteType: string,
    @Body('entiteId') entiteId: string,
    @Body('categorie') categorie?: CategorieFichier,
    @Request() req?: any,
  ): Promise<Fichier[]> {
    return this.uploadsService.uploadMultiple(
      files,
      entiteType,
      parseInt(entiteId),
      categorie,
      req?.user?.id,
    );
  }

  @Get('entite/:entiteType/:entiteId')
  async getByEntite(
    @Param('entiteType') entiteType: string,
    @Param('entiteId', ParseIntPipe) entiteId: number,
  ): Promise<Fichier[]> {
    return this.uploadsService.getByEntite(entiteType, entiteId);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number): Promise<Fichier> {
    return this.uploadsService.getById(id);
  }

  @Get(':id/download')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const fichier = await this.uploadsService.getById(id);
    const filePath = this.uploadsService.getFilePath(fichier);

    const file = fs.createReadStream(filePath);

    res.set({
      'Content-Type': fichier.typeMime,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fichier.nomOriginal)}"`,
    });

    return new StreamableFile(file);
  }

  @Get(':id/view')
  async view(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const fichier = await this.uploadsService.getById(id);
    const filePath = this.uploadsService.getFilePath(fichier);

    const file = fs.createReadStream(filePath);

    res.set({
      'Content-Type': fichier.typeMime,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fichier.nomOriginal)}"`,
    });

    return new StreamableFile(file);
  }

  @Put(':id/description')
  async updateDescription(
    @Param('id', ParseIntPipe) id: number,
    @Body('description') description: string,
  ): Promise<Fichier> {
    return this.uploadsService.updateDescription(id, description);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.uploadsService.delete(id);
    return { success: true };
  }
}
