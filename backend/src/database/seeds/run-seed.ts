import dataSource from '../data-source';
import { seedData } from './seed-data';

async function runSeed() {
  console.log('🌱 Démarrage du seed de la base de données...');

  try {
    await dataSource.initialize();
    console.log('✅ Connexion à la base de données établie');

    await seedData(dataSource);

    console.log('✅ Seed terminé avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  }
}

runSeed();
