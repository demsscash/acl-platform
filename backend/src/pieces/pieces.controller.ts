import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PiecesService } from './pieces.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MotifSortie, TypeEntree, TypeMouvementPiece, EtatPiece } from '../database/entities';
import { RoleUtilisateur } from '../database/entities/user.entity';

@ApiTags('Pieces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/pieces')
export class PiecesController {
  constructor(private readonly piecesService: PiecesService) {}

  // Catalogue endpoints
  @Get()
  @ApiOperation({ summary: 'Liste des pièces du catalogue' })
  findAllPieces() {
    return this.piecesService.findAllPieces();
  }

  @Get('catalogue')
  @ApiOperation({ summary: 'Liste des pièces du catalogue (alias)' })
  findAllPiecesCatalogue() {
    return this.piecesService.findAllPieces();
  }

  @Post()
  @ApiOperation({ summary: 'Créer une pièce' })
  createPiece(@Body() data: any) {
    return this.piecesService.createPiece(data);
  }

  @Get('alertes')
  @ApiOperation({ summary: 'Pièces en alerte de stock' })
  getPiecesEnAlerte() {
    return this.piecesService.getPiecesEnAlerte();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques des pièces' })
  async getStats() {
    const [entrees, sorties, alertes] = await Promise.all([
      this.piecesService.getEntreesStats(),
      this.piecesService.getSortiesStats(),
      this.piecesService.getPiecesEnAlerte(),
    ]);
    return {
      entrees,
      sorties,
      alertes: alertes.length,
      piecesEnAlerte: alertes,
    };
  }

  // Fournisseurs - MUST be before :id routes
  @Get('fournisseurs')
  @ApiOperation({ summary: 'Liste des fournisseurs' })
  findAllFournisseurs() {
    return this.piecesService.findAllFournisseurs();
  }

  @Post('fournisseurs')
  @ApiOperation({ summary: 'Créer un fournisseur' })
  createFournisseur(
    @Body() data: {
      raisonSociale: string;
      adresse?: string;
      telephone?: string;
      email?: string;
    },
  ) {
    return this.piecesService.createFournisseur(data);
  }

  @Put('fournisseurs/:id')
  @ApiOperation({ summary: 'Modifier un fournisseur' })
  updateFournisseur(@Param('id') id: string, @Body() data: any) {
    return this.piecesService.updateFournisseur(+id, data);
  }

  @Delete('fournisseurs/:id')
  @ApiOperation({ summary: 'Supprimer un fournisseur' })
  deleteFournisseur(@Param('id') id: string) {
    return this.piecesService.deleteFournisseur(+id);
  }

  // Historique des mouvements - MUST be before :id routes
  @Get('mouvements')
  @ApiOperation({ summary: 'Historique des mouvements de stock' })
  getHistoriqueMouvements(@Query('pieceId') pieceId?: string) {
    return this.piecesService.getHistoriqueMouvements(pieceId ? +pieceId : undefined);
  }

  // Stock endpoints
  @Get('stock')
  @ApiOperation({ summary: 'État du stock' })
  getStockAlias() {
    return this.piecesService.getStock();
  }

  @Get('stock/all')
  @ApiOperation({ summary: 'État du stock (alias)' })
  getStock() {
    return this.piecesService.getStock();
  }

  @Get('stock/:pieceId')
  @ApiOperation({ summary: 'Stock d\'une pièce' })
  getStockByPiece(@Param('pieceId') pieceId: string) {
    return this.piecesService.getStockByPiece(+pieceId);
  }

  @Post('stock/entree')
  @ApiOperation({ summary: 'Entrée de stock' })
  entreeStock(@Body() data: { pieceId: number; quantite: number; emplacement?: string }) {
    return this.piecesService.updateStock(data.pieceId, data.quantite, data.emplacement);
  }

  // Sortie de stock endpoints
  @Get('sorties')
  @ApiOperation({ summary: 'Liste des sorties de stock' })
  findAllSortiesAlias() {
    return this.piecesService.findAllSorties();
  }

  @Get('sorties/all')
  @ApiOperation({ summary: 'Liste des sorties de stock (alias)' })
  findAllSorties() {
    return this.piecesService.findAllSorties();
  }

  @Get('sorties/stats')
  @ApiOperation({ summary: 'Statistiques des sorties' })
  getSortiesStats() {
    return this.piecesService.getSortiesStats();
  }

  @Get('sorties/camion/:camionId')
  @ApiOperation({ summary: 'Sorties de stock pour un camion' })
  findSortiesByCamion(@Param('camionId') camionId: string) {
    return this.piecesService.findSortiesByCamion(+camionId);
  }

  @Get('sorties/:id')
  @ApiOperation({ summary: 'Détail d\'une sortie de stock' })
  findOneSortie(@Param('id') id: string) {
    return this.piecesService.findOneSortie(+id);
  }

  @Post('sorties')
  @ApiOperation({ summary: 'Créer une sortie de stock' })
  createSortie(
    @Body() data: {
      camionId: number;
      dateSortie?: Date;
      kilometrageCamion?: number;
      motif: MotifSortie;
      panneId?: number;
      notes?: string;
      lignes: { pieceId: number; quantite: number; emplacement?: string }[];
    },
    @Request() req: any,
  ) {
    return this.piecesService.createSortie(data, req.user.id);
  }

  // Entrée de stock endpoints
  @Get('entrees')
  @ApiOperation({ summary: 'Liste des entrées de stock' })
  findAllEntreesAlias() {
    return this.piecesService.findAllEntrees();
  }

  @Get('entrees/all')
  @ApiOperation({ summary: 'Liste des entrées de stock (alias)' })
  findAllEntrees() {
    return this.piecesService.findAllEntrees();
  }

  @Get('entrees/stats')
  @ApiOperation({ summary: 'Statistiques des entrées' })
  getEntreesStats() {
    return this.piecesService.getEntreesStats();
  }

  @Get('entrees/:id')
  @ApiOperation({ summary: 'Détail d\'une entrée de stock' })
  findOneEntree(@Param('id') id: string) {
    return this.piecesService.findOneEntree(+id);
  }

  @Post('entrees')
  @ApiOperation({ summary: 'Créer une entrée de stock' })
  createEntree(
    @Body() data: {
      dateEntree?: Date;
      typeEntree: TypeEntree;
      fournisseurId?: number;
      numeroFacture?: string;
      numeroBL?: string;
      notes?: string;
      lignes: { pieceId: number; quantite: number; prixUnitaire?: number; emplacement?: string }[];
    },
    @Request() req: any,
  ) {
    return this.piecesService.createEntree(data, req.user.id);
  }

  // Inventaire - Ajustement de stock
  @Post('inventaire/ajuster')
  @ApiOperation({ summary: 'Ajuster le stock (inventaire)' })
  ajusterStock(
    @Body() data: {
      pieceId: number;
      nouvelleQuantite: number;
      motif: string;
      emplacement?: string;
    },
    @Request() req: any,
  ) {
    return this.piecesService.ajusterStock(
      data.pieceId,
      data.nouvelleQuantite,
      data.motif,
      req.user.id,
      data.emplacement,
    );
  }

  // ===== TRAÇABILITÉ DES PIÈCES (Mouvements) =====
  // Accessible au MAGASINIER et MAINTENANCIER

  @Get('tracabilite/all')
  @ApiOperation({ summary: 'Liste des mouvements de pièces (traçabilité)' })
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.RESPONSABLE_LOGISTIQUE, RoleUtilisateur.MAGASINIER, RoleUtilisateur.MAINTENANCIER)
  findAllMouvements(
    @Query('pieceId') pieceId?: string,
    @Query('camionId') camionId?: string,
    @Query('typeMouvement') typeMouvement?: TypeMouvementPiece,
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
  ) {
    return this.piecesService.findAllMouvements({
      pieceId: pieceId ? +pieceId : undefined,
      camionId: camionId ? +camionId : undefined,
      typeMouvement,
      dateDebut,
      dateFin,
    });
  }

  @Get('tracabilite/stats')
  @ApiOperation({ summary: 'Statistiques des mouvements de pièces' })
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.RESPONSABLE_LOGISTIQUE, RoleUtilisateur.MAGASINIER, RoleUtilisateur.MAINTENANCIER)
  getMouvementsStats() {
    return this.piecesService.getMouvementsStats();
  }

  @Get('tracabilite/camion/:camionId')
  @ApiOperation({ summary: 'Mouvements de pièces pour un camion' })
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.RESPONSABLE_LOGISTIQUE, RoleUtilisateur.MAGASINIER, RoleUtilisateur.MAINTENANCIER)
  findMouvementsByCamion(@Param('camionId') camionId: string) {
    return this.piecesService.findMouvementsByCamion(+camionId);
  }

  @Get('tracabilite/camion/:camionId/pieces-installees')
  @ApiOperation({ summary: 'Pièces actuellement installées sur un camion' })
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.RESPONSABLE_LOGISTIQUE, RoleUtilisateur.MAGASINIER, RoleUtilisateur.MAINTENANCIER)
  getPiecesInstallesSurCamion(@Param('camionId') camionId: string) {
    return this.piecesService.getPiecesInstallesSurCamion(+camionId);
  }

  @Get('tracabilite/piece/:pieceId')
  @ApiOperation({ summary: 'Historique des mouvements d\'une pièce' })
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.RESPONSABLE_LOGISTIQUE, RoleUtilisateur.MAGASINIER, RoleUtilisateur.MAINTENANCIER)
  findMouvementsByPiece(@Param('pieceId') pieceId: string) {
    return this.piecesService.findMouvementsByPiece(+pieceId);
  }

  @Get('tracabilite/:id')
  @ApiOperation({ summary: 'Détail d\'un mouvement de pièce' })
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.RESPONSABLE_LOGISTIQUE, RoleUtilisateur.MAGASINIER, RoleUtilisateur.MAINTENANCIER)
  findOneMouvement(@Param('id') id: string) {
    return this.piecesService.findOneMouvement(+id);
  }

  @Post('tracabilite/interchange')
  @ApiOperation({ summary: 'Interchange de pièce entre deux camions' })
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.RESPONSABLE_LOGISTIQUE, RoleUtilisateur.MAGASINIER, RoleUtilisateur.MAINTENANCIER)
  interchangePiece(
    @Body() data: {
      pieceId: number;
      camionSourceId: number;
      camionDestinationId: number;
      quantite: number;
      etatPiece: EtatPiece;
      motif: string;
      kilometrageSource?: number;
      kilometrageDestination?: number;
      description?: string;
    },
    @Request() req: any,
  ) {
    return this.piecesService.interchangePiece(
      data.pieceId,
      data.camionSourceId,
      data.camionDestinationId,
      data.quantite,
      data.etatPiece,
      data.motif,
      req.user.id,
      data.kilometrageSource,
      data.kilometrageDestination,
      data.description,
    );
  }

  @Post('tracabilite/installer')
  @ApiOperation({ summary: 'Installer une pièce sur un camion' })
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.RESPONSABLE_LOGISTIQUE, RoleUtilisateur.MAGASINIER, RoleUtilisateur.MAINTENANCIER)
  installerPieceSurCamion(
    @Body() data: {
      pieceId: number;
      camionId: number;
      quantite: number;
      etatPiece: EtatPiece;
      motif: string;
      sortieStockId?: number;
      kilometrage?: number;
      description?: string;
    },
    @Request() req: any,
  ) {
    return this.piecesService.installerPieceSurCamion(
      data.pieceId,
      data.camionId,
      data.quantite,
      data.etatPiece,
      data.motif,
      req.user.id,
      data.sortieStockId,
      data.kilometrage,
      data.description,
    );
  }

  @Post('tracabilite/desinstaller')
  @ApiOperation({ summary: 'Désinstaller une pièce d\'un camion' })
  @UseGuards(RolesGuard)
  @Roles(RoleUtilisateur.ADMIN, RoleUtilisateur.RESPONSABLE_LOGISTIQUE, RoleUtilisateur.MAGASINIER, RoleUtilisateur.MAINTENANCIER)
  desinstallerPieceDeCamion(
    @Body() data: {
      pieceId: number;
      camionId: number;
      quantite: number;
      etatPiece: EtatPiece;
      motif: string;
      returnToStock: boolean;
      kilometrage?: number;
      description?: string;
    },
    @Request() req: any,
  ) {
    return this.piecesService.desinstallerPieceDeCamion(
      data.pieceId,
      data.camionId,
      data.quantite,
      data.etatPiece,
      data.motif,
      req.user.id,
      data.returnToStock,
      data.kilometrage,
      data.description,
    );
  }

  // Parameterized routes MUST be last
  @Get(':id')
  @ApiOperation({ summary: 'Détail pièce' })
  findOnePiece(@Param('id') id: string) {
    return this.piecesService.findOnePiece(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une pièce' })
  updatePiece(@Param('id') id: string, @Body() data: any) {
    return this.piecesService.updatePiece(+id, data);
  }
}
