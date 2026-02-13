import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { CarburantService } from './carburant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Carburant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/carburant')
export class CarburantController {
  constructor(private readonly carburantService: CarburantService) {}

  // Cuves endpoints
  @Get('cuves')
  @ApiOperation({ summary: 'Liste des cuves' })
  findAllCuves() {
    return this.carburantService.findAllCuves();
  }

  @Get('cuves/:id')
  @ApiOperation({ summary: 'Détail cuve' })
  findOneCuve(@Param('id') id: string) {
    return this.carburantService.findOneCuve(+id);
  }

  @Get('cuves/:id/stats')
  @ApiOperation({ summary: 'Statistiques cuve (appros, conso)' })
  getCuveStats(@Param('id') id: string) {
    return this.carburantService.getCuveStats(+id);
  }

  @Get('cuves/:id/approvisionnements')
  @ApiOperation({ summary: 'Historique approvisionnements cuve' })
  getApprovisionnementsByCuve(@Param('id') id: string) {
    return this.carburantService.findApprovisionnementsByCuve(+id);
  }

  @Post('cuves')
  @ApiOperation({ summary: 'Créer une cuve' })
  createCuve(@Body() data: any) {
    return this.carburantService.createCuve(data);
  }

  @Put('cuves/:id')
  @ApiOperation({ summary: 'Modifier une cuve' })
  updateCuve(@Param('id') id: string, @Body() data: any) {
    return this.carburantService.updateCuve(+id, data);
  }

  @Delete('cuves/:id')
  @ApiOperation({ summary: 'Supprimer une cuve' })
  deleteCuve(@Param('id') id: string) {
    return this.carburantService.deleteCuve(+id);
  }

  @Post('cuves/:id/ravitailler')
  @ApiOperation({ summary: 'Ravitailler une cuve (simple)' })
  ravitaillerCuve(@Param('id') id: string, @Body('quantiteLitres') quantiteLitres: number) {
    return this.carburantService.ravitaillerCuve(+id, quantiteLitres);
  }

  // Approvisionnements endpoints
  @Get('approvisionnements')
  @ApiOperation({ summary: 'Liste des approvisionnements' })
  findAllApprovisionnements() {
    return this.carburantService.findAllApprovisionnements();
  }

  @Get('approvisionnements/:id')
  @ApiOperation({ summary: 'Détail approvisionnement' })
  findOneApprovisionnement(@Param('id') id: string) {
    return this.carburantService.findOneApprovisionnement(+id);
  }

  @Post('approvisionnements')
  @ApiOperation({ summary: 'Créer un approvisionnement (ravitaillement avec fournisseur)' })
  createApprovisionnement(@Body() data: any, @Req() req: any) {
    return this.carburantService.createApprovisionnement(data, req.user.id);
  }

  // Fournisseurs endpoint
  @Get('fournisseurs')
  @ApiOperation({ summary: 'Liste des fournisseurs' })
  findAllFournisseurs() {
    return this.carburantService.findAllFournisseurs();
  }

  // Dotations endpoints
  @Get('dotations')
  @ApiOperation({ summary: 'Liste des dotations' })
  findAllDotations() {
    return this.carburantService.findAllDotations();
  }

  @Get('dotations/:id')
  @ApiOperation({ summary: 'Détail dotation' })
  findOneDotation(@Param('id') id: string) {
    return this.carburantService.findOneDotation(+id);
  }

  @Post('dotations')
  @ApiOperation({ summary: 'Créer une dotation' })
  createDotation(@Body() data: any, @Req() req: any) {
    return this.carburantService.createDotation(data, req.user.id);
  }

  // Stations Partenaires endpoints
  @Get('stations-partenaires')
  @ApiOperation({ summary: 'Liste des stations partenaires' })
  findAllStationsPartenaires() {
    return this.carburantService.findAllStationsPartenaires();
  }

  @Get('stations-partenaires/:id')
  @ApiOperation({ summary: 'Détail station partenaire' })
  findOneStationPartenaire(@Param('id') id: string) {
    return this.carburantService.findOneStationPartenaire(+id);
  }

  @Post('stations-partenaires')
  @ApiOperation({ summary: 'Créer une station partenaire' })
  createStationPartenaire(@Body() data: any) {
    return this.carburantService.createStationPartenaire(data);
  }

  @Put('stations-partenaires/:id')
  @ApiOperation({ summary: 'Modifier une station partenaire' })
  updateStationPartenaire(@Param('id') id: string, @Body() data: any) {
    return this.carburantService.updateStationPartenaire(+id, data);
  }

  @Delete('stations-partenaires/:id')
  @ApiOperation({ summary: 'Supprimer une station partenaire' })
  deleteStationPartenaire(@Param('id') id: string) {
    return this.carburantService.deleteStationPartenaire(+id);
  }
}
