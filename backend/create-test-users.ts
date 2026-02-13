import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

async function createTestUsers() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'acl_user',
    password: 'acl_password',
    database: 'acl_db',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Connecté à la base de données');

    const passwordHash = await bcrypt.hash('Test123!', 10);

    const testUsers = [
      { email: 'admin@acl.sn', nom: 'Admin', prenom: 'Super', telephone: '+221 77 000 00 01', role: 'ADMIN' },
      { email: 'responsable@acl.sn', nom: 'Diallo', prenom: 'Mamadou', telephone: '+221 77 000 00 02', role: 'RESPONSABLE_LOGISTIQUE' },
      { email: 'coordinateur@acl.sn', nom: 'Ndiaye', prenom: 'Fatou', telephone: '+221 77 000 00 03', role: 'COORDINATEUR' },
      { email: 'magasinier@acl.sn', nom: 'Fall', prenom: 'Ibrahima', telephone: '+221 77 000 00 04', role: 'MAGASINIER' },
      { email: 'comptable@acl.sn', nom: 'Sow', prenom: 'Aissatou', telephone: '+221 77 000 00 05', role: 'COMPTABLE' },
    ];

    for (const user of testUsers) {
      const existing = await dataSource.query(`SELECT id FROM users WHERE email = $1`, [user.email]);
      if (existing.length === 0) {
        await dataSource.query(
          `INSERT INTO users (email, password_hash, nom, prenom, telephone, role, actif)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [user.email, passwordHash, user.nom, user.prenom, user.telephone, user.role]
        );
        console.log(`✓ Créé: ${user.prenom} ${user.nom} (${user.role}) - ${user.email}`);
      } else {
        // Update role if user exists
        await dataSource.query(`UPDATE users SET role = $1 WHERE email = $2`, [user.role, user.email]);
        console.log(`✓ Mis à jour: ${user.email} -> ${user.role}`);
      }
    }

    console.log('\n=== Utilisateurs de test ===');
    console.log('Mot de passe pour tous: Test123!');
    console.log('');
    console.log('admin@acl.sn         -> ADMIN');
    console.log('responsable@acl.sn   -> RESPONSABLE_LOGISTIQUE');
    console.log('coordinateur@acl.sn  -> COORDINATEUR');
    console.log('magasinier@acl.sn    -> MAGASINIER');
    console.log('comptable@acl.sn     -> COMPTABLE');

    await dataSource.destroy();
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

createTestUsers();
