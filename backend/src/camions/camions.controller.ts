import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { CamionsService } from './camions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Camions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/camions')
export class CamionsController {
  constructor(private readonly camionsService: CamionsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des camions' })
  findAll() {
    return this.camionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail camion' })
  findOne(@Param('id') id: string) {
    return this.camionsService.findOne(+id);
  }

  @Get(':id/historique')
  @ApiOperation({ summary: 'Historique complet du camion (transports, locations, carburant, pièces)' })
  getHistorique(@Param('id') id: string) {
    return this.camionsService.getHistorique(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un camion' })
  create(@Body() data: any) {
    return this.camionsService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un camion' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.camionsService.update(+id, data);
  }

  @Put(':id/kilometrage')
  @ApiOperation({ summary: 'Mettre à jour le kilométrage' })
  updateKm(@Param('id') id: string, @Body('km') km: number) {
    return this.camionsService.updateKilometrage(+id, km);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver un camion' })
  remove(@Param('id') id: string) {
    return this.camionsService.remove(+id);
  }

  @Post('sync-statuts')
  @ApiOperation({ summary: 'Synchroniser les statuts des camions et chauffeurs avec les transports/locations en cours' })
  syncStatuts() {
    return this.camionsService.syncStatuts();
  }
}
