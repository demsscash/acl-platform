// User types
export type RoleUtilisateur = 'ADMIN' | 'DIRECTION' | 'RESPONSABLE_LOGISTIQUE' | 'COORDINATEUR' | 'MAGASINIER' | 'COMPTABLE' | 'MAINTENANCIER';

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: RoleUtilisateur;
  telephone?: string;
}

// Modules de l'application
export type Module =
  | 'users'
  | 'camions'
  | 'chauffeurs'
  | 'transport'
  | 'location'
  | 'gps'
  | 'alertes'
  | 'pannes'
  | 'entretien'
  | 'pieces'
  | 'pneumatiques'
  | 'carburant'
  | 'clients'
  | 'fournisseurs'
  | 'export'
  | 'caisses'
  | 'config';

// Actions possibles
export type Action = 'read' | 'create' | 'update' | 'delete' | 'view_financial';

// Labels des rôles
export const ROLE_LABELS: Record<RoleUtilisateur, string> = {
  ADMIN: 'Administrateur',
  DIRECTION: 'Direction',
  RESPONSABLE_LOGISTIQUE: 'Responsable Logistique',
  COORDINATEUR: 'Coordinateur',
  MAGASINIER: 'Magasinier',
  COMPTABLE: 'Comptable',
  MAINTENANCIER: 'Maintenancier',
};

// Permissions par rôle
export const ROLE_PERMISSIONS: Record<RoleUtilisateur, Record<Module, Action[]>> = {
  ADMIN: {
    users: ['read', 'create', 'update', 'delete'],
    camions: ['read', 'create', 'update', 'delete', 'view_financial'],
    chauffeurs: ['read', 'create', 'update', 'delete', 'view_financial'],
    transport: ['read', 'create', 'update', 'delete', 'view_financial'],
    location: ['read', 'create', 'update', 'delete', 'view_financial'],
    gps: ['read', 'create', 'update', 'delete'],
    alertes: ['read', 'create', 'update', 'delete'],
    pannes: ['read', 'create', 'update', 'delete', 'view_financial'],
    entretien: ['read', 'create', 'update', 'delete', 'view_financial'],
    pieces: ['read', 'create', 'update', 'delete', 'view_financial'],
    pneumatiques: ['read', 'create', 'update', 'delete', 'view_financial'],
    carburant: ['read', 'create', 'update', 'delete', 'view_financial'],
    clients: ['read', 'create', 'update', 'delete', 'view_financial'],
    fournisseurs: ['read', 'create', 'update', 'delete', 'view_financial'],
    export: ['read', 'create'],
    caisses: ['read', 'create', 'update', 'delete', 'view_financial'],
    config: ['read', 'create', 'update', 'delete'],
  },
  DIRECTION: {
    users: ['read', 'create', 'update', 'delete'],
    camions: ['read', 'create', 'update', 'delete', 'view_financial'],
    chauffeurs: ['read', 'create', 'update', 'delete', 'view_financial'],
    transport: ['read', 'create', 'update', 'delete', 'view_financial'],
    location: ['read', 'create', 'update', 'delete', 'view_financial'],
    gps: ['read', 'create', 'update', 'delete'],
    alertes: ['read', 'create', 'update', 'delete'],
    pannes: ['read', 'create', 'update', 'delete', 'view_financial'],
    entretien: ['read', 'create', 'update', 'delete', 'view_financial'],
    pieces: ['read', 'create', 'update', 'delete', 'view_financial'],
    pneumatiques: ['read', 'create', 'update', 'delete', 'view_financial'],
    carburant: ['read', 'create', 'update', 'delete', 'view_financial'],
    clients: ['read', 'create', 'update', 'delete', 'view_financial'],
    fournisseurs: ['read', 'create', 'update', 'delete', 'view_financial'],
    export: ['read', 'create'],
    caisses: ['read', 'create', 'update', 'delete', 'view_financial'],
    config: ['read', 'create', 'update', 'delete'],
  },
  RESPONSABLE_LOGISTIQUE: {
    users: [],
    camions: ['read', 'create', 'update', 'delete', 'view_financial'],
    chauffeurs: ['read', 'create', 'update', 'delete', 'view_financial'],
    transport: ['read', 'create', 'update', 'delete', 'view_financial'],
    location: ['read', 'create', 'update', 'delete', 'view_financial'],
    gps: ['read', 'create', 'update', 'delete'],
    alertes: ['read', 'create', 'update', 'delete'],
    pannes: ['read', 'create', 'update', 'delete', 'view_financial'],
    entretien: ['read', 'create', 'update', 'delete', 'view_financial'],
    pieces: ['read', 'create', 'update', 'delete', 'view_financial'],
    pneumatiques: ['read', 'create', 'update', 'delete', 'view_financial'],
    carburant: ['read', 'create', 'update', 'delete', 'view_financial'],
    clients: ['read', 'create', 'update', 'delete', 'view_financial'],
    fournisseurs: ['read', 'create', 'update', 'delete', 'view_financial'],
    export: ['read', 'create'],
    caisses: [],
    config: ['read'],
  },
  COORDINATEUR: {
    users: [],
    camions: ['read', 'create', 'update'],
    chauffeurs: ['read', 'create', 'update'],
    transport: ['read', 'create', 'update'],
    location: ['read', 'create', 'update'],
    gps: ['read'],
    alertes: ['read', 'update'],
    pannes: ['read', 'create', 'update'],
    entretien: ['read', 'create', 'update'],
    pieces: [],
    pneumatiques: [],
    carburant: [],
    clients: [],
    fournisseurs: [],
    export: [],
    caisses: [],
    config: [],
  },
  MAGASINIER: {
    users: [],
    camions: ['read', 'create', 'update'],
    chauffeurs: ['read', 'create', 'update'],
    transport: ['read', 'create', 'update'],
    location: ['read', 'create', 'update'],
    gps: ['read'],
    alertes: ['read', 'update'],
    pannes: ['read', 'create', 'update'],
    entretien: ['read', 'create', 'update'],
    pieces: ['read', 'create', 'update', 'delete'],
    pneumatiques: ['read', 'create', 'update', 'delete'],
    carburant: ['read', 'create', 'update'],
    clients: [],
    fournisseurs: ['read'],
    export: [],
    caisses: [],
    config: [],
  },
  COMPTABLE: {
    users: [],
    camions: ['read', 'view_financial'],
    chauffeurs: ['read'],
    transport: ['read', 'view_financial'],
    location: ['read', 'view_financial'],
    gps: [],
    alertes: ['read'],
    pannes: ['read', 'view_financial'],
    entretien: ['read', 'view_financial'],
    pieces: ['read', 'view_financial'],
    pneumatiques: ['read', 'view_financial'],
    carburant: ['read', 'view_financial'],
    clients: ['read', 'create', 'update', 'delete', 'view_financial'],
    fournisseurs: ['read', 'create', 'update', 'delete', 'view_financial'],
    export: ['read', 'create'],
    caisses: ['read', 'create', 'update', 'view_financial'],
    config: [],
  },
  MAINTENANCIER: {
    users: [],
    camions: ['read'],
    chauffeurs: ['read'],
    transport: [],
    location: [],
    gps: [],
    alertes: ['read', 'create', 'update'],
    pannes: ['read', 'create', 'update', 'delete'],
    entretien: ['read', 'create', 'update', 'delete', 'view_financial'],
    pieces: ['read', 'create', 'update'],
    pneumatiques: ['read', 'create', 'update'],
    carburant: [],
    clients: [],
    fournisseurs: ['read'],
    export: [],
    caisses: [],
    config: [],
  },
};

// Helper functions
export function hasPermission(role: RoleUtilisateur, module: Module, action: Action): boolean {
  const permissions = ROLE_PERMISSIONS[role]?.[module] || [];
  return permissions.includes(action);
}

export function canAccess(role: RoleUtilisateur, module: Module): boolean {
  const permissions = ROLE_PERMISSIONS[role]?.[module] || [];
  return permissions.length > 0;
}

export function canViewFinancial(role: RoleUtilisateur, module: Module): boolean {
  return hasPermission(role, module, 'view_financial');
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

// Camion types
export type StatutCamion = 'DISPONIBLE' | 'EN_MISSION' | 'EN_MAINTENANCE' | 'HORS_SERVICE';
export type TypeCamion = 'PLATEAU' | 'GRUE' | 'BENNE' | 'PORTE_CONTENEUR' | 'CITERNE' | 'FRIGORIFIQUE' | 'TRACTEUR' | 'PORTE_CHAR' | 'VRAC' | 'AUTRE';
export type TypeCarburant = 'DIESEL' | 'ESSENCE';

export interface Camion {
  id: number;
  numeroInterne?: string;
  immatriculation: string;
  typeCamion: TypeCamion;
  marque: string;
  modele?: string;
  anneeMiseCirculation?: number;
  dateMiseEnCirculation?: string;
  typeCarburant: TypeCarburant;
  capaciteReservoirLitres?: number;
  kilometrageActuel: number;
  kilometrage?: number; // alias for kilometrageActuel
  statut: StatutCamion;
  actif: boolean;
  numeroCarteGrise?: string;
  dateExpirationAssurance?: string;
  dateExpirationVisiteTechnique?: string;
  dateExpirationLicence?: string;
  notes?: string;
  nombreVoyages?: number;
  createdBy?: number;
  updatedBy?: number;
}

// Chauffeur types
export interface Chauffeur {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  numeroPermis?: string;
  categoriePermis?: string;
  dateExpirationPermis?: string;
  dateEmbauche?: string;
  actif: boolean;
}

// API Error
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Caisse types
export type TypeCaisse = 'CENTRALE' | 'LOGISTIQUE';
export type TypeMouvement = 'ENTREE' | 'SORTIE' | 'VIREMENT_INTERNE';
export type ModeEntree = 'VIREMENT' | 'CHEQUE' | 'ESPECE' | 'AUTRE';
export type ModeSortie = 'ORANGE_MONEY' | 'WAVE' | 'FREE_MONEY' | 'MOBILE_MONEY_AUTRE' | 'ESPECE' | 'VIREMENT' | 'CHEQUE' | 'AUTRE';

export interface Caisse {
  id: number;
  nom: string;
  type: TypeCaisse;
  soldeInitial: number;
  soldeActuel: number;
  actif: boolean;
  createdBy?: number;
  updatedBy?: number;
  createur?: User;
  modificateur?: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface MouvementCaisse {
  id: number;
  caisseId: number;
  caisse?: Caisse;
  type: TypeMouvement;
  nature: string;
  montant: number;
  beneficiaire?: string;
  modePaiement?: string;
  numeroReference?: string;
  caisseDestinationId?: number;
  caisseDestination?: Caisse;
  date: string;
  notes?: string;
  referenceExterne?: string;
  preuveUrl?: string; // URL vers justificatif (capture, reçu, photo)
  createdBy: number;
  updatedBy?: number;
  createur?: User;
  modificateur?: User;
  createdAt?: string;
  updatedAt?: string;
}

// Transport types
export type NatureChargement = 'CONTENEUR_20' | 'CONTENEUR_40' | 'CONTENEUR_40_HC' | 'CONTENEUR_2X20' | 'VRAC' | 'PALETTE' | 'COLIS' | 'VEHICULE' | 'MATERIEL_BTP' | 'ENGIN' | 'PORTE_ENGIN' | 'AUTRE';

// Location types
export type TypeTarif = 'JOURNALIER' | 'MENSUEL';
