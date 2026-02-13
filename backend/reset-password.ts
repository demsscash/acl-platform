import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

const ds = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'acl_db',
});

async function main() {
  await ds.initialize();
  console.log('Connected to database');

  const hashedPassword = await bcrypt.hash('admin123', 10);
  await ds.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, 'admin@acl.sn']);

  // Also reset the test users
  await ds.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, 'responsable@acl.sn']);
  await ds.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, 'coordinateur@acl.sn']);
  await ds.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, 'magasinier@acl.sn']);
  await ds.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, 'comptable@acl.sn']);

  console.log('\n=== Mots de passe reinitialises ===');
  console.log('Mot de passe pour tous: admin123\n');
  console.log('admin@acl.sn (ADMIN)');
  console.log('responsable@acl.sn (RESPONSABLE_LOGISTIQUE)');
  console.log('coordinateur@acl.sn (COORDINATEUR)');
  console.log('magasinier@acl.sn (MAGASINIER)');
  console.log('comptable@acl.sn (COMPTABLE)');

  await ds.destroy();
}

main().catch(console.error);
