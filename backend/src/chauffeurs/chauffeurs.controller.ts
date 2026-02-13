import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ChauffeursService } from './chauffeurs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chauffeurs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/chauffeurs')
export class ChauffeursController {
  constructor(private readonly chauffeursService: ChauffeursService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des chauffeurs' })
  findAll() {
    return this.chauffeursService.findAll();
  }

  @Get('disponibles')
  @ApiOperation({ summary: 'Liste des chauffeurs disponibles' })
  findDisponibles() {
    return this.chauffeursService.findDisponibles();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail chauffeur' })
  findOne(@Param('id') id: string) {
    return this.chauffeursService.findOne(+id);
  }

  @Get(':id/historique')
  @ApiOperation({ summary: 'Historique complet du chauffeur (transports, locations, carburant)' })
  getHistorique(@Param('id') id: string) {
    return this.chauffeursService.getHistorique(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un chauffeur' })
  create(@Body() data: any) {
    return this.chauffeursService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un chauffeur' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.chauffeursService.update(+id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver un chauffeur' })
  remove(@Param('id') id: string) {
    return this.chauffeursService.remove(+id);
  }
}
