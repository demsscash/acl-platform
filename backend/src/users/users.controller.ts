import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des utilisateurs' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail utilisateur' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un utilisateur' })
  create(@Body() data: any) {
    return this.usersService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un utilisateur' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.usersService.update(+id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver un utilisateur' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
