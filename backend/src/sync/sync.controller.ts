import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SyncAllRequestDto,
  SyncAllResultDto,
  SyncDotationsDto,
  SyncSortiesDto,
  SyncBonsTransportDto,
  SyncBonsLocationDto,
  SyncPannesDto,
  SyncResultDto,
  ReferenceDataResponseDto,
} from './dto/sync.dto';

@ApiTags('Sync')
@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  // ==================== HEALTH CHECK (Public) ====================

  @Get('status')
  @ApiOperation({ summary: 'Vérifier le statut du serveur de sync (public)' })
  async getStatus() {
    return this.syncService.getServerStatus();
  }

  // ==================== SYNC ALL ====================

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Synchroniser toutes les données en attente (batch)' })
  async syncAll(
    @Body() data: SyncAllRequestDto,
    @Req() req: any,
  ): Promise<SyncAllResultDto> {
    return this.syncService.syncAll(data, req.user.id);
  }

  // ==================== INDIVIDUAL ENTITY SYNC ====================

  @Post('dotations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Synchroniser les dotations carburant' })
  async syncDotations(
    @Body() data: SyncDotationsDto,
    @Req() req: any,
  ): Promise<SyncResultDto> {
    return this.syncService.syncDotations(data.items, req.user.id);
  }

  @Post('sorties-stock')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Synchroniser les sorties stock' })
  async syncSortiesStock(
    @Body() data: SyncSortiesDto,
    @Req() req: any,
  ): Promise<SyncResultDto> {
    return this.syncService.syncSortiesStock(data.items, req.user.id);
  }

  @Post('bons-transport')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Synchroniser les bons de transport' })
  async syncBonsTransport(
    @Body() data: SyncBonsTransportDto,
    @Req() req: any,
  ): Promise<SyncResultDto> {
    return this.syncService.syncBonsTransport(data.items, req.user.id);
  }

  @Post('bons-location')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Synchroniser les bons de location' })
  async syncBonsLocation(
    @Body() data: SyncBonsLocationDto,
    @Req() req: any,
  ): Promise<SyncResultDto> {
    return this.syncService.syncBonsLocation(data.items, req.user.id);
  }

  @Post('pannes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Synchroniser les pannes' })
  async syncPannes(
    @Body() data: SyncPannesDto,
    @Req() req: any,
  ): Promise<SyncResultDto> {
    return this.syncService.syncPannes(data.items, req.user.id);
  }

  // ==================== REFERENCE DATA ====================

  @Get('reference-data')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Récupérer toutes les données de référence pour sync offline' })
  @ApiQuery({
    name: 'lastSyncAt',
    required: false,
    description: 'Timestamp ISO de la dernière sync pour sync incrémentielle',
  })
  async getReferenceData(
    @Query('lastSyncAt') lastSyncAt?: string,
  ): Promise<ReferenceDataResponseDto> {
    return this.syncService.getReferenceData(lastSyncAt);
  }
}
