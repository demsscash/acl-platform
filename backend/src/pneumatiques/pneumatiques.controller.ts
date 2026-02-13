import { Controller, Get, Post, Put, Body, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PneumatiquesService } from './pneumatiques.service';
import { CataloguePneu, StockPneumatique, ControlePneumatique } from '../database/entities';

@Controller('api/pneumatiques')
@UseGuards(JwtAuthGuard)
export class PneumatiquesController {
  constructor(private readonly pneumatiquesService: PneumatiquesService) {}

  // Catalogue
  @Get('catalogue')
  getCatalogue(): Promise<CataloguePneu[]> {
    return this.pneumatiquesService.getCatalogue();
  }

  @Post('catalogue')
  createCatalogue(@Body() data: Partial<CataloguePneu>): Promise<CataloguePneu> {
    return this.pneumatiquesService.createCatalogue(data);
  }

  @Put('catalogue/:id')
  updateCatalogue(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<CataloguePneu>,
  ): Promise<CataloguePneu> {
    return this.pneumatiquesService.updateCatalogue(id, data);
  }

  // Stock
  @Get('stock')
  getStock(
    @Query('camionId') camionId?: string,
    @Query('statut') statut?: string,
  ): Promise<StockPneumatique[]> {
    return this.pneumatiquesService.getStock(
      camionId ? parseInt(camionId) : undefined,
      statut,
    );
  }

  @Get('stock/disponible')
  getStockDisponible(): Promise<StockPneumatique[]> {
    return this.pneumatiquesService.getStockDisponible();
  }

  @Get('stock/camion/:camionId')
  getStockByCamion(@Param('camionId', ParseIntPipe) camionId: number): Promise<StockPneumatique[]> {
    return this.pneumatiquesService.getStockByCamion(camionId);
  }

  @Get('stock/:id')
  getPneu(@Param('id', ParseIntPipe) id: number): Promise<StockPneumatique> {
    return this.pneumatiquesService.getPneu(id);
  }

  @Post('stock')
  createPneu(@Body() data: Partial<StockPneumatique>): Promise<StockPneumatique> {
    return this.pneumatiquesService.createPneu(data);
  }

  @Put('stock/:id')
  updatePneu(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<StockPneumatique>,
  ): Promise<StockPneumatique> {
    return this.pneumatiquesService.updatePneu(id, data);
  }

  @Post('stock/:id/installer')
  installerPneu(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { camionId: number; position: string; kmInstallation: number },
  ): Promise<StockPneumatique> {
    return this.pneumatiquesService.installerPneu(
      id,
      data.camionId,
      data.position,
      data.kmInstallation,
    );
  }

  @Post('stock/:id/retirer')
  retirerPneu(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { statut?: string },
  ): Promise<StockPneumatique> {
    return this.pneumatiquesService.retirerPneu(id, data.statut);
  }

  // Contrôles
  @Get('controles')
  getControles(@Query('pneuId') pneuId?: string): Promise<ControlePneumatique[]> {
    return this.pneumatiquesService.getControles(
      pneuId ? parseInt(pneuId) : undefined,
    );
  }

  @Post('controles')
  createControle(
    @Body() data: Partial<ControlePneumatique>,
    @Request() req: any,
  ): Promise<ControlePneumatique> {
    return this.pneumatiquesService.createControle({
      ...data,
      controleurId: req.user.id,
    });
  }

  // Stats
  @Get('stats')
  getStats() {
    return this.pneumatiquesService.getStats();
  }
}
