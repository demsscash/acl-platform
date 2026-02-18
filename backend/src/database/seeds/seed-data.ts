import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export async function seedData(dataSource: DataSource) {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    console.log('  → Insertion des utilisateurs...');
    // Mot de passe: admin123
    const passwordHash = await bcrypt.hash('admin123', 10);

    await queryRunner.query(`
      INSERT INTO users (email, password_hash, nom, prenom, role, actif)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@acl.sn', passwordHash, 'Admin', 'ACL', 'ADMIN', true]);

    // Utilisateurs de test (mot de passe: Password123!)
    const testPasswordHash = await bcrypt.hash('Password123!', 10);

    await queryRunner.query(`
      INSERT INTO users (email, password_hash, nom, prenom, role, actif)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['amadou.diop@acl-transport.sn', testPasswordHash, 'Diop', 'Amadou', 'DIRECTION', true]);

    await queryRunner.query(`
      INSERT INTO users (email, password_hash, nom, prenom, role, actif)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['fatou.ndiaye@acl-transport.sn', testPasswordHash, 'Ndiaye', 'Fatou', 'COORDINATEUR', true]);

    console.log('  → Insertion de la configuration système...');
    await queryRunner.query(`
      INSERT INTO config_systeme (cle, valeur, description)
      VALUES ('PRIX_CARBURANT_LITRE', '900', 'Prix du carburant en FCFA par litre')
      ON CONFLICT (cle) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO config_systeme (cle, valeur, description)
      VALUES ('DEVISE', 'XOF', 'Devise par défaut')
      ON CONFLICT (cle) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO config_systeme (cle, valeur, description)
      VALUES ('ALERTE_SEUIL_STOCK_MIN', 'true', 'Activer les alertes de stock bas')
      ON CONFLICT (cle) DO NOTHING
    `);

    console.log('  → Insertion des fournisseurs...');
    await queryRunner.query(`
      INSERT INTO fournisseurs (code, raison_sociale, telephone, adresse)
      VALUES ('FOU001', 'Spare Parts Sénégal', '33 812 34 56', 'Dakar')
      ON CONFLICT (code) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO fournisseurs (code, raison_sociale, telephone, adresse)
      VALUES ('FOU002', 'Pneus Service', '33 823 45 67', 'Thiès')
      ON CONFLICT (code) DO NOTHING
    `);

    console.log('  → Insertion des clients...');
    const clients = [
      ['CLI001', 'SONACOS', '33 849 00 00', 'Dakar'],
      ['CLI002', 'SENELEC', '33 834 00 00', 'Dakar'],
      ['CLI003', 'DANGOTE CEMENT', '33 867 00 00', 'Pikine'],
      ['CLI004', 'PORT AUTONOME DE DAKAR', '33 839 00 00', 'Dakar'],
      ['CLI005', 'SOCIETE DEXPLOITATION', '33 845 00 00', 'Dakar'],
      ['CLI006', 'INDUSTRIE CHIMIQUE', '33 865 00 00', 'SMB'],
      ['CLI007', 'GRAND MOULINS', '33 855 00 00', 'Dakar'],
      ['CLI008', 'SAR', '33 875 00 00', 'Dakar'],
      ['CLI009', 'GCCI', '33 835 00 00', 'Dakar'],
      ['CLI010', 'AIR SENEGAL', '33 892 00 00', 'Dakar'],
    ];

    for (const client of clients) {
      await queryRunner.query(`
        INSERT INTO clients (code, raison_sociale, telephone, adresse)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO NOTHING
      `, client);
    }

    console.log('  → Insertion des camions...');
    const camions = [
      ['DK-1001', 'ACL0001', 'TRACTEUR', 'VOLVO', 'FH', 2020, 'DIESEL', 600],
      ['DK-1002', 'ACL0002', 'PORTE_CHAR', 'RENAULT', 'Midlum', 2019, 'DIESEL', 500],
      ['DK-1003', 'ACL0003', 'GRUE', 'MAN', 'TGS', 2018, 'DIESEL', 700],
      ['DK-1004', 'ACL0004', 'BENNE', 'MERCEDES', 'Actros', 2021, 'DIESEL', 650],
      ['DK-1005', 'ACL0005', 'PLATEAU', 'IVECO', 'Eurocargo', 2020, 'DIESEL', 450],
      ['DK-1006', 'ACL0006', 'PORTE_CONTENEUR', 'SCANIA', 'R450', 2019, 'DIESEL', 700],
      ['DK-1007', 'ACL0007', 'CITERNE', 'VOLVO', 'FH', 2018, 'DIESEL', 800],
      ['DK-1008', 'ACL0008', 'TRACTEUR', 'RENAULT', 'T', 2022, 'DIESEL', 600],
      ['DK-1009', 'ACL0009', 'PLATEAU', 'MAN', 'TGL', 2017, 'DIESEL', 400],
      ['DK-1010', 'ACL0010', 'GRUE', 'MERCEDES', 'Zetros', 2021, 'DIESEL', 650],
      ['DK-1011', 'ACL0011', 'BENNE', 'VOLVO', 'FMX', 2020, 'DIESEL', 600],
      ['DK-1012', 'ACL0012', 'PORTE_CHAR', 'SCANIA', 'P410', 2019, 'DIESEL', 500],
      ['DK-1013', 'ACL0013', 'TRACTEUR', 'RENAULT', 'T', 2022, 'DIESEL', 650],
      ['DK-1014', 'ACL0014', 'PLATEAU', 'IVECO', 'Daily', 2018, 'DIESEL', 350],
      ['DK-1015', 'ACL0015', 'GRUE', 'MAN', 'TGS', 2021, 'DIESEL', 750],
      ['DK-1016', 'ACL0016', 'CITERNE', 'MERCEDES', 'Actros', 2017, 'DIESEL', 850],
      ['DK-1017', 'ACL0017', 'PORTE_CONTENEUR', 'VOLVO', 'FH', 2020, 'DIESEL', 700],
      ['DK-1018', 'ACL0018', 'BENNE', 'RENAULT', 'Kerax', 2019, 'DIESEL', 600],
      ['DK-1019', 'ACL0019', 'PLATEAU', 'SCANIA', 'G410', 2022, 'DIESEL', 450],
      ['DK-1020', 'ACL0020', 'TRACTEUR', 'MERCEDES', 'Actros', 2021, 'DIESEL', 680],
      ['AA-1001', 'ACL0021', 'PLATEAU', 'À définir', 'À définir', null, 'DIESEL', null],
      ['AA-1002', 'ACL0022', 'GRUE', 'À définir', 'À définir', null, 'DIESEL', null],
      ['AA-1003', 'ACL0023', 'BENNE', 'À définir', 'À définir', null, 'DIESEL', null],
      ['AA-1004', 'ACL0024', 'PLATEAU', 'À définir', 'À définir', null, 'DIESEL', null],
      ['AA-1005', 'ACL0025', 'PORTE_CHAR', 'À définir', 'À définir', null, 'DIESEL', null],
      ['AA-1006', 'ACL0026', 'PLATEAU', 'À définir', 'À définir', null, 'DIESEL', null],
      ['AA-1007', 'ACL0027', 'GRUE', 'À définir', 'À définir', null, 'DIESEL', null],
      ['AA-1008', 'ACL0028', 'BENNE', 'À définir', 'À définir', null, 'DIESEL', null],
    ];

    for (const camion of camions) {
      await queryRunner.query(`
        INSERT INTO camions (immatriculation, numero_interne, type_camion, marque, modele, annee_mise_circulation, type_carburant, capacite_reservoir_litres, statut)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DISPONIBLE')
        ON CONFLICT (immatriculation) DO NOTHING
      `, camion);
    }

    console.log('  → Insertion des chauffeurs...');
    const chauffeurs = [
      ['MAT001', 'DIOUF', 'Moussa', '77 123 45 67', '1234567890123', 'D', '2020-05-15', '2030-05-15'],
      ['MAT002', 'FALL', 'Ibrahim', '77 234 56 78', '2345678901234', 'D', '2019-03-20', '2029-03-20'],
      ['MAT003', 'NDOYE', 'Cheikh', '77 345 67 89', '3456789012345', 'C', '2021-08-10', '2031-08-10'],
      ['MAT004', 'SOW', 'Omar', '77 456 78 90', '4567890123456', 'D', '2018-11-05', '2028-11-05'],
      ['MAT005', 'KANE', 'Mamadou', '77 567 89 01', '5678901234567', 'D', '2020-07-22', '2030-07-22'],
      ['MAT006', 'BA', 'Abdou', '77 678 90 12', '6789012345678', 'C', '2019-09-18', '2029-09-18'],
      ['MAT007', 'NGOM', 'Pape', '77 789 01 23', '7890123456789', 'D', '2022-02-14', '2032-02-14'],
      ['MAT008', 'DIENG', 'Aliou', '77 890 12 34', '8901234567890', 'D', '2021-04-30', '2031-04-30'],
      ['MAT009', 'THIAM', 'Modou', '77 901 23 45', '9012345678901', 'C', '2020-12-08', '2030-12-08'],
      ['MAT010', 'LY', 'Assane', '77 012 34 56', '0123456789012', 'D', '2019-06-25', '2029-06-25'],
    ];

    for (const chauffeur of chauffeurs) {
      await queryRunner.query(`
        INSERT INTO chauffeurs (matricule, nom, prenom, telephone, numero_permis, type_permis, date_delivrance_permis, date_expiration_permis)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (matricule) DO NOTHING
      `, chauffeur);
    }

    console.log('  → Insertion de la cuve de carburant...');
    await queryRunner.query(`
      INSERT INTO cuves_carburant (nom, type_carburant, capacite_litres, niveau_actuel_litres, seuil_alerte_bas, emplacement)
      VALUES ('Cuve Principale Diesel', 'DIESEL', 10000, 7500, 2000, 'Quartier Docker')
    `);

    console.log('  → Insertion des stations partenaires...');
    await queryRunner.query(`
      INSERT INTO stations_partenaires (code, nom, adresse, ville, telephone, tarif_negocie, type_carburant)
      VALUES ('ST-001', 'Total Energies Dakar Port', 'Zone Portuaire', 'Dakar', '33 849 00 00', 900, 'DIESEL')
      ON CONFLICT (code) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO stations_partenaires (code, nom, adresse, ville, telephone, tarif_negocie, type_carburant)
      VALUES ('ST-002', 'Shell Rufisque', 'Route Nationale 1', 'Rufisque', '33 836 00 00', 895, 'DIESEL')
      ON CONFLICT (code) DO NOTHING
    `);

    console.log('  → Insertion du catalogue des pièces...');
    const pieces = [
      ['PCS-00001', 'FILTRE A HUILE', 'Filtres', 'Unité', 15000],
      ['PCS-00002', 'FILTRE A CARBURANT', 'Filtres', 'Unité', 8500],
      ['PCS-00003', 'FILTRE A AIR', 'Filtres', 'Unité', 12000],
      ['PCS-00004', 'PLAQUETTES DE FREIN AV', 'Freinage', 'Jeux', 45000],
      ['PCS-00005', 'PLAQUETTES DE FREIN AR', 'Freinage', 'Jeux', 42000],
      ['PCS-00006', 'DISQUES DE FREIN', 'Freinage', 'Unité', 55000],
      ['PCS-00007', 'BOUGIE D\'ALLUMAGE', 'Allumage', 'Unité', 8000],
      ['PCS-00008', 'COURROIE ALTERNATEUR', 'Distribution', 'Unité', 18000],
      ['PCS-00009', 'COURROIE DISTRIBUTEUR', 'Distribution', 'Unité', 25000],
      ['PCS-00010', 'KIT DISTRIBUTION', 'Distribution', 'Kit', 150000],
    ];

    for (const piece of pieces) {
      await queryRunner.query(`
        INSERT INTO catalogue_pieces (reference, designation, categorie, unite_mesure, prix_unitaire_moyen)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (reference) DO NOTHING
      `, piece);
    }

    console.log('  → Insertion du catalogue des pneus...');
    const pneus = [
      ['PNE-001', 'PNEU 295/80 R22.5', 'Michelin', '295/80 R22.5', 'Transport', 350000],
      ['PNE-002', 'PNEU 315/80 R22.5', 'Michelin', '315/80 R22.5', 'Transport', 380000],
      ['PNE-003', 'PNEU 385/65 R22.5', 'Michelin', '385/65 R22.5', 'Transport', 420000],
      ['PNE-004', 'PNEU 11R22.5', 'Michelin', '11R22.5', 'Transport', 320000],
      ['PNE-005', 'PNEU 12R22.5', 'Michelin', '12R22.5', 'Transport', 360000],
    ];

    for (const pneu of pneus) {
      await queryRunner.query(`
        INSERT INTO catalogue_pneus (reference, designation, marque, dimension, type_pneu, prix_unitaire)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (reference) DO NOTHING
      `, pneu);
    }

    console.log('  → Insertion des stocks initiaux...');
    for (const piece of pieces) {
      const ref = piece[0] as string;
      await queryRunner.query(`
        INSERT INTO stock_pieces (piece_id, quantite_disponible, emplacement)
        SELECT id, 10, 'A-01' FROM catalogue_pieces WHERE reference = $1
        ON CONFLICT (piece_id, emplacement) DO NOTHING
      `, [ref]);
    }

    console.log('  → Insertion des caisses...');
    await queryRunner.query(`
      INSERT INTO caisses (nom, type, solde_initial, solde_actuel)
      VALUES ('Caisse Principale', 'CENTRALE', 500000, 500000)
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.commitTransaction();
    console.log('  → Transaction validée');

  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('  → Erreur, transaction annulée');
    throw error;
  } finally {
    await queryRunner.release();
  }
}
