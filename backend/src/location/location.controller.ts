import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { LocationService } from './location.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Location')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('bons')
  @ApiOperation({ summary: 'Liste des bons de location' })
  findAll(@Query('statut') statut?: string) {
    return this.locationService.findAll(statut);
  }

  @Get('bons/stats')
  @ApiOperation({ summary: 'Statistiques location' })
  getStats() {
    return this.locationService.getStats();
  }

  @Get('bons/:id')
  @ApiOperation({ summary: 'Détail bon de location' })
  findOne(@Param('id') id: string) {
    return this.locationService.findOne(+id);
  }

  @Post('bons')
  @ApiOperation({ summary: 'Créer un bon de location' })
  create(@Body() data: any, @Request() req: any) {
    return this.locationService.create(data, req.user.id);
  }

  @Put('bons/:id')
  @ApiOperation({ summary: 'Modifier un bon de location' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.locationService.update(+id, data);
  }

  @Put('bons/:id/statut')
  @ApiOperation({ summary: 'Changer le statut d\'un bon' })
  updateStatut(@Param('id') id: string, @Body('statut') statut: string) {
    return this.locationService.updateStatut(+id, statut);
  }

  @Post('bons/:id/calculer')
  @ApiOperation({ summary: 'Calculer le montant total' })
  calculerMontant(@Param('id') id: string) {
    return this.locationService.calculerMontant(+id);
  }

  @Post('sync-montants')
  @ApiOperation({ summary: 'Recalculer tous les montants des bons de location' })
  recalculerTousMontants() {
    return this.locationService.recalculerTousMontants();
  }

  @Get('clients')
  @ApiOperation({ summary: 'Liste des clients' })
  getClients() {
    return this.locationService.getClients();
  }
}
