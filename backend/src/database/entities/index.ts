// Entités de base
export * from './user.entity';
export * from './camion.entity';
export * from './chauffeur.entity';
export * from './client.entity';
export * from './contact-client.entity';
export * from './fournisseur.entity';

// Gestion des stocks
export * from './catalogue-piece.entity';
export * from './stock-piece.entity';
export * from './sortie-stock.entity';
export * from './ligne-sortie-stock.entity';
export * from './entree-stock.entity';
export * from './ligne-entree-stock.entity';
export * from './mouvement-piece.entity';

// Carburant
export * from './cuve-carburant.entity';
export * from './approvisionnement-cuve.entity';
export * from './dotation-carburant.entity';
export * from './station-partenaire.entity';

// Transport et Location
export * from './bon-transport.entity';
export * from './bon-location.entity';
export * from './mission.entity';
export * from './cout-mission.entity';
export * from './bilan-financier-mission.entity';

// Maintenance et Pannes
export * from './panne.entity';
export * from './maintenance.entity';
export * from './planification-maintenance.entity';
export * from './historique-maintenance.entity';

// Pneumatiques
export * from './catalogue-pneu.entity';
export * from './stock-pneumatique.entity';
export * from './controle-pneumatique.entity';

// GPS
export * from './tracker-gps.entity';
export * from './gps-geofence.entity';
export * from './gps-position-history.entity';
export * from './gps-alert.entity';

// Historiques et Suivi
export * from './historique-affectation.entity';
export * from './journal-evenement-camion.entity';
export * from './incident.entity';
export * from './statistique-chauffeur-mensuel.entity';
export * from './evaluation-chauffeur.entity';
export * from './statistique-camion-mensuel.entity';

// Clients
export * from './evaluation-client.entity';
export * from './reclamation-client.entity';
export * from './route-frequente.entity';

// Système
export * from './alerte.entity';
export * from './notification.entity';
export * from './preferences-notification.entity';
export * from './config-systeme.entity';
export * from './audit-log.entity';
export * from './kpi-quotidien.entity';

// Fichiers
export * from './fichier.entity';

// Finances
export * from './caisse.entity';
export * from './mouvement-caisse.entity';
