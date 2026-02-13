import { RoleUtilisateur } from '../database/entities/user.entity';

// Modules de l'application
export enum Module {
  // Gestion utilisateurs
  USERS = 'users',

  // Logistique
  CAMIONS = 'camions',
  CHAUFFEURS = 'chauffeurs',
  TRANSPORT = 'transport',
  LOCATION = 'location',
  GPS = 'gps',
  ALERTES = 'alertes',
  PANNES = 'pannes',

  // Maintenance
  ENTRETIEN = 'entretien',

  // Stock & Carburant
  PIECES = 'pieces',
  PNEUMATIQUES = 'pneumatiques',
  CARBURANT = 'carburant',

  // Comptabilité
  CLIENTS = 'clients',
  FOURNISSEURS = 'fournisseurs',
  EXPORT = 'export',
  CAISSES = 'caisses',

  // Configuration
  CONFIG = 'config',
}

// Actions possibles
export enum Action {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW_FINANCIAL = 'view_financial', // Voir les montants
}

// Définition des permissions par rôle
export const ROLE_PERMISSIONS: Record<RoleUtilisateur, Record<Module, Action[]>> = {
  [RoleUtilisateur.ADMIN]: {
    [Module.USERS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE],
    [Module.CAMIONS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.CHAUFFEURS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.TRANSPORT]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.LOCATION]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.GPS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE],
    [Module.ALERTES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE],
    [Module.PANNES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.ENTRETIEN]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.PIECES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.PNEUMATIQUES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.CARBURANT]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.CLIENTS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.FOURNISSEURS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.EXPORT]: [Action.READ, Action.CREATE],
    [Module.CAISSES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.CONFIG]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE],
  },

  [RoleUtilisateur.DIRECTION]: {
    [Module.USERS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE],
    [Module.CAMIONS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.CHAUFFEURS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.TRANSPORT]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.LOCATION]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.GPS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE],
    [Module.ALERTES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE],
    [Module.PANNES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.ENTRETIEN]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.PIECES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.PNEUMATIQUES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.CARBURANT]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.CLIENTS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.FOURNISSEURS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.EXPORT]: [Action.READ, Action.CREATE],
    [Module.CAISSES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.CONFIG]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE],
  },

  [RoleUtilisateur.RESPONSABLE_LOGISTIQUE]: {
    [Module.USERS]: [], // Pas d'accès à la gestion des utilisateurs
    [Module.CAMIONS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.CHAUFFEURS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.TRANSPORT]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.LOCATION]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.GPS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE],
    [Module.ALERTES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE],
    [Module.PANNES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.ENTRETIEN]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.PIECES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.PNEUMATIQUES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.CARBURANT]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.CLIENTS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.FOURNISSEURS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.EXPORT]: [Action.READ, Action.CREATE],
    [Module.CAISSES]: [], // Pas d'accès aux caisses
    [Module.CONFIG]: [Action.READ],
  },

  [RoleUtilisateur.COORDINATEUR]: {
    [Module.USERS]: [],
    [Module.CAMIONS]: [Action.READ, Action.CREATE, Action.UPDATE], // Pas de suppression, pas de montants
    [Module.CHAUFFEURS]: [Action.READ, Action.CREATE, Action.UPDATE],
    [Module.TRANSPORT]: [Action.READ, Action.CREATE, Action.UPDATE], // Sans montants
    [Module.LOCATION]: [Action.READ, Action.CREATE, Action.UPDATE], // Sans montants
    [Module.GPS]: [Action.READ],
    [Module.ALERTES]: [Action.READ, Action.UPDATE],
    [Module.PANNES]: [Action.READ, Action.CREATE, Action.UPDATE], // Sans coûts
    [Module.ENTRETIEN]: [Action.READ, Action.CREATE, Action.UPDATE], // Peut créer et modifier
    [Module.PIECES]: [], // Pas d'accès
    [Module.PNEUMATIQUES]: [], // Pas d'accès
    [Module.CARBURANT]: [], // Pas d'accès direct
    [Module.CLIENTS]: [],
    [Module.FOURNISSEURS]: [],
    [Module.EXPORT]: [],
    [Module.CAISSES]: [], // Pas d'accès aux caisses
    [Module.CONFIG]: [],
  },

  [RoleUtilisateur.MAGASINIER]: {
    [Module.USERS]: [],
    [Module.CAMIONS]: [Action.READ, Action.CREATE, Action.UPDATE], // Aligné avec COORDINATEUR
    [Module.CHAUFFEURS]: [Action.READ, Action.CREATE, Action.UPDATE], // Aligné avec COORDINATEUR
    [Module.TRANSPORT]: [Action.READ, Action.CREATE, Action.UPDATE], // Aligné avec COORDINATEUR
    [Module.LOCATION]: [Action.READ, Action.CREATE, Action.UPDATE], // Aligné avec COORDINATEUR
    [Module.GPS]: [Action.READ],
    [Module.ALERTES]: [Action.READ, Action.UPDATE],
    [Module.PANNES]: [Action.READ, Action.CREATE, Action.UPDATE], // Aligné avec COORDINATEUR
    [Module.ENTRETIEN]: [Action.READ, Action.CREATE, Action.UPDATE], // Aligné avec COORDINATEUR
    [Module.PIECES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE], // Sans VIEW_FINANCIAL
    [Module.PNEUMATIQUES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE], // Sans VIEW_FINANCIAL
    [Module.CARBURANT]: [Action.READ, Action.CREATE, Action.UPDATE], // Sans VIEW_FINANCIAL
    [Module.CLIENTS]: [],
    [Module.FOURNISSEURS]: [Action.READ], // Pour les entrées de stock
    [Module.EXPORT]: [],
    [Module.CAISSES]: [], // Pas d'accès aux caisses
    [Module.CONFIG]: [],
  },

  [RoleUtilisateur.COMPTABLE]: {
    [Module.USERS]: [],
    [Module.CAMIONS]: [Action.READ, Action.VIEW_FINANCIAL],
    [Module.CHAUFFEURS]: [Action.READ],
    [Module.TRANSPORT]: [Action.READ, Action.VIEW_FINANCIAL],
    [Module.LOCATION]: [Action.READ, Action.VIEW_FINANCIAL],
    [Module.GPS]: [],
    [Module.ALERTES]: [Action.READ],
    [Module.PANNES]: [Action.READ, Action.VIEW_FINANCIAL],
    [Module.ENTRETIEN]: [Action.READ, Action.VIEW_FINANCIAL],
    [Module.PIECES]: [Action.READ, Action.VIEW_FINANCIAL],
    [Module.PNEUMATIQUES]: [Action.READ, Action.VIEW_FINANCIAL],
    [Module.CARBURANT]: [Action.READ, Action.VIEW_FINANCIAL],
    [Module.CLIENTS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.FOURNISSEURS]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL],
    [Module.EXPORT]: [Action.READ, Action.CREATE],
    [Module.CAISSES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.VIEW_FINANCIAL],
    [Module.CONFIG]: [],
  },

  [RoleUtilisateur.MAINTENANCIER]: {
    [Module.USERS]: [],
    [Module.CAMIONS]: [Action.READ], // Voir les camions pour les entretiens
    [Module.CHAUFFEURS]: [Action.READ], // Voir les chauffeurs
    [Module.TRANSPORT]: [], // Pas d'accès
    [Module.LOCATION]: [], // Pas d'accès
    [Module.GPS]: [],
    [Module.ALERTES]: [Action.READ, Action.CREATE, Action.UPDATE], // Créer et gérer les alertes maintenance
    [Module.PANNES]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE], // Gestion complète des pannes
    [Module.ENTRETIEN]: [Action.READ, Action.CREATE, Action.UPDATE, Action.DELETE, Action.VIEW_FINANCIAL], // Gestion complète
    [Module.PIECES]: [Action.READ, Action.CREATE, Action.UPDATE], // Gestion des pièces pour maintenance
    [Module.PNEUMATIQUES]: [Action.READ, Action.CREATE, Action.UPDATE], // Gestion des pneus
    [Module.CARBURANT]: [], // Pas d'accès
    [Module.CLIENTS]: [],
    [Module.FOURNISSEURS]: [Action.READ], // Voir les fournisseurs pour les pièces
    [Module.EXPORT]: [],
    [Module.CAISSES]: [], // Pas d'accès aux caisses
    [Module.CONFIG]: [],
  },
};

// Helper functions
export function hasPermission(role: RoleUtilisateur, module: Module, action: Action): boolean {
  const permissions = ROLE_PERMISSIONS[role]?.[module] || [];
  return permissions.includes(action);
}

export function canViewFinancial(role: RoleUtilisateur, module: Module): boolean {
  return hasPermission(role, module, Action.VIEW_FINANCIAL);
}

export function getAccessibleModules(role: RoleUtilisateur): Module[] {
  const modules: Module[] = [];
  for (const [module, actions] of Object.entries(ROLE_PERMISSIONS[role] || {})) {
    if (actions.length > 0) {
      modules.push(module as Module);
    }
  }
  return modules;
}

// Labels pour l'affichage
export const ROLE_LABELS: Record<RoleUtilisateur, string> = {
  [RoleUtilisateur.ADMIN]: 'Administrateur',
  [RoleUtilisateur.DIRECTION]: 'Direction',
  [RoleUtilisateur.RESPONSABLE_LOGISTIQUE]: 'Responsable Logistique',
  [RoleUtilisateur.COORDINATEUR]: 'Coordinateur',
  [RoleUtilisateur.MAGASINIER]: 'Magasinier',
  [RoleUtilisateur.COMPTABLE]: 'Comptable',
  [RoleUtilisateur.MAINTENANCIER]: 'Maintenancier',
};

export const MODULE_LABELS: Record<Module, string> = {
  [Module.USERS]: 'Utilisateurs',
  [Module.CAMIONS]: 'Camions',
  [Module.CHAUFFEURS]: 'Chauffeurs',
  [Module.TRANSPORT]: 'Transport',
  [Module.LOCATION]: 'Location',
  [Module.GPS]: 'GPS',
  [Module.ALERTES]: 'Alertes',
  [Module.PANNES]: 'Pannes',
  [Module.ENTRETIEN]: 'Entretien',
  [Module.PIECES]: 'Pièces',
  [Module.PNEUMATIQUES]: 'Pneumatiques',
  [Module.CARBURANT]: 'Carburant',
  [Module.CLIENTS]: 'Clients',
  [Module.FOURNISSEURS]: 'Fournisseurs',
  [Module.EXPORT]: 'Export',
  [Module.CAISSES]: 'Caisses',
  [Module.CONFIG]: 'Configuration',
};
