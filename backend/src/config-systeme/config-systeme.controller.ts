import { Controller, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ConfigSystemeService } from './config-systeme.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleUtilisateur } from '../database/entities/user.entity';

@ApiTags('Configuration Système')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/config')
export class ConfigSystemeController {
  constructor(private readonly configService: ConfigSystemeService) {}

  @Get()
  @ApiOperation({ summary: 'Liste de toutes les configurations' })
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.DIRECTION, RoleUtilisateur.RESPONSABLE_LOGISTIQUE)
  findAll() {
    return this.configService.findAll();
  }

  @Get(':cle')
  @ApiOperation({ summary: 'Obtenir une configuration par clé' })
  findByCle(@Param('cle') cle: string) {
    return this.configService.findByCle(cle);
  }

  @Put(':cle')
  @ApiOperation({ summary: 'Modifier une configuration' })
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.DIRECTION, RoleUtilisateur.RESPONSABLE_LOGISTIQUE)
  setValue(
    @Param('cle') cle: string,
    @Body() data: { valeur: string },
    @Request() req: any,
  ) {
    return this.configService.setValue(cle, data.valeur, req.user.id);
  }

  // Specific endpoint for fuel price
  @Get('carburant/prix')
  @ApiOperation({ summary: 'Obtenir le prix du carburant' })
  getPrixCarburant() {
    return this.configService.getPrixCarburant();
  }

  @Put('carburant/prix')
  @ApiOperation({ summary: 'Modifier le prix du carburant' })
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.DIRECTION, RoleUtilisateur.RESPONSABLE_LOGISTIQUE)
  setPrixCarburant(
    @Body() data: { prix: number },
    @Request() req: any,
  ) {
    return this.configService.setPrixCarburant(data.prix, req.user.id);
  }
}
