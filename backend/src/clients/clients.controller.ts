import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des clients' })
  findAll() {
    return this.clientsService.findAll();
  }

  @Get('generate-code')
  @ApiOperation({ summary: 'Générer un nouveau code client' })
  generateCode() {
    return this.clientsService.generateCode();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail client' })
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(+id);
  }

  @Get(':id/historique')
  @ApiOperation({ summary: 'Historique du client (transports, locations)' })
  getHistorique(@Param('id') id: string) {
    return this.clientsService.getHistorique(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un client' })
  create(@Body() data: any) {
    return this.clientsService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un client' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.clientsService.update(+id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver un client' })
  remove(@Param('id') id: string) {
    return this.clientsService.remove(+id);
  }

  // ============================================
  // GESTION DES CONTACTS
  // ============================================

  @Get(':id/contacts')
  @ApiOperation({ summary: 'Liste des contacts d\'un client' })
  getContacts(@Param('id') id: string) {
    return this.clientsService.getContacts(+id);
  }

  @Post(':id/contacts')
  @ApiOperation({ summary: 'Ajouter un contact à un client' })
  addContact(@Param('id') id: string, @Body() data: any) {
    return this.clientsService.addContact(+id, data);
  }

  @Put(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Modifier un contact' })
  updateContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() data: any,
  ) {
    return this.clientsService.updateContact(+id, +contactId, data);
  }

  @Delete(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Supprimer un contact' })
  removeContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.clientsService.removeContact(+id, +contactId);
  }

  @Put(':id/contacts/:contactId/principal')
  @ApiOperation({ summary: 'Définir un contact comme principal' })
  setContactPrincipal(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return this.clientsService.setContactPrincipal(+id, +contactId);
  }
}
