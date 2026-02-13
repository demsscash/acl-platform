import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PannesService } from './pannes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StatutPanne } from '../database/entities';

@ApiTags('Pannes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/pannes')
export class PannesController {
  constructor(private readonly pannesService: PannesService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des pannes' })
  findAll(@Query('statut') statut?: StatutPanne) {
    if (statut) {
      return this.pannesService.findByStatut(statut);
    }
    return this.pannesService.findAll();
  }

  @Get('en-cours')
  @ApiOperation({ summary: 'Pannes en cours (non résolues)' })
  findEnCours() {
    return this.pannesService.findEnCours();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des pannes' })
  getStats() {
    return this.pannesService.getStats();
  }

  @Get('camion/:camionId')
  @ApiOperation({ summary: 'Pannes d\'un camion' })
  findByCamion(@Param('camionId') camionId: string) {
    return this.pannesService.findByCamion(+camionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail panne' })
  findOne(@Param('id') id: string) {
    return this.pannesService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Déclarer une panne' })
  create(@Body() data: any, @Req() req: any) {
    return this.pannesService.create(data, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour une panne' })
  update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.pannesService.update(+id, data, req.user.id);
  }

  @Put(':id/statut')
  @ApiOperation({ summary: 'Changer le statut d\'une panne' })
  updateStatut(@Param('id') id: string, @Body('statut') statut: StatutPanne, @Req() req: any) {
    return this.pannesService.update(+id, { statut }, req.user.id);
  }
}
