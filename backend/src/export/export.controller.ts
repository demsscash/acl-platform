import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExportService, ExportFilters } from './export.service';

@Controller('api/export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('stats')
  async getStats(
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
  ) {
    const filters: ExportFilters = {};
    if (dateDebut) filters.dateDebut = new Date(dateDebut);
    if (dateFin) filters.dateFin = new Date(dateFin);

    return this.exportService.getExportStats(filters);
  }

  @Get('sorties-stock')
  async exportSortiesStock(
    @Query('dateDebut') dateDebut: string | undefined,
    @Query('dateFin') dateFin: string | undefined,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ): Promise<void> {
    const filters: ExportFilters = {};
    if (dateDebut) filters.dateDebut = new Date(dateDebut);
    if (dateFin) filters.dateFin = new Date(dateFin);

    const data = await this.exportService.getSortiesStock(filters);

    if (format === 'xlsx') {
      const buffer = await this.exportService.sortiesStockToExcel(data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="sorties-stock-${this.getDateStr()}.xlsx"`);
      res.send(buffer);
    } else {
      const csv = this.exportService.sortiesStockToCsv(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="sorties-stock-${this.getDateStr()}.csv"`);
      res.send('\uFEFF' + csv); // BOM for Excel UTF-8
    }
  }

  @Get('dotations-carburant')
  async exportDotationsCarburant(
    @Query('dateDebut') dateDebut: string | undefined,
    @Query('dateFin') dateFin: string | undefined,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ): Promise<void> {
    const filters: ExportFilters = {};
    if (dateDebut) filters.dateDebut = new Date(dateDebut);
    if (dateFin) filters.dateFin = new Date(dateFin);

    const data = await this.exportService.getDotationsCarburant(filters);

    if (format === 'xlsx') {
      const buffer = await this.exportService.dotationsCarburantToExcel(data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="dotations-carburant-${this.getDateStr()}.xlsx"`);
      res.send(buffer);
    } else {
      const csv = this.exportService.dotationsCarburantToCsv(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="dotations-carburant-${this.getDateStr()}.csv"`);
      res.send('\uFEFF' + csv);
    }
  }

  @Get('bons-transport')
  async exportBonsTransport(
    @Query('dateDebut') dateDebut: string | undefined,
    @Query('dateFin') dateFin: string | undefined,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ): Promise<void> {
    const filters: ExportFilters = {};
    if (dateDebut) filters.dateDebut = new Date(dateDebut);
    if (dateFin) filters.dateFin = new Date(dateFin);

    const data = await this.exportService.getBonsTransport(filters);

    if (format === 'xlsx') {
      const buffer = await this.exportService.bonsTransportToExcel(data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="bons-transport-${this.getDateStr()}.xlsx"`);
      res.send(buffer);
    } else {
      const csv = this.exportService.bonsTransportToCsv(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="bons-transport-${this.getDateStr()}.csv"`);
      res.send('\uFEFF' + csv);
    }
  }

  @Get('bons-location')
  async exportBonsLocation(
    @Query('dateDebut') dateDebut: string | undefined,
    @Query('dateFin') dateFin: string | undefined,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ): Promise<void> {
    const filters: ExportFilters = {};
    if (dateDebut) filters.dateDebut = new Date(dateDebut);
    if (dateFin) filters.dateFin = new Date(dateFin);

    const data = await this.exportService.getBonsLocation(filters);

    if (format === 'xlsx') {
      const buffer = await this.exportService.bonsLocationToExcel(data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="bons-location-${this.getDateStr()}.xlsx"`);
      res.send(buffer);
    } else {
      const csv = this.exportService.bonsLocationToCsv(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="bons-location-${this.getDateStr()}.csv"`);
      res.send('\uFEFF' + csv);
    }
  }

  @Get('pannes')
  async exportPannes(
    @Query('dateDebut') dateDebut: string | undefined,
    @Query('dateFin') dateFin: string | undefined,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ): Promise<void> {
    const filters: ExportFilters = {};
    if (dateDebut) filters.dateDebut = new Date(dateDebut);
    if (dateFin) filters.dateFin = new Date(dateFin);

    const data = await this.exportService.getPannes(filters);

    if (format === 'xlsx') {
      const buffer = await this.exportService.pannesToExcel(data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="pannes-${this.getDateStr()}.xlsx"`);
      res.send(buffer);
    } else {
      const csv = this.exportService.pannesToCsv(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="pannes-${this.getDateStr()}.csv"`);
      res.send('\uFEFF' + csv);
    }
  }

  @Get('entrees-stock')
  async exportEntreesStock(
    @Query('dateDebut') dateDebut: string | undefined,
    @Query('dateFin') dateFin: string | undefined,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ): Promise<void> {
    const filters: ExportFilters = {};
    if (dateDebut) filters.dateDebut = new Date(dateDebut);
    if (dateFin) filters.dateFin = new Date(dateFin);

    const data = await this.exportService.getEntreesStock(filters);

    if (format === 'xlsx') {
      const buffer = await this.exportService.entreesStockToExcel(data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="entrees-stock-${this.getDateStr()}.xlsx"`);
      res.send(buffer);
    } else {
      const csv = this.exportService.entreesStockToCsv(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="entrees-stock-${this.getDateStr()}.csv"`);
      res.send('\uFEFF' + csv);
    }
  }

  @Get('approvisionnements-cuve')
  async exportApprovisionnementsCuve(
    @Query('dateDebut') dateDebut: string | undefined,
    @Query('dateFin') dateFin: string | undefined,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ): Promise<void> {
    const filters: ExportFilters = {};
    if (dateDebut) filters.dateDebut = new Date(dateDebut);
    if (dateFin) filters.dateFin = new Date(dateFin);

    const data = await this.exportService.getApprovisionnementsCuve(filters);

    if (format === 'xlsx') {
      const buffer = await this.exportService.approvisionnementsCuveToExcel(data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="approvisionnements-cuve-${this.getDateStr()}.xlsx"`);
      res.send(buffer);
    } else {
      const csv = this.exportService.approvisionnementsCuveToCsv(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="approvisionnements-cuve-${this.getDateStr()}.csv"`);
      res.send('\uFEFF' + csv);
    }
  }

  private getDateStr(): string {
    return new Date().toISOString().split('T')[0];
  }
}
