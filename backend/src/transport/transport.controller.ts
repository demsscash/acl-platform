import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { TransportService } from './transport.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Transport')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/transport')
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  // Bons de transport endpoints
  @Get('bons')
  @ApiOperation({ summary: 'Liste des bons de transport' })
  findAllBons() {
    return this.transportService.findAllBons();
  }

  @Get('bons/stats')
  @ApiOperation({ summary: 'Statistiques transport' })
  getStats() {
    return this.transportService.getStats();
  }

  @Get('revenus/stats')
  @ApiOperation({ summary: 'Statistiques de revenus (par mois, camion, client)' })
  getRevenueStats() {
    return this.transportService.getRevenueStats();
  }

  @Get('bons/:id')
  @ApiOperation({ summary: 'Détail bon de transport' })
  findOneBon(@Param('id') id: string) {
    return this.transportService.findOneBon(+id);
  }

  @Post('bons')
  @ApiOperation({ summary: 'Créer un bon de transport' })
  createBon(@Body() data: any, @Req() req: any) {
    return this.transportService.createBon(data, req.user.id);
  }

  @Put('bons/:id')
  @ApiOperation({ summary: 'Modifier un bon de transport' })
  updateBon(@Param('id') id: string, @Body() data: any) {
    return this.transportService.updateBon(+id, data);
  }

  @Put('bons/:id/statut')
  @ApiOperation({ summary: 'Changer le statut' })
  updateStatut(@Param('id') id: string, @Body('statut') statut: string) {
    return this.transportService.updateStatut(+id, statut);
  }

  // Clients endpoints
  @Get('clients')
  @ApiOperation({ summary: 'Liste des clients' })
  findAllClients() {
    return this.transportService.findAllClients();
  }

  @Get('clients/:id')
  @ApiOperation({ summary: 'Détail client' })
  findOneClient(@Param('id') id: string) {
    return this.transportService.findOneClient(+id);
  }

  @Post('clients')
  @ApiOperation({ summary: 'Créer un client' })
  createClient(@Body() data: any) {
    return this.transportService.createClient(data);
  }

  @Put('clients/:id')
  @ApiOperation({ summary: 'Modifier un client' })
  updateClient(@Param('id') id: string, @Body() data: any) {
    return this.transportService.updateClient(+id, data);
  }
}
