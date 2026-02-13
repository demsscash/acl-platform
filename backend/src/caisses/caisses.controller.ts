import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { CaissesService } from './caisses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCaisseDto, UpdateCaisseDto } from './dto/create-caisse.dto';
import { CreateMouvementDto, VirementDto } from './dto/create-mouvement.dto';

@ApiTags('Caisses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/caisses')
export class CaissesController {
  constructor(private readonly caissesService: CaissesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste de toutes les caisses' })
  findAll() {
    return this.caissesService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des caisses' })
  getStats() {
    return this.caissesService.getStats();
  }

  @Get('mouvements')
  @ApiOperation({ summary: 'Tous les mouvements de toutes les caisses' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getAllMouvements(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.caissesService.getAllMouvements(start, end);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une caisse' })
  findOne(@Param('id') id: string) {
    return this.caissesService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle caisse' })
  create(@Body() dto: CreateCaisseDto, @Request() req: any) {
    return this.caissesService.create(dto, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une caisse' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCaisseDto,
    @Request() req: any,
  ) {
    return this.caissesService.update(+id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une caisse' })
  delete(@Param('id') id: string) {
    return this.caissesService.delete(+id);
  }

  // Mouvements
  @Get(':id/mouvements')
  @ApiOperation({ summary: 'Historique des mouvements d\'une caisse' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getMouvements(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.caissesService.getMouvements(+id, start, end);
  }

  @Post(':id/mouvements')
  @ApiOperation({ summary: 'Ajouter un mouvement à une caisse' })
  addMouvement(
    @Param('id') id: string,
    @Body() dto: CreateMouvementDto,
    @Request() req: any,
  ) {
    return this.caissesService.addMouvement(+id, dto, req.user.id);
  }

  @Post('virement')
  @ApiOperation({ summary: 'Effectuer un virement entre caisses' })
  virement(@Body() dto: VirementDto, @Request() req: any) {
    return this.caissesService.virement(dto, req.user.id);
  }

  @Post(':id/recalculer-solde')
  @ApiOperation({ summary: 'Recalculer le solde d\'une caisse à partir des mouvements' })
  recalculerSolde(@Param('id') id: string) {
    return this.caissesService.recalculerSolde(+id);
  }
}
