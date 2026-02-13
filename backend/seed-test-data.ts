import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

async function seedTestData() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'acl_user',
    password: 'acl_password',
    database: 'acl_db',
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('Connecté à la base de données');

  // ============================================
  // UTILISATEURS SÉNÉGALAIS
  // ============================================
  console.log('\n=== Création des utilisateurs ===');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const utilisateurs = [
    { email: 'amadou.diop@acl-transport.sn', nom: 'Diop', prenom: 'Amadou', telephone: '+221 77 123 45 67', role: 'DIRECTION' },
    { email: 'fatou.ndiaye@acl-transport.sn', nom: 'Ndiaye', prenom: 'Fatou', telephone: '+221 78 234 56 78', role: 'COORDINATEUR' },
    { email: 'moussa.fall@acl-transport.sn', nom: 'Fall', prenom: 'Moussa', telephone: '+221 76 345 67 89', role: 'COORDINATEUR' },
    { email: 'ibrahima.sall@acl-transport.sn', nom: 'Sall', prenom: 'Ibrahima', telephone: '+221 77 456 78 90', role: 'MAGASINIER' },
    { email: 'mariama.ba@acl-transport.sn', nom: 'Ba', prenom: 'Mariama', telephone: '+221 78 567 89 01', role: 'MAGASINIER' },
  ];

  for (const user of utilisateurs) {
    const existing = await dataSource.query(`SELECT id FROM users WHERE email = $1`, [user.email]);
    if (existing.length === 0) {
      await dataSource.query(
        `INSERT INTO users (email, password_hash, nom, prenom, telephone, role, actif)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [user.email, passwordHash, user.nom, user.prenom, user.telephone, user.role]
      );
      console.log(`✓ Utilisateur créé: ${user.prenom} ${user.nom} (${user.role})`);
    } else {
      console.log(`  Utilisateur existant: ${user.email}`);
    }
  }

  // Récupérer l'ID du premier utilisateur pour les références
  const users = await dataSource.query(`SELECT id FROM users LIMIT 1`);
  const userId = users[0]?.id || 1;

  // ============================================
  // CLIENTS SÉNÉGALAIS
  // ============================================
  console.log('\n=== Création des clients ===');

  const clients = [
    { code: 'CLI-001', raisonSociale: 'SENELEC', telephone: '+221 33 839 30 30', email: 'transport@senelec.sn', adresse: 'Boulevard de la République, Dakar', contact: 'Ousmane Sarr' },
    { code: 'CLI-002', raisonSociale: 'Industries Chimiques du Sénégal (ICS)', telephone: '+221 33 849 53 00', email: 'logistique@ics.sn', adresse: 'Route de Mbao, Dakar', contact: 'Abdoulaye Diallo' },
    { code: 'CLI-003', raisonSociale: 'SOCOCIM Industries', telephone: '+221 33 879 10 00', email: 'transport@sococim.sn', adresse: 'Rufisque, Dakar', contact: 'Cheikh Mbaye' },
    { code: 'CLI-004', raisonSociale: 'Port Autonome de Dakar (PAD)', telephone: '+221 33 849 45 45', email: 'operations@portdakar.sn', adresse: 'Boulevard de la Libération, Dakar', contact: 'Mamadou Sy' },
    { code: 'CLI-005', raisonSociale: 'SONACOS', telephone: '+221 33 832 24 24', email: 'logistique@sonacos.sn', adresse: 'Rue Amadou Assane Ndoye, Dakar', contact: 'Awa Dieng' },
    { code: 'CLI-006', raisonSociale: 'Grands Moulins de Dakar', telephone: '+221 33 859 60 60', email: 'transport@gmd.sn', adresse: 'Zone Industrielle, Hann Bel-Air, Dakar', contact: 'Modou Gueye' },
    { code: 'CLI-007', raisonSociale: 'CSS - Compagnie Sucrière Sénégalaise', telephone: '+221 33 961 14 14', email: 'logistique@css.sn', adresse: 'Richard Toll, Saint-Louis', contact: 'Seydou Kane' },
    { code: 'CLI-008', raisonSociale: 'PATISEN', telephone: '+221 33 832 08 08', email: 'transport@patisen.sn', adresse: 'Zone Franche, Dakar', contact: 'Aissatou Fall' },
    { code: 'CLI-009', raisonSociale: 'Dangote Cement Senegal', telephone: '+221 33 859 90 00', email: 'logistics@dangote.sn', adresse: 'Pout, Thiès', contact: 'Lamine Cissé' },
    { code: 'CLI-010', raisonSociale: 'AUCHAN Sénégal', telephone: '+221 33 869 50 50', email: 'supply@auchan.sn', adresse: 'Liberté 6, Dakar', contact: 'Rama Thiam' },
    { code: 'CLI-011', raisonSociale: 'SONATEL', telephone: '+221 33 839 12 12', email: 'infra@sonatel.sn', adresse: '46 Boulevard de la République, Dakar', contact: 'Babacar Niang' },
    { code: 'CLI-012', raisonSociale: 'Eiffage Sénégal', telephone: '+221 33 849 77 77', email: 'chantiers@eiffage.sn', adresse: 'Almadies, Dakar', contact: 'Papa Seck' },
  ];

  for (const client of clients) {
    const existing = await dataSource.query(`SELECT id FROM clients WHERE code = $1`, [client.code]);
    if (existing.length === 0) {
      await dataSource.query(
        `INSERT INTO clients (code, raison_sociale, telephone, email, adresse, contact_nom, actif)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [client.code, client.raisonSociale, client.telephone, client.email, client.adresse, client.contact]
      );
      console.log(`✓ Client créé: ${client.raisonSociale}`);
    } else {
      console.log(`  Client existant: ${client.raisonSociale}`);
    }
  }

  // ============================================
  // FOURNISSEURS SÉNÉGALAIS
  // ============================================
  console.log('\n=== Création des fournisseurs ===');

  const fournisseurs = [
    { code: 'FRN-001', raisonSociale: 'CFAO Motors Sénégal', telephone: '+221 33 869 69 69', email: 'pieces@cfao.sn', adresse: 'Route de Rufisque, Dakar', contact: 'Aliou Diop', conditions: 'Net 30 jours', delai: 3 },
    { code: 'FRN-002', raisonSociale: 'Michelin Sénégal', telephone: '+221 33 832 50 50', email: 'commercial@michelin.sn', adresse: 'Zone Industrielle, Dakar', contact: 'Jean-Pierre Mendy', conditions: 'Net 45 jours', delai: 5 },
    { code: 'FRN-003', raisonSociale: 'TOTAL Energies Sénégal', telephone: '+221 33 839 99 99', email: 'carburant@total.sn', adresse: 'Avenue Léopold Sédar Senghor, Dakar', contact: 'Ndèye Awa Sow', conditions: 'Comptant', delai: 1 },
    { code: 'FRN-004', raisonSociale: 'AUTO PIECES SÉNÉGAL', telephone: '+221 33 824 24 24', email: 'ventes@autopieces.sn', adresse: 'Colobane, Dakar', contact: 'Moustapha Dieng', conditions: 'Net 15 jours', delai: 2 },
    { code: 'FRN-005', raisonSociale: 'SOPRODA - Pièces Détachées', telephone: '+221 33 827 27 27', email: 'commercial@soproda.sn', adresse: 'Médina, Dakar', contact: 'Abdou Aziz Mbengue', conditions: 'Net 30 jours', delai: 4 },
    { code: 'FRN-006', raisonSociale: 'Shell Sénégal', telephone: '+221 33 849 00 00', email: 'b2b@shell.sn', adresse: 'Point E, Dakar', contact: 'Ibou Diouf', conditions: 'Comptant', delai: 1 },
    { code: 'FRN-007', raisonSociale: 'SENEPNEU', telephone: '+221 33 825 25 25', email: 'info@senepneu.sn', adresse: 'Route de Ouakam, Dakar', contact: 'Pape Momar Faye', conditions: 'Net 30 jours', delai: 2 },
    { code: 'FRN-008', raisonSociale: 'GARAGE MODERNE DAKAR', telephone: '+221 33 821 21 21', email: 'reparations@gmd.sn', adresse: 'Grand Dakar', contact: 'Mamour Cissé', conditions: 'Net 15 jours', delai: 7 },
  ];

  for (const fournisseur of fournisseurs) {
    const existing = await dataSource.query(`SELECT id FROM fournisseurs WHERE code = $1`, [fournisseur.code]);
    if (existing.length === 0) {
      await dataSource.query(
        `INSERT INTO fournisseurs (code, raison_sociale, telephone, email, adresse, contact_nom, conditions_paiement, delai_livraison_jours, actif)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
        [fournisseur.code, fournisseur.raisonSociale, fournisseur.telephone, fournisseur.email, fournisseur.adresse, fournisseur.contact, fournisseur.conditions, fournisseur.delai]
      );
      console.log(`✓ Fournisseur créé: ${fournisseur.raisonSociale}`);
    } else {
      console.log(`  Fournisseur existant: ${fournisseur.raisonSociale}`);
    }
  }

  // ============================================
  // CAMIONS AVEC IMMATRICULATIONS SÉNÉGALAISES
  // ============================================
  console.log('\n=== Création des camions ===');

  const camions = [
    { numeroInterne: 'CAM-001', immatriculation: 'DK-1234-AB', type: 'PORTE_CONTENEUR', marque: 'Mercedes-Benz', modele: 'Actros 2545', annee: 2022, km: 45000, reservoir: 400 },
    { numeroInterne: 'CAM-002', immatriculation: 'DK-2345-BC', type: 'PORTE_CONTENEUR', marque: 'MAN', modele: 'TGX 18.500', annee: 2021, km: 78000, reservoir: 450 },
    { numeroInterne: 'CAM-003', immatriculation: 'DK-3456-CD', type: 'PLATEAU', marque: 'Renault', modele: 'T High 480', annee: 2023, km: 23000, reservoir: 400 },
    { numeroInterne: 'CAM-004', immatriculation: 'DK-4567-DE', type: 'BENNE', marque: 'Volvo', modele: 'FMX 460', annee: 2020, km: 120000, reservoir: 380 },
    { numeroInterne: 'CAM-005', immatriculation: 'DK-5678-EF', type: 'CITERNE', marque: 'Scania', modele: 'R500', annee: 2022, km: 56000, reservoir: 500 },
    { numeroInterne: 'CAM-006', immatriculation: 'TH-1234-AB', type: 'GRUE', marque: 'DAF', modele: 'XF 480', annee: 2021, km: 89000, reservoir: 420 },
    { numeroInterne: 'CAM-007', immatriculation: 'DK-6789-FG', type: 'PORTE_CONTENEUR', marque: 'IVECO', modele: 'S-Way 570', annee: 2023, km: 15000, reservoir: 440 },
    { numeroInterne: 'CAM-008', immatriculation: 'DK-7890-GH', type: 'PLATEAU', marque: 'Mercedes-Benz', modele: 'Arocs 3345', annee: 2019, km: 180000, reservoir: 400 },
    { numeroInterne: 'CAM-009', immatriculation: 'KL-1234-AB', type: 'BENNE', marque: 'MAN', modele: 'TGS 33.440', annee: 2020, km: 145000, reservoir: 350 },
    { numeroInterne: 'CAM-010', immatriculation: 'DK-8901-HI', type: 'FRIGORIFIQUE', marque: 'Volvo', modele: 'FH 500', annee: 2022, km: 67000, reservoir: 480 },
    { numeroInterne: 'CAM-011', immatriculation: 'SL-1234-AB', type: 'PORTE_CONTENEUR', marque: 'Renault', modele: 'T 480', annee: 2021, km: 92000, reservoir: 400 },
    { numeroInterne: 'CAM-012', immatriculation: 'DK-9012-IJ', type: 'PLATEAU', marque: 'Scania', modele: 'R450', annee: 2020, km: 135000, reservoir: 420 },
  ];

  for (const camion of camions) {
    const existing = await dataSource.query(`SELECT id FROM camions WHERE immatriculation = $1`, [camion.immatriculation]);
    if (existing.length === 0) {
      await dataSource.query(
        `INSERT INTO camions (numero_interne, immatriculation, type_camion, marque, modele, annee_mise_circulation, kilometrage_actuel, capacite_reservoir_litres, type_carburant, statut, actif)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DIESEL', 'DISPONIBLE', true)`,
        [camion.numeroInterne, camion.immatriculation, camion.type, camion.marque, camion.modele, camion.annee, camion.km, camion.reservoir]
      );
      console.log(`✓ Camion créé: ${camion.immatriculation} - ${camion.marque} ${camion.modele}`);
    } else {
      console.log(`  Camion existant: ${camion.immatriculation}`);
    }
  }

  // ============================================
  // CHAUFFEURS SÉNÉGALAIS
  // ============================================
  console.log('\n=== Création des chauffeurs ===');

  const chauffeurs = [
    { matricule: 'CHF-001', nom: 'Diallo', prenom: 'Mamadou', dateNaissance: '1985-03-15', telephone: '+221 77 111 22 33', adresse: 'Parcelles Assainies, Dakar', numeroPermis: 'SN-2015-123456', typePermis: 'EC', dateDelivrance: '2015-06-20', dateExpiration: '2025-06-19' },
    { matricule: 'CHF-002', nom: 'Ndiaye', prenom: 'Ibrahima', dateNaissance: '1988-07-22', telephone: '+221 78 222 33 44', adresse: 'Guédiawaye, Dakar', numeroPermis: 'SN-2016-234567', typePermis: 'EC', dateDelivrance: '2016-03-10', dateExpiration: '2026-03-09' },
    { matricule: 'CHF-003', nom: 'Sy', prenom: 'Ousmane', dateNaissance: '1982-11-08', telephone: '+221 76 333 44 55', adresse: 'Pikine, Dakar', numeroPermis: 'SN-2012-345678', typePermis: 'EC', dateDelivrance: '2012-09-15', dateExpiration: '2027-09-14' },
    { matricule: 'CHF-004', nom: 'Fall', prenom: 'Cheikh', dateNaissance: '1990-05-30', telephone: '+221 77 444 55 66', adresse: 'Rufisque, Dakar', numeroPermis: 'SN-2018-456789', typePermis: 'EC', dateDelivrance: '2018-01-25', dateExpiration: '2028-01-24' },
    { matricule: 'CHF-005', nom: 'Gueye', prenom: 'Modou', dateNaissance: '1987-09-12', telephone: '+221 78 555 66 77', adresse: 'Thiaroye, Dakar', numeroPermis: 'SN-2014-567890', typePermis: 'EC', dateDelivrance: '2014-07-08', dateExpiration: '2024-07-07' },
    { matricule: 'CHF-006', nom: 'Sarr', prenom: 'Pape', dateNaissance: '1984-02-18', telephone: '+221 76 666 77 88', adresse: 'Thiès Centre', numeroPermis: 'SN-2013-678901', typePermis: 'EC', dateDelivrance: '2013-04-12', dateExpiration: '2028-04-11' },
    { matricule: 'CHF-007', nom: 'Mbaye', prenom: 'Alioune', dateNaissance: '1991-12-25', telephone: '+221 77 777 88 99', adresse: 'Médina, Dakar', numeroPermis: 'SN-2019-789012', typePermis: 'EC', dateDelivrance: '2019-11-30', dateExpiration: '2029-11-29' },
    { matricule: 'CHF-008', nom: 'Dieng', prenom: 'Serigne', dateNaissance: '1986-06-03', telephone: '+221 78 888 99 00', adresse: 'Grand Yoff, Dakar', numeroPermis: 'SN-2015-890123', typePermis: 'EC', dateDelivrance: '2015-02-14', dateExpiration: '2025-02-13' },
    { matricule: 'CHF-009', nom: 'Cissé', prenom: 'Abdoulaye', dateNaissance: '1983-08-27', telephone: '+221 76 999 00 11', adresse: 'Kaolack Centre', numeroPermis: 'SN-2011-901234', typePermis: 'EC', dateDelivrance: '2011-08-05', dateExpiration: '2026-08-04' },
    { matricule: 'CHF-010', nom: 'Sow', prenom: 'El Hadji', dateNaissance: '1989-04-14', telephone: '+221 77 000 11 22', adresse: 'Saint-Louis Nord', numeroPermis: 'SN-2017-012345', typePermis: 'EC', dateDelivrance: '2017-05-20', dateExpiration: '2027-05-19' },
    { matricule: 'CHF-011', nom: 'Faye', prenom: 'Moussa', dateNaissance: '1985-10-09', telephone: '+221 78 111 22 33', adresse: 'Mbour Centre', numeroPermis: 'SN-2014-112233', typePermis: 'EC', dateDelivrance: '2014-12-01', dateExpiration: '2024-11-30' },
    { matricule: 'CHF-012', nom: 'Kane', prenom: 'Lamine', dateNaissance: '1992-01-20', telephone: '+221 76 222 33 44', adresse: 'Ziguinchor Centre', numeroPermis: 'SN-2020-223344', typePermis: 'EC', dateDelivrance: '2020-03-15', dateExpiration: '2030-03-14' },
  ];

  for (const chauffeur of chauffeurs) {
    const existing = await dataSource.query(`SELECT id FROM chauffeurs WHERE matricule = $1`, [chauffeur.matricule]);
    if (existing.length === 0) {
      await dataSource.query(
        `INSERT INTO chauffeurs (matricule, nom, prenom, date_naissance, telephone, adresse, numero_permis, type_permis, date_delivrance_permis, date_expiration_permis, statut, actif)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'DISPONIBLE', true)`,
        [chauffeur.matricule, chauffeur.nom, chauffeur.prenom, chauffeur.dateNaissance, chauffeur.telephone, chauffeur.adresse, chauffeur.numeroPermis, chauffeur.typePermis, chauffeur.dateDelivrance, chauffeur.dateExpiration]
      );
      console.log(`✓ Chauffeur créé: ${chauffeur.prenom} ${chauffeur.nom}`);
    } else {
      console.log(`  Chauffeur existant: ${chauffeur.prenom} ${chauffeur.nom}`);
    }
  }

  // ============================================
  // CUVES DE CARBURANT
  // ============================================
  console.log('\n=== Création des cuves de carburant ===');

  const cuves = [
    { nom: 'Cuve Principale Dakar', emplacement: 'Dépôt Hann Bel-Air, Dakar', capacite: 50000, niveauActuel: 35000 },
    { nom: 'Cuve Secondaire Dakar', emplacement: 'Dépôt Zone Franche, Dakar', capacite: 30000, niveauActuel: 22000 },
    { nom: 'Cuve Thiès', emplacement: 'Dépôt Thiès, Route de Mbour', capacite: 20000, niveauActuel: 15000 },
  ];

  for (const cuve of cuves) {
    const existing = await dataSource.query(`SELECT id FROM cuves_carburant WHERE nom = $1`, [cuve.nom]);
    if (existing.length === 0) {
      await dataSource.query(
        `INSERT INTO cuves_carburant (nom, emplacement, capacite_litres, niveau_actuel_litres, seuil_alerte_bas, type_carburant, actif)
         VALUES ($1, $2, $3, $4, 5000, 'DIESEL', true)`,
        [cuve.nom, cuve.emplacement, cuve.capacite, cuve.niveauActuel]
      );
      console.log(`✓ Cuve créée: ${cuve.nom}`);
    } else {
      console.log(`  Cuve existante: ${cuve.nom}`);
    }
  }

  // Récupérer les IDs pour les bons de transport
  const clientResult = await dataSource.query(`SELECT id FROM clients ORDER BY id LIMIT 1`);
  const clientId = clientResult[0]?.id;

  const camionResult = await dataSource.query(`SELECT id FROM camions ORDER BY id LIMIT 1`);
  const camionId = camionResult[0]?.id;

  const chauffeurResult = await dataSource.query(`SELECT id FROM chauffeurs WHERE actif = true ORDER BY id LIMIT 1`);
  const chauffeurId = chauffeurResult[0]?.id;

  if (!clientId || !camionId || !chauffeurId) {
    console.log('Données de base manquantes!');
    await dataSource.destroy();
    return;
  }

  // ============================================
  // BONS DE TRANSPORT
  // ============================================
  console.log('\n=== Création des bons de transport ===');

  const bonsTransport = [
    { numero: 'BT-2025-0001', nature: 'CONTENEUR_40', lieuChargement: 'Port Autonome de Dakar', lieuDechargement: 'Bamako, Mali', poids: 25000, montant: 850000, statut: 'LIVRE' },
    { numero: 'BT-2025-0002', nature: 'CONTENEUR_20', lieuChargement: 'Terminal à Conteneurs de Dakar', lieuDechargement: 'Kaolack, Sénégal', poids: 15000, montant: 350000, statut: 'LIVRE' },
    { numero: 'BT-2025-0003', nature: 'VRAC', lieuChargement: 'SOCOCIM Rufisque', lieuDechargement: 'Thiès Centre', poids: 30000, montant: 280000, statut: 'EN_COURS' },
    { numero: 'BT-2025-0004', nature: 'PALETTE', lieuChargement: 'Zone Franche Dakar', lieuDechargement: 'Saint-Louis, Sénégal', poids: 18000, montant: 520000, statut: 'EN_COURS' },
    { numero: 'BT-2025-0005', nature: 'CONTENEUR_40', lieuChargement: 'Port de Dakar', lieuDechargement: 'Ouagadougou, Burkina Faso', poids: 28000, montant: 1200000, statut: 'BROUILLON' },
    { numero: 'BT-2025-0006', nature: 'MATERIEL_BTP', lieuChargement: 'Chantier AIBD Diass', lieuDechargement: 'Saly Portudal', poids: 35000, montant: 450000, statut: 'LIVRE' },
  ];

  for (let i = 0; i < bonsTransport.length; i++) {
    const bon = bonsTransport[i];
    const existing = await dataSource.query(`SELECT id FROM bons_transport WHERE numero = $1`, [bon.numero]);
    if (existing.length === 0) {
      const dateChargement = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const dateLivraison = new Date(dateChargement.getTime() + 2 * 24 * 60 * 60 * 1000);
      await dataSource.query(
        `INSERT INTO bons_transport
         (numero, client_id, camion_id, chauffeur_id, nature_chargement, lieu_chargement, lieu_dechargement,
          date_chargement, date_livraison, poids_kg, montant_ht, statut, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [bon.numero, clientId, camionId, chauffeurId, bon.nature, bon.lieuChargement, bon.lieuDechargement,
         dateChargement, dateLivraison, bon.poids, bon.montant, bon.statut, userId]
      );
      console.log(`✓ Bon transport créé: ${bon.numero}`);
    }
  }

  // ============================================
  // BONS DE LOCATION
  // ============================================
  console.log('\n=== Création des bons de location ===');

  const bonsLocation = [
    { numero: 'BL-2025-0001', tarifJournalier: 150000, nbJours: 15, statut: 'LIVRE' },
    { numero: 'BL-2025-0002', tarifJournalier: 175000, nbJours: 10, statut: 'EN_COURS' },
    { numero: 'BL-2025-0003', tarifJournalier: 125000, nbJours: 7, statut: 'BROUILLON' },
  ];

  for (let i = 0; i < bonsLocation.length; i++) {
    const bon = bonsLocation[i];
    const existing = await dataSource.query(`SELECT id FROM bons_location WHERE numero = $1`, [bon.numero]);
    if (existing.length === 0) {
      const dateDebut = new Date(Date.now() - (i + 1) * 20 * 24 * 60 * 60 * 1000);
      const dateFin = new Date(dateDebut.getTime() + bon.nbJours * 24 * 60 * 60 * 1000);
      await dataSource.query(
        `INSERT INTO bons_location
         (numero, client_id, camion_id, chauffeur_id, date_debut, date_fin_prevue, date_fin_reelle,
          tarif_journalier, km_depart, km_retour, montant_total, statut, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [bon.numero, clientId, camionId, chauffeurId, dateDebut, dateFin,
         bon.statut === 'LIVRE' ? dateFin : null, bon.tarifJournalier, 45000, 45000 + bon.nbJours * 150,
         bon.tarifJournalier * bon.nbJours, bon.statut, userId]
      );
      console.log(`✓ Bon location créé: ${bon.numero}`);
    }
  }

  // ============================================
  // DOTATIONS CARBURANT
  // ============================================
  console.log('\n=== Création des dotations carburant ===');

  // Récupérer l'ID de la cuve principale
  const cuveResult = await dataSource.query(`SELECT id FROM cuves_carburant LIMIT 1`);
  const cuveId = cuveResult[0]?.id;

  for (let i = 1; i <= 8; i++) {
    const numeroBon = `DC-2025-${String(i).padStart(4, '0')}`;
    const existing = await dataSource.query(`SELECT id FROM dotations_carburant WHERE numero_bon = $1`, [numeroBon]);
    if (existing.length === 0) {
      const quantite = 80 + Math.floor(Math.random() * 120);
      const prixUnitaire = 890 + Math.floor(Math.random() * 30);
      const typeSource = i % 3 === 0 ? 'STATION_EXTERNE' : 'CUVE_INTERNE';
      await dataSource.query(
        `INSERT INTO dotations_carburant
         (numero_bon, camion_id, chauffeur_id, date_dotation, type_source, cuve_id, station_nom, quantite_litres, prix_unitaire, cout_total, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [numeroBon, camionId, chauffeurId, new Date(Date.now() - i * 4 * 24 * 60 * 60 * 1000),
         typeSource,
         typeSource === 'CUVE_INTERNE' ? cuveId : null,
         typeSource === 'STATION_EXTERNE' ? 'Total Station Dakar Centre' : null,
         quantite, prixUnitaire, quantite * prixUnitaire, userId]
      );
      console.log(`✓ Dotation créée: ${numeroBon} (${typeSource})`);
    }
  }

  // ============================================
  // PANNES
  // ============================================
  console.log('\n=== Création des pannes ===');

  const pannes = [
    { numero: 'PAN-2025-0001', type: 'PNEUMATIQUE', priorite: 'HAUTE', statut: 'REPAREE', description: 'Crevaison pneu avant droit sur autoroute', localisation: 'Autoroute Dakar-Thiès, km 45', cout: 85000 },
    { numero: 'PAN-2025-0002', type: 'MECANIQUE', priorite: 'URGENTE', statut: 'EN_REPARATION', description: 'Surchauffe moteur - fuite liquide de refroidissement', localisation: 'Route Nationale 1, Mbour', cout: 350000 },
    { numero: 'PAN-2025-0003', type: 'HYDRAULIQUE', priorite: 'HAUTE', statut: 'EN_DIAGNOSTIC', description: 'Usure plaquettes de frein arrière', localisation: 'Dépôt ACL Dakar', cout: 120000 },
  ];

  for (let i = 0; i < pannes.length; i++) {
    const panne = pannes[i];
    const existing = await dataSource.query(`SELECT id FROM pannes WHERE numero_panne = $1`, [panne.numero]);
    if (existing.length === 0) {
      await dataSource.query(
        `INSERT INTO pannes
         (numero_panne, camion_id, chauffeur_id, date_panne, type_panne, priorite, statut,
          description, localisation, kilometrage_panne, cout_estime, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [panne.numero, camionId, chauffeurId, new Date(Date.now() - (i + 1) * 10 * 24 * 60 * 60 * 1000),
         panne.type, panne.priorite, panne.statut, panne.description, panne.localisation,
         45000 + i * 5000, panne.cout, userId]
      );
      console.log(`✓ Panne créée: ${panne.numero}`);
    }
  }

  // ============================================
  // CATALOGUE DE PIÈCES
  // ============================================
  console.log('\n=== Création du catalogue de pièces ===');

  const pieces = [
    { reference: 'FLT-HUI-001', designation: 'Filtre à huile Mercedes Actros', categorie: 'FILTRATION', prixUnitaire: 15000, stockMin: 10 },
    { reference: 'FLT-AIR-001', designation: 'Filtre à air MAN TGX', categorie: 'FILTRATION', prixUnitaire: 25000, stockMin: 8 },
    { reference: 'FLT-GAZ-001', designation: 'Filtre à gasoil universel', categorie: 'FILTRATION', prixUnitaire: 12000, stockMin: 15 },
    { reference: 'PLQ-FRN-001', designation: 'Plaquettes de frein avant poids lourd', categorie: 'FREINAGE', prixUnitaire: 45000, stockMin: 6 },
    { reference: 'DSQ-FRN-001', designation: 'Disque de frein arrière', categorie: 'FREINAGE', prixUnitaire: 85000, stockMin: 4 },
    { reference: 'CRE-EMB-001', designation: 'Kit embrayage complet', categorie: 'TRANSMISSION', prixUnitaire: 350000, stockMin: 2 },
    { reference: 'BAT-001', designation: 'Batterie 24V 180Ah', categorie: 'ELECTRICITE', prixUnitaire: 180000, stockMin: 4 },
    { reference: 'AMP-PHR-001', designation: 'Ampoule phare H7 24V', categorie: 'ELECTRICITE', prixUnitaire: 5000, stockMin: 20 },
    { reference: 'CRT-RAD-001', designation: 'Courroie radiateur', categorie: 'REFROIDISSEMENT', prixUnitaire: 18000, stockMin: 6 },
  ];

  for (const piece of pieces) {
    const existing = await dataSource.query(`SELECT id FROM catalogue_pieces WHERE reference = $1`, [piece.reference]);
    if (existing.length === 0) {
      await dataSource.query(
        `INSERT INTO catalogue_pieces (reference, designation, categorie, prix_unitaire_moyen, stock_minimum, actif)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [piece.reference, piece.designation, piece.categorie, piece.prixUnitaire, piece.stockMin]
      );
      console.log(`✓ Pièce créée: ${piece.designation}`);
    }
  }

  // ============================================
  // CATALOGUE DE PNEUS
  // ============================================
  console.log('\n=== Création du catalogue de pneus ===');

  const pneus = [
    { reference: 'PNU-MCH-001', marque: 'Michelin X Multi D', dimension: '315/80 R22.5', typeUsage: 'AVANT', prixUnitaire: 450000 },
    { reference: 'PNU-MCH-002', marque: 'Michelin X Works Z', dimension: '315/80 R22.5', typeUsage: 'ARRIERE', prixUnitaire: 420000 },
    { reference: 'PNU-BRS-001', marque: 'Bridgestone R249', dimension: '295/80 R22.5', typeUsage: 'AVANT', prixUnitaire: 380000 },
    { reference: 'PNU-GOO-001', marque: 'Goodyear KMAX S', dimension: '315/70 R22.5', typeUsage: 'ARRIERE', prixUnitaire: 350000 },
    { reference: 'PNU-CNT-001', marque: 'Continental HSC', dimension: '315/80 R22.5', typeUsage: 'AVANT', prixUnitaire: 400000 },
  ];

  for (const pneu of pneus) {
    const existing = await dataSource.query(`SELECT id FROM catalogue_pneus WHERE reference = $1`, [pneu.reference]);
    if (existing.length === 0) {
      await dataSource.query(
        `INSERT INTO catalogue_pneus (reference, marque, dimension, type_usage, prix_unitaire, actif)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [pneu.reference, pneu.marque, pneu.dimension, pneu.typeUsage, pneu.prixUnitaire]
      );
      console.log(`✓ Pneu créé: ${pneu.marque}`);
    }
  }

  await dataSource.destroy();
  console.log('\n========================================');
  console.log('✓ Données de test sénégalaises insérées avec succès!');
  console.log('========================================');
  console.log('\nComptes utilisateurs créés (mot de passe: Password123!):');
  console.log('  - amadou.diop@acl-transport.sn (DIRECTION)');
  console.log('  - fatou.ndiaye@acl-transport.sn (COORDINATEUR)');
  console.log('  - moussa.fall@acl-transport.sn (COORDINATEUR)');
  console.log('  - ibrahima.sall@acl-transport.sn (MAGASINIER)');
  console.log('  - mariama.ba@acl-transport.sn (MAGASINIER)');
}

seedTestData().catch(console.error);
