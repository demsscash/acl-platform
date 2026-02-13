import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

async function testHistorique() {
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
  console.log('Connected to database');

  // Check if test user exists
  const existingUser = await dataSource.query(
    `SELECT id, email FROM users WHERE email = 'test@acl.com' LIMIT 1`
  );

  let userId: number;
  if (existingUser.length === 0) {
    // Create test user
    const passwordHash = await bcrypt.hash('test123', 10);
    const result = await dataSource.query(
      `INSERT INTO users (email, password_hash, nom, prenom, role, actif)
       VALUES ('test@acl.com', $1, 'Test', 'User', 'DIRECTION', true) RETURNING id`,
      [passwordHash]
    );
    userId = result[0].id;
    console.log('Created test user with id:', userId);
  } else {
    userId = existingUser[0].id;
    console.log('Test user already exists with id:', userId);
  }

  // Check chauffeurs
  const chauffeurs = await dataSource.query(`SELECT id, matricule, nom, prenom FROM chauffeurs WHERE actif = true LIMIT 5`);
  console.log('\nChauffeurs:', chauffeurs);

  if (chauffeurs.length === 0) {
    // Create a test chauffeur
    const result = await dataSource.query(
      `INSERT INTO chauffeurs (matricule, nom, prenom, numero_permis, type_permis, statut, actif)
       VALUES ('CHF-001', 'Diallo', 'Mamadou', 'SN-123456', 'EC', 'DISPONIBLE', true) RETURNING id`
    );
    console.log('Created test chauffeur with id:', result[0].id);
  }

  // Get historique for first chauffeur
  if (chauffeurs.length > 0) {
    const chauffeurId = chauffeurs[0].id;

    const transports = await dataSource.query(
      `SELECT bt.*, c.raison_sociale as client_name, cam.immatriculation
       FROM bons_transport bt
       LEFT JOIN clients c ON bt.client_id = c.id
       LEFT JOIN camions cam ON bt.camion_id = cam.id
       WHERE bt.chauffeur_id = $1
       ORDER BY bt.created_at DESC LIMIT 5`,
      [chauffeurId]
    );
    console.log('\nTransports for chauffeur', chauffeurId, ':', transports.length);

    const locations = await dataSource.query(
      `SELECT bl.*, c.raison_sociale as client_name, cam.immatriculation
       FROM bons_location bl
       LEFT JOIN clients c ON bl.client_id = c.id
       LEFT JOIN camions cam ON bl.camion_id = cam.id
       WHERE bl.chauffeur_id = $1
       ORDER BY bl.created_at DESC LIMIT 5`,
      [chauffeurId]
    );
    console.log('Locations for chauffeur', chauffeurId, ':', locations.length);

    const dotations = await dataSource.query(
      `SELECT dc.*, cam.immatriculation
       FROM dotations_carburant dc
       LEFT JOIN camions cam ON dc.camion_id = cam.id
       WHERE dc.chauffeur_id = $1
       ORDER BY dc.date_dotation DESC LIMIT 5`,
      [chauffeurId]
    );
    console.log('Dotations for chauffeur', chauffeurId, ':', dotations.length);

    const pannes = await dataSource.query(
      `SELECT p.*, cam.immatriculation
       FROM pannes p
       LEFT JOIN camions cam ON p.camion_id = cam.id
       WHERE p.chauffeur_id = $1
       ORDER BY p.date_panne DESC LIMIT 5`,
      [chauffeurId]
    );
    console.log('Pannes for chauffeur', chauffeurId, ':', pannes.length);
  }

  await dataSource.destroy();
  console.log('\nTest completed!');
  console.log('\nYou can login with: test@acl.com / test123');
}

testHistorique().catch(console.error);
