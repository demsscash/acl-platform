import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SortieStock, DotationCarburant, BonTransport, BonLocation, Panne, EntreeStock, ApprovisionnementCuve } from '../database/entities';
import * as ExcelJS from 'exceljs';

export interface ExportFilters {
  dateDebut?: Date;
  dateFin?: Date;
}

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(SortieStock)
    private readonly sortieStockRepository: Repository<SortieStock>,
    @InjectRepository(DotationCarburant)
    private readonly dotationRepository: Repository<DotationCarburant>,
    @InjectRepository(BonTransport)
    private readonly bonTransportRepository: Repository<BonTransport>,
    @InjectRepository(BonLocation)
    private readonly bonLocationRepository: Repository<BonLocation>,
    @InjectRepository(Panne)
    private readonly panneRepository: Repository<Panne>,
    @InjectRepository(EntreeStock)
    private readonly entreeStockRepository: Repository<EntreeStock>,
    @InjectRepository(ApprovisionnementCuve)
    private readonly approCuveRepository: Repository<ApprovisionnementCuve>,
  ) {}

  async getSortiesStock(filters: ExportFilters): Promise<SortieStock[]> {
    const where: any = {};
    if (filters.dateDebut && filters.dateFin) {
      where.dateSortie = Between(filters.dateDebut, filters.dateFin);
    }

    return this.sortieStockRepository.find({
      where,
      relations: ['camion', 'createur'],
      order: { dateSortie: 'DESC' },
    });
  }

  async getDotationsCarburant(filters: ExportFilters): Promise<DotationCarburant[]> {
    const where: any = {};
    if (filters.dateDebut && filters.dateFin) {
      where.dateDotation = Between(filters.dateDebut, filters.dateFin);
    }

    return this.dotationRepository.find({
      where,
      relations: ['camion', 'chauffeur', 'createur', 'cuve'],
      order: { dateDotation: 'DESC' },
    });
  }

  async getBonsTransport(filters: ExportFilters): Promise<BonTransport[]> {
    const where: any = {};
    if (filters.dateDebut && filters.dateFin) {
      where.dateCreation = Between(filters.dateDebut, filters.dateFin);
    }

    return this.bonTransportRepository.find({
      where,
      relations: ['client', 'camion', 'chauffeur'],
      order: { dateCreation: 'DESC' },
    });
  }

  async getBonsLocation(filters: ExportFilters): Promise<BonLocation[]> {
    const where: any = {};
    if (filters.dateDebut && filters.dateFin) {
      where.dateDebut = Between(filters.dateDebut, filters.dateFin);
    }

    return this.bonLocationRepository.find({
      where,
      relations: ['client', 'camion', 'chauffeur'],
      order: { dateDebut: 'DESC' },
    });
  }

  async getPannes(filters: ExportFilters): Promise<Panne[]> {
    const where: any = {};
    if (filters.dateDebut && filters.dateFin) {
      where.datePanne = Between(filters.dateDebut, filters.dateFin);
    }

    return this.panneRepository.find({
      where,
      relations: ['camion', 'chauffeur', 'createur'],
      order: { datePanne: 'DESC' },
    });
  }

  async getEntreesStock(filters: ExportFilters): Promise<EntreeStock[]> {
    const where: any = {};
    if (filters.dateDebut && filters.dateFin) {
      where.dateEntree = Between(filters.dateDebut, filters.dateFin);
    }

    return this.entreeStockRepository.find({
      where,
      relations: ['fournisseur', 'lignes', 'lignes.piece', 'createur'],
      order: { dateEntree: 'DESC' },
    });
  }

  async getApprovisionnementsCuve(filters: ExportFilters): Promise<ApprovisionnementCuve[]> {
    const where: any = {};
    if (filters.dateDebut && filters.dateFin) {
      where.dateApprovisionnement = Between(filters.dateDebut, filters.dateFin);
    }

    return this.approCuveRepository.find({
      where,
      relations: ['cuve', 'fournisseur', 'createur'],
      order: { dateApprovisionnement: 'DESC' },
    });
  }

  // CSV export methods
  sortiesStockToCsv(sorties: SortieStock[]): string {
    const headers = [
      'Date',
      'N° Bon',
      'Camion',
      'Kilométrage',
      'Motif',
      'Notes',
      'Créateur',
    ];

    const rows = sorties.map((s) => [
      s.dateSortie ? new Date(s.dateSortie).toLocaleDateString('fr-FR') : '',
      s.numeroBon || '',
      s.camion?.immatriculation || '',
      s.kilometrageCamion || '',
      s.motif || '',
      s.notes || '',
      s.createur?.nom || '',
    ]);

    return this.toCsv(headers, rows);
  }

  dotationsCarburantToCsv(dotations: DotationCarburant[]): string {
    const headers = [
      'Date',
      'N° Bon',
      'Camion',
      'Chauffeur',
      'Litres',
      'Prix/Litre',
      'Coût Total',
      'Kilométrage',
      'Source',
      'Station/Cuve',
    ];

    const rows = dotations.map((d) => [
      d.dateDotation ? new Date(d.dateDotation).toLocaleDateString('fr-FR') : '',
      d.numeroBon || '',
      d.camion?.immatriculation || '',
      d.chauffeur ? `${d.chauffeur.prenom} ${d.chauffeur.nom}` : '',
      d.quantiteLitres || 0,
      d.prixUnitaire || 0,
      d.coutTotal || 0,
      d.kilometrageCamion || '',
      d.typeSource || '',
      d.typeSource === 'CUVE_INTERNE' ? (d.cuve?.nom || '') : (d.stationNom || ''),
    ]);

    return this.toCsv(headers, rows);
  }

  bonsTransportToCsv(bons: BonTransport[]): string {
    const headers = [
      'Date Création',
      'Numéro',
      'Statut',
      'Client',
      'Camion',
      'Chauffeur',
      'Lieu Chargement',
      'Lieu Déchargement',
      'Nature',
      'Poids (kg)',
      'Montant HT',
    ];

    const rows = bons.map((b) => [
      b.dateCreation ? new Date(b.dateCreation).toLocaleDateString('fr-FR') : '',
      b.numero || '',
      b.statut || '',
      b.client?.raisonSociale || '',
      b.camion?.immatriculation || '',
      b.chauffeur ? `${b.chauffeur.prenom} ${b.chauffeur.nom}` : '',
      b.lieuChargement || '',
      b.lieuDechargement || '',
      b.natureChargement || '',
      b.poidsKg || '',
      b.montantHt || 0,
    ]);

    return this.toCsv(headers, rows);
  }

  bonsLocationToCsv(bons: BonLocation[]): string {
    const headers = [
      'Date Création',
      'Numéro',
      'Statut',
      'Client',
      'Camion',
      'Chauffeur',
      'Date Début',
      'Date Fin Prévue',
      'Tarif Journalier',
      'Montant Total',
      'Carburant Inclus',
    ];

    const rows = bons.map((b) => [
      b.createdAt ? new Date(b.createdAt).toLocaleDateString('fr-FR') : '',
      b.numero || '',
      b.statut || '',
      b.client?.raisonSociale || '',
      b.camion?.immatriculation || '',
      b.chauffeur ? `${b.chauffeur.prenom} ${b.chauffeur.nom}` : '',
      b.dateDebut ? new Date(b.dateDebut).toLocaleDateString('fr-FR') : '',
      b.dateFinPrevue ? new Date(b.dateFinPrevue).toLocaleDateString('fr-FR') : '',
      b.tarifJournalier || 0,
      b.montantTotal || 0,
      b.carburantInclus ? 'Oui' : 'Non',
    ]);

    return this.toCsv(headers, rows);
  }

  pannesToCsv(pannes: Panne[]): string {
    const headers = [
      'Date',
      'N° Panne',
      'Camion',
      'Type',
      'Priorité',
      'Statut',
      'Description',
      'Chauffeur',
      'Kilométrage',
      'Coût Estimé',
      'Coût Réel',
      'Réparateur',
      'Date Début Réparation',
      'Date Fin Réparation',
    ];

    const rows = pannes.map((p) => [
      p.datePanne ? new Date(p.datePanne).toLocaleDateString('fr-FR') : '',
      p.numeroPanne || '',
      p.camion?.immatriculation || '',
      p.typePanne || '',
      p.priorite || '',
      p.statut || '',
      p.description || '',
      p.chauffeur ? `${p.chauffeur.prenom} ${p.chauffeur.nom}` : '',
      p.kilometragePanne || '',
      p.coutEstime || 0,
      p.coutReel || 0,
      p.reparateurExterne || '',
      p.dateDebutReparation ? new Date(p.dateDebutReparation).toLocaleDateString('fr-FR') : '',
      p.dateFinReparation ? new Date(p.dateFinReparation).toLocaleDateString('fr-FR') : '',
    ]);

    return this.toCsv(headers, rows);
  }

  entreesStockToCsv(entrees: EntreeStock[]): string {
    const headers = [
      'Date',
      'N° Bon',
      'Type',
      'Fournisseur',
      'N° Facture',
      'N° BL',
      'Nb Articles',
      'Montant Total',
      'Notes',
    ];

    const rows = entrees.map((e) => {
      const total = e.lignes?.reduce((sum, l) => sum + (Number(l.prixUnitaire || 0) * Number(l.quantite || 0)), 0) || 0;
      return [
        e.dateEntree ? new Date(e.dateEntree).toLocaleDateString('fr-FR') : '',
        e.numeroBon || '',
        e.typeEntree || '',
        e.fournisseur?.raisonSociale || '',
        e.numeroFacture || '',
        e.numeroBL || '',
        e.lignes?.length || 0,
        total,
        e.notes || '',
      ];
    });

    return this.toCsv(headers, rows);
  }

  approvisionnementsCuveToCsv(appros: ApprovisionnementCuve[]): string {
    const headers = [
      'Date',
      'N° Bon',
      'Cuve',
      'Fournisseur',
      'Litres',
      'Prix/Litre',
      'Coût Total',
      'N° Facture',
      'N° BL',
      'Niveau Avant',
      'Niveau Après',
    ];

    const rows = appros.map((a) => [
      a.dateApprovisionnement ? new Date(a.dateApprovisionnement).toLocaleDateString('fr-FR') : '',
      a.numeroBon || '',
      a.cuve?.nom || '',
      a.fournisseur?.raisonSociale || '',
      a.quantiteLitres || 0,
      a.prixUnitaire || 0,
      a.coutTotal || 0,
      a.numeroFacture || '',
      a.numeroBonLivraison || '',
      a.niveauAvantLitres || 0,
      a.niveauApresLitres || 0,
    ]);

    return this.toCsv(headers, rows);
  }

  private toCsv(headers: string[], rows: any[][]): string {
    const escapeField = (field: any): string => {
      const str = String(field ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeField).join(',');
    const dataLines = rows.map((row) => row.map(escapeField).join(','));

    return [headerLine, ...dataLines].join('\n');
  }

  // Excel export methods
  private createWorkbook(sheetName: string, headers: string[], rows: any[][]): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ACL Platform';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName);

    // Add headers with styling
    worksheet.columns = headers.map((header, index) => ({
      header,
      key: `col${index}`,
      width: Math.max(header.length + 5, 15),
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' }, // Dark gray
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Add data rows
    rows.forEach((row, rowIndex) => {
      const dataRow = worksheet.addRow(row);
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        dataRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' }, // Light gray
        };
      }
    });

    // Add borders and auto-fit
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    return workbook;
  }

  async sortiesStockToExcel(sorties: SortieStock[]): Promise<Buffer> {
    const headers = [
      'Date',
      'N° Bon',
      'Camion',
      'Kilométrage',
      'Motif',
      'Notes',
      'Créateur',
    ];

    const rows = sorties.map((s) => [
      s.dateSortie ? new Date(s.dateSortie).toLocaleDateString('fr-FR') : '',
      s.numeroBon || '',
      s.camion?.immatriculation || '',
      s.kilometrageCamion || '',
      s.motif || '',
      s.notes || '',
      s.createur?.nom || '',
    ]);

    const workbook = this.createWorkbook('Sorties Stock', headers, rows);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async dotationsCarburantToExcel(dotations: DotationCarburant[]): Promise<Buffer> {
    const headers = [
      'Date',
      'N° Bon',
      'Camion',
      'Chauffeur',
      'Litres',
      'Prix/Litre',
      'Coût Total',
      'Kilométrage',
      'Source',
      'Station/Cuve',
    ];

    const rows = dotations.map((d) => [
      d.dateDotation ? new Date(d.dateDotation).toLocaleDateString('fr-FR') : '',
      d.numeroBon || '',
      d.camion?.immatriculation || '',
      d.chauffeur ? `${d.chauffeur.prenom} ${d.chauffeur.nom}` : '',
      d.quantiteLitres || 0,
      d.prixUnitaire || 0,
      d.coutTotal || 0,
      d.kilometrageCamion || '',
      d.typeSource || '',
      d.typeSource === 'CUVE_INTERNE' ? (d.cuve?.nom || '') : (d.stationNom || ''),
    ]);

    const workbook = this.createWorkbook('Dotations Carburant', headers, rows);

    // Format numeric columns
    const worksheet = workbook.getWorksheet('Dotations Carburant');
    if (worksheet) {
      worksheet.getColumn(5).numFmt = '#,##0.00'; // Litres
      worksheet.getColumn(6).numFmt = '#,##0'; // Prix/Litre
      worksheet.getColumn(7).numFmt = '#,##0'; // Coût Total
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async bonsTransportToExcel(bons: BonTransport[]): Promise<Buffer> {
    const headers = [
      'Date Création',
      'Numéro',
      'Statut',
      'Client',
      'Camion',
      'Chauffeur',
      'Lieu Chargement',
      'Lieu Déchargement',
      'Nature',
      'Poids (kg)',
      'Montant HT',
    ];

    const rows = bons.map((b) => [
      b.dateCreation ? new Date(b.dateCreation).toLocaleDateString('fr-FR') : '',
      b.numero || '',
      b.statut || '',
      b.client?.raisonSociale || '',
      b.camion?.immatriculation || '',
      b.chauffeur ? `${b.chauffeur.prenom} ${b.chauffeur.nom}` : '',
      b.lieuChargement || '',
      b.lieuDechargement || '',
      b.natureChargement || '',
      b.poidsKg || '',
      b.montantHt || 0,
    ]);

    const workbook = this.createWorkbook('Bons Transport', headers, rows);

    const worksheet = workbook.getWorksheet('Bons Transport');
    if (worksheet) {
      worksheet.getColumn(10).numFmt = '#,##0'; // Poids
      worksheet.getColumn(11).numFmt = '#,##0'; // Montant HT
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async bonsLocationToExcel(bons: BonLocation[]): Promise<Buffer> {
    const headers = [
      'Date Création',
      'Numéro',
      'Statut',
      'Client',
      'Camion',
      'Chauffeur',
      'Date Début',
      'Date Fin Prévue',
      'Tarif Journalier',
      'Montant Total',
      'Carburant Inclus',
    ];

    const rows = bons.map((b) => [
      b.createdAt ? new Date(b.createdAt).toLocaleDateString('fr-FR') : '',
      b.numero || '',
      b.statut || '',
      b.client?.raisonSociale || '',
      b.camion?.immatriculation || '',
      b.chauffeur ? `${b.chauffeur.prenom} ${b.chauffeur.nom}` : '',
      b.dateDebut ? new Date(b.dateDebut).toLocaleDateString('fr-FR') : '',
      b.dateFinPrevue ? new Date(b.dateFinPrevue).toLocaleDateString('fr-FR') : '',
      b.tarifJournalier || 0,
      b.montantTotal || 0,
      b.carburantInclus ? 'Oui' : 'Non',
    ]);

    const workbook = this.createWorkbook('Bons Location', headers, rows);

    const worksheet = workbook.getWorksheet('Bons Location');
    if (worksheet) {
      worksheet.getColumn(9).numFmt = '#,##0'; // Tarif Journalier
      worksheet.getColumn(10).numFmt = '#,##0'; // Montant Total
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async pannesToExcel(pannes: Panne[]): Promise<Buffer> {
    const headers = [
      'Date',
      'N° Panne',
      'Camion',
      'Type',
      'Priorité',
      'Statut',
      'Description',
      'Chauffeur',
      'Kilométrage',
      'Coût Estimé',
      'Coût Réel',
      'Réparateur',
      'Date Début Réparation',
      'Date Fin Réparation',
    ];

    const rows = pannes.map((p) => [
      p.datePanne ? new Date(p.datePanne).toLocaleDateString('fr-FR') : '',
      p.numeroPanne || '',
      p.camion?.immatriculation || '',
      p.typePanne || '',
      p.priorite || '',
      p.statut || '',
      p.description || '',
      p.chauffeur ? `${p.chauffeur.prenom} ${p.chauffeur.nom}` : '',
      p.kilometragePanne || '',
      p.coutEstime || 0,
      p.coutReel || 0,
      p.reparateurExterne || '',
      p.dateDebutReparation ? new Date(p.dateDebutReparation).toLocaleDateString('fr-FR') : '',
      p.dateFinReparation ? new Date(p.dateFinReparation).toLocaleDateString('fr-FR') : '',
    ]);

    const workbook = this.createWorkbook('Pannes', headers, rows);

    const worksheet = workbook.getWorksheet('Pannes');
    if (worksheet) {
      worksheet.getColumn(10).numFmt = '#,##0'; // Coût Estimé
      worksheet.getColumn(11).numFmt = '#,##0'; // Coût Réel
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async entreesStockToExcel(entrees: EntreeStock[]): Promise<Buffer> {
    const headers = [
      'Date',
      'N° Bon',
      'Type',
      'Fournisseur',
      'N° Facture',
      'N° BL',
      'Nb Articles',
      'Montant Total',
      'Notes',
    ];

    const rows = entrees.map((e) => {
      const total = e.lignes?.reduce((sum, l) => sum + (Number(l.prixUnitaire || 0) * Number(l.quantite || 0)), 0) || 0;
      return [
        e.dateEntree ? new Date(e.dateEntree).toLocaleDateString('fr-FR') : '',
        e.numeroBon || '',
        e.typeEntree || '',
        e.fournisseur?.raisonSociale || '',
        e.numeroFacture || '',
        e.numeroBL || '',
        e.lignes?.length || 0,
        total,
        e.notes || '',
      ];
    });

    const workbook = this.createWorkbook('Entrées Stock', headers, rows);

    const worksheet = workbook.getWorksheet('Entrées Stock');
    if (worksheet) {
      worksheet.getColumn(8).numFmt = '#,##0'; // Montant Total
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async approvisionnementsCuveToExcel(appros: ApprovisionnementCuve[]): Promise<Buffer> {
    const headers = [
      'Date',
      'N° Bon',
      'Cuve',
      'Fournisseur',
      'Litres',
      'Prix/Litre',
      'Coût Total',
      'N° Facture',
      'N° BL',
      'Niveau Avant',
      'Niveau Après',
    ];

    const rows = appros.map((a) => [
      a.dateApprovisionnement ? new Date(a.dateApprovisionnement).toLocaleDateString('fr-FR') : '',
      a.numeroBon || '',
      a.cuve?.nom || '',
      a.fournisseur?.raisonSociale || '',
      a.quantiteLitres || 0,
      a.prixUnitaire || 0,
      a.coutTotal || 0,
      a.numeroFacture || '',
      a.numeroBonLivraison || '',
      a.niveauAvantLitres || 0,
      a.niveauApresLitres || 0,
    ]);

    const workbook = this.createWorkbook('Approvisionnements Cuve', headers, rows);

    const worksheet = workbook.getWorksheet('Approvisionnements Cuve');
    if (worksheet) {
      worksheet.getColumn(5).numFmt = '#,##0.00'; // Litres
      worksheet.getColumn(6).numFmt = '#,##0'; // Prix/Litre
      worksheet.getColumn(7).numFmt = '#,##0'; // Coût Total
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Summary statistics for export page
  async getExportStats(filters: ExportFilters): Promise<any> {
    const [sortiesStock, dotationsCarburant, bonsTransport, bonsLocation, pannes, entreesStock, approCuve] = await Promise.all([
      this.getSortiesStock(filters),
      this.getDotationsCarburant(filters),
      this.getBonsTransport(filters),
      this.getBonsLocation(filters),
      this.getPannes(filters),
      this.getEntreesStock(filters),
      this.getApprovisionnementsCuve(filters),
    ]);

    const totalCarburant = dotationsCarburant.reduce(
      (sum, d) => sum + (Number(d.coutTotal) || 0),
      0,
    );
    const totalTransport = bonsTransport.reduce(
      (sum, b) => sum + (Number(b.montantHt) || 0),
      0,
    );
    const totalLocation = bonsLocation.reduce(
      (sum, b) => sum + (Number(b.montantTotal) || 0),
      0,
    );
    const totalPannes = pannes.reduce(
      (sum, p) => sum + (Number(p.coutReel) || Number(p.coutEstime) || 0),
      0,
    );
    const totalEntrees = entreesStock.reduce(
      (sum, e) => sum + (e.lignes?.reduce((ls, l) => ls + (Number(l.prixUnitaire || 0) * Number(l.quantite || 0)), 0) || 0),
      0,
    );
    const totalApproCuve = approCuve.reduce(
      (sum, a) => sum + (Number(a.coutTotal) || 0),
      0,
    );

    const totalDepenses = totalCarburant + totalPannes + totalEntrees + totalApproCuve;
    const totalRevenus = totalTransport + totalLocation;

    return {
      sortiesStock: {
        count: sortiesStock.length,
      },
      dotationsCarburant: {
        count: dotationsCarburant.length,
        total: totalCarburant,
      },
      bonsTransport: {
        count: bonsTransport.length,
        total: totalTransport,
      },
      bonsLocation: {
        count: bonsLocation.length,
        total: totalLocation,
      },
      pannes: {
        count: pannes.length,
        total: totalPannes,
      },
      entreesStock: {
        count: entreesStock.length,
        total: totalEntrees,
      },
      approvisionnementsCuve: {
        count: approCuve.length,
        total: totalApproCuve,
      },
      totaux: {
        depenses: totalDepenses,
        revenus: totalRevenus,
        solde: totalRevenus - totalDepenses,
      },
    };
  }
}
