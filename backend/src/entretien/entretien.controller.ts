import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EntretienService, SearchMaintenanceDto } from './entretien.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { TypeMaintenance, StatutMaintenance, PrioriteMaintenance } from '../database/entities/maintenance.entity';

@Controller('api/entretien')
@UseGuards(JwtAuthGuard)
export class EntretienController {
  constructor(private readonly entretienService: EntretienService) {}

  // Get all maintenances with optional filters
  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('camionId') camionId?: string,
    @Query('type') type?: TypeMaintenance,
    @Query('statut') statut?: StatutMaintenance,
    @Query('priorite') priorite?: PrioriteMaintenance,
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
  ) {
    const filters: SearchMaintenanceDto = {
      search,
      camionId: camionId ? parseInt(camionId) : undefined,
      type,
      statut,
      priorite,
      dateDebut,
      dateFin,
    };
    return this.entretienService.findAll(filters);
  }

  // Get statistics
  @Get('stats')
  async getStats() {
    return this.entretienService.getStats();
  }

  // Get upcoming maintenances
  @Get('upcoming')
  async getUpcoming() {
    return this.entretienService.getUpcoming();
  }

  // Get overdue maintenances
  @Get('overdue')
  async getOverdue() {
    return this.entretienService.getOverdue();
  }

  // Get maintenances for a specific camion
  @Get('camion/:camionId')
  async findByCamion(@Param('camionId') camionId: string) {
    return this.entretienService.findByCamion(parseInt(camionId));
  }

  // Get one maintenance by ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.entretienService.findOne(parseInt(id));
  }

  // Create maintenance
  @Post()
  async create(@Body() dto: CreateMaintenanceDto, @Request() req) {
    return this.entretienService.create(dto, req.user.id);
  }

  // Update maintenance
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateMaintenanceDto) {
    return this.entretienService.update(parseInt(id), dto);
  }

  // Delete maintenance
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.entretienService.delete(parseInt(id));
    return { success: true };
  }

  // Update status
  @Put(':id/statut')
  async updateStatut(
    @Param('id') id: string,
    @Body('statut') statut: StatutMaintenance,
  ) {
    return this.entretienService.update(parseInt(id), { statut });
  }
}
