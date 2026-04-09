# ACL Platform - Documentation Technique Complète

## Africa Construction Logistics - Plateforme de Gestion Logistique

---

## 1. Présentation Générale

ACL Platform est une plateforme web complète de gestion logistique pour Africa Construction Logistics. Elle couvre l'ensemble des opérations d'une flotte de camions : gestion des véhicules, chauffeurs, carburant, pièces de rechange, pneumatiques, transport, location, maintenance, pannes, GPS, comptabilité et plus encore.

### Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Frontend** | React 19 + Vite + TypeScript + Tailwind CSS |
| **Backend** | NestJS 11 + TypeORM + PostgreSQL |
| **State Management** | Zustand (persisté) |
| **Data Fetching** | TanStack React Query |
| **Offline** | Dexie (IndexedDB) + Service Worker (Workbox) |
| **Temps réel** | Socket.IO (WebSocket) |
| **Files** | Multer + Upload service |
| **Queue/Jobs** | BullMQ + Redis |
| **Auth** | JWT + Passport |
| **Charts** | Recharts |
| **Maps** | Leaflet + React-Leaflet |
| **Export** | ExcelJS |
| **Validation** | class-validator (backend) + Zod (frontend) |
| **API Docs** | Swagger/OpenAPI |

### Architecture de Déploiement

```
┌─────────────────────┐       ┌──────────────────────────┐
│   Vercel (Frontend)  │──────▶│   Railway (Backend API)   │
│  acl-platform.vercel │       │  NestJS + PostgreSQL      │
│       .app           │       │  + Redis + BullMQ         │
└─────────────────────┘       └──────────────────────────┘
```

**Coût total : 0 FCFA/mois** (plans gratuits Vercel + Railway)

---

## 2. Structure du Projet

```
acl-platform/
├── backend/                    # API NestJS
│   ├── src/
│   │   ├── alertes/            # Module alertes système
│   │   ├── audit/              # Journalisation et audit
│   │   ├── auth/               # Authentification JWT + permissions
│   │   ├── caisses/            # Gestion des caisses
│   │   ├── camions/            # Gestion des camions
│   │   ├── carburant/          # Gestion du carburant et cuves
│   │   ├── chauffeurs/         # Gestion des chauffeurs
│   │   ├── clients/            # Gestion des clients
│   │   ├── config-systeme/     # Configuration système
│   │   ├── database/           # Entités, migrations, seeds
│   │   ├── email/              # Service email (Nodemailer)
│   │   ├── entretien/          # Maintenance et entretien
│   │   ├── export/             # Export Excel
│   │   ├── gps/                # Tracking GPS + géofencing
│   │   ├── location/           # Bons de location
│   │   ├── notifications/      # Notifications utilisateur
│   │   ├── pannes/             # Gestion des pannes
│   │   ├── pieces/             # Pièces et stock
│   │   ├── pneumatiques/       # Gestion des pneumatiques
│   │   ├── sync/               # Synchronisation offline
│   │   ├── transport/          # Bons de transport
│   │   ├── uploads/            # Gestion fichiers
│   │   ├── users/              # Gestion utilisateurs
│   │   ├── app.module.ts       # Module racine
│   │   └── main.ts             # Point d'entrée
│   └── package.json
│
├── frontend/                   # Application React
│   ├── src/
│   │   ├── components/         # Composants réutilisables
│   │   │   ├── layout/         # MainLayout (sidebar + header)
│   │   │   ├── ui/             # Toast, Skeleton, Breadcrumb, etc.
│   │   │   ├── GpsMap.tsx      # Carte Leaflet
│   │   │   ├── OfflineIndicator.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── FileUpload.tsx
│   │   ├── contexts/           # ThemeContext (dark/light mode)
│   │   ├── db/                 # Dexie IndexedDB (offline)
│   │   ├── hooks/              # Custom hooks
│   │   ├── layouts/            # MainLayout.tsx
│   │   ├── pages/              # 19 pages (voir section 5)
│   │   ├── services/           # 25 services API + 4 offline
│   │   ├── stores/             # Zustand (auth + sync)
│   │   ├── types/              # Types TypeScript partagés
│   │   ├── utils/              # Utilitaires (export CSV, etc.)
│   │   ├── validation/         # Schémas Zod
│   │   ├── sw.ts               # Service Worker (PWA)
│   │   └── App.tsx             # Routes principales
│   ├── vercel.json             # Config Vercel
│   └── package.json
│
├── deploy/                     # Scripts de déploiement
└── README.md
```

---

## 3. Base de Données (51 Entités)

### 3.1 Données Maîtres

| Entité | Description | Champs clés |
|--------|-------------|-------------|
| **User** | Utilisateurs de la plateforme | nom, prenom, email, role, actif |
| **Camion** | Véhicules de la flotte | immatriculation, marque, modele, type, statut, capaciteReservoir |
| **Chauffeur** | Conducteurs | nom, prenom, telephone, typePermis, camionActuelId |
| **Client** | Clients de l'entreprise | raisonSociale, secteur, adresse, telephone |
| **ContactClient** | Contacts des clients | nom, fonction, telephone, email |
| **Fournisseur** | Fournisseurs | raisonSociale, typeFournisseur (PIECES/PNEUMATIQUES/CARBURANT/GENERAL) |

### 3.2 Gestion du Stock

| Entité | Description |
|--------|-------------|
| **CataloguePiece** | Catalogue des pièces de rechange (référence, désignation, prix, seuil alerte) |
| **StockPiece** | Niveaux de stock par pièce |
| **EntreeStock** | Entrées de stock (achat, retour, transfert, inventaire) |
| **LigneEntreeStock** | Lignes détaillées d'une entrée |
| **SortieStock** | Sorties de stock (maintenance, transfert, perte) |
| **LigneSortieStock** | Lignes détaillées d'une sortie |
| **MouvementPiece** | Historique complet des mouvements |

### 3.3 Carburant

| Entité | Description |
|--------|-------------|
| **CuveCarburant** | Cuves de stockage (capacité, niveau actuel, seuil alerte, actif) |
| **ApprovisionnementCuve** | Approvisionnements des cuves |
| **DotationCarburant** | Dotations de carburant aux camions |
| **StationPartenaire** | Stations-service partenaires |

### 3.4 Transport & Location

| Entité | Description |
|--------|-------------|
| **BonTransport** | Bons de transport (client, chargement, itinéraire, coûts) |
| **BonLocation** | Bons de location de véhicules |
| **Mission** | Missions de transport |
| **CoutMission** | Détail des coûts par mission |
| **BilanFinancierMission** | Bilan financier consolidé |

### 3.5 Maintenance & Pannes

| Entité | Description |
|--------|-------------|
| **Maintenance** | Ordres de maintenance (préventive/corrective, coûts, pièces utilisées) |
| **PlanificationMaintenance** | Planification des maintenances futures |
| **HistoriqueMaintenance** | Historique des interventions |
| **Panne** | Déclarations de pannes (type, priorité, statut, réparation) |

### 3.6 Pneumatiques

| Entité | Description |
|--------|-------------|
| **CataloguePneu** | Catalogue des modèles de pneus |
| **StockPneumatique** | Stock de pneus |
| **ControlePneumatique** | Contrôles et inspections des pneus |

### 3.7 GPS & Tracking

| Entité | Description |
|--------|-------------|
| **TrackerGps** | Trackers GPS associés aux camions (IMEI, nom, plateforme WhatsGPS) |
| **GpsGeofence** | Zones géographiques de contrôle (cercle/polygone) |
| **GpsPositionHistory** | Historique des positions GPS |
| **GpsAlert** | Alertes GPS (survitesse, géofence, hors-ligne, SOS, batterie) |

### 3.8 Comptabilité & Caisses

| Entité | Description |
|--------|-------------|
| **Caisse** | Caisses (CENTRALE, LOGISTIQUE) avec solde |
| **MouvementCaisse** | Mouvements de caisse (entrée/sortie, virement, mode paiement) |

### 3.9 Système & Administration

| Entité | Description |
|--------|-------------|
| **Alerte** | Alertes système (INFO/WARNING/CRITICAL) |
| **Notification** | Notifications utilisateur |
| **PreferenceNotification** | Préférences de notification par utilisateur |
| **ConfigSysteme** | Configuration système (prix carburant, devise, seuils) |
| **AuditLog** | Journal d'audit (qui a fait quoi, quand) |
| **KpiQuotidien** | KPIs calculés quotidiennement |
| **Fichier** | Métadonnées des fichiers uploadés |

### 3.10 Statistiques & Évaluations

| Entité | Description |
|--------|-------------|
| **StatistiqueCamionMensuel** | Stats mensuelles par camion |
| **StatistiqueChauffeurMensuel** | Stats mensuelles par chauffeur |
| **EvaluationChauffeur** | Évaluations de performance des chauffeurs |
| **EvaluationClient** | Évaluations des clients |
| **ReclamationClient** | Réclamations clients |
| **RouteFrequente** | Routes les plus utilisées |
| **HistoriqueAffectation** | Historique d'affectation camion-chauffeur |
| **JournalEvenementCamion** | Journal d'événements par camion |
| **Incident** | Déclarations d'incidents |

---

## 4. Migrations

| Fichier | Description |
|---------|-------------|
| **000001-initial-schema.ts** | Schéma initial complet (toutes les tables, enums, relations) |
| **000002-align-schema-with-entities.ts** | Alignement schéma/entités (recréation tables, ajout colonnes) |
| **000003-add-missing-columns.ts** | Ajout `montant_carburant` (bons_transport) et `type_fournisseur` (fournisseurs) |
| **000004-add-nom-to-trackers-gps.ts** | Ajout colonne `nom` aux trackers GPS |
| **000005-fix-enum-values.ts** | Correction enum MAINTENANCIEN→MAINTENANCIER, ajout permis CE |

---

## 5. Pages Frontend (19 pages)

### 5.1 Dashboard & Navigation

| Page | Route | Description |
|------|-------|-------------|
| **DashboardPage** | `/dashboard` | Tableau de bord principal avec KPIs et résumés |
| **LoginPage** | `/login` | Connexion utilisateur |

### 5.2 Gestion de la Flotte

| Page | Route | Permission | Description |
|------|-------|------------|-------------|
| **CamionsPage** | `/camions` | camions | CRUD des camions, détails techniques, historique |
| **ChauffeursPage** | `/chauffeurs` | chauffeurs | CRUD des chauffeurs, permis, affectations |
| **GpsPage** | `/gps` | gps | Tracking temps réel sur carte, géofencing, alertes |

### 5.3 Opérations

| Page | Route | Permission | Description |
|------|-------|------------|-------------|
| **TransportPage** | `/transport` | transport | Bons de transport, suivi des missions |
| **LocationPage** | `/location` | location | Bons de location de véhicules |
| **CarburantPage** | `/carburant` | carburant | Cuves, dotations, approvisionnements, stations |

### 5.4 Stock & Pièces

| Page | Route | Permission | Description |
|------|-------|------------|-------------|
| **PiecesPage** | `/pieces` | pieces | Catalogue, stock, entrées/sorties, mouvements |
| **PneumatiquesPage** | `/pneumatiques` | pneumatiques | Catalogue pneus, stock, contrôles |
| **FournisseursPage** | `/fournisseurs` | fournisseurs | CRUD fournisseurs avec type (Pièces/Pneus/Carburant/Général) |

### 5.5 Maintenance

| Page | Route | Permission | Description |
|------|-------|------------|-------------|
| **EntretienPage** | `/entretien` | entretien | Ordres de réparation, interventions, analyse KPI |
| **PannesPage** | `/pannes` | pannes | Déclaration et suivi des pannes |

### 5.6 Commercial & Finance

| Page | Route | Permission | Description |
|------|-------|------------|-------------|
| **ClientsPage** | `/clients` | clients | CRUD clients, contacts, évaluations |
| **CaissesPage** | `/caisses` | caisses | Caisses, mouvements, virements inter-caisses |
| **ExportPage** | `/export` | export | Export des données en Excel |

### 5.7 Administration

| Page | Route | Permission | Description |
|------|-------|------------|-------------|
| **UsersPage** | `/users` | users | Gestion des comptes utilisateurs |
| **ConfigPage** | `/config` | config | Configuration système (prix carburant, seuils, etc.) |
| **AlertesPage** | `/alertes` | alertes | Alertes système et notifications |

---

## 6. Système de Rôles et Permissions

### 6.1 Les 7 Rôles

| Rôle | Code | Description |
|------|------|-------------|
| **Administrateur** | `ADMIN` | Accès total à tous les modules |
| **Direction** | `DIRECTION` | Accès complet, vision financière |
| **Responsable Logistique** | `RESPONSABLE_LOGISTIQUE` | Opérations logistiques, pas de comptabilité |
| **Coordinateur** | `COORDINATEUR` | Coordination terrain, accès limité |
| **Magasinier** | `MAGASINIER` | Stock, pièces, carburant |
| **Comptable** | `COMPTABLE` | Finances, caisses, clients, lecture seule opérations |
| **Maintenancier** | `MAINTENANCIER` | Maintenance, pannes, pièces |

### 6.2 Les 17 Modules

`users` `camions` `chauffeurs` `transport` `location` `gps` `alertes` `pannes` `entretien` `pieces` `pneumatiques` `carburant` `clients` `fournisseurs` `export` `caisses` `config`

### 6.3 Les 5 Actions

| Action | Description |
|--------|-------------|
| `READ` | Lecture des données |
| `CREATE` | Création de nouvelles entrées |
| `UPDATE` | Modification des entrées existantes |
| `DELETE` | Suppression des entrées |
| `VIEW_FINANCIAL` | Accès aux données financières (coûts, prix, marges) |

### 6.4 Matrice des Permissions (résumé)

| Module | ADMIN | DIRECTION | RESP_LOG | COORD | MAGASIN | COMPTA | MAINT |
|--------|-------|-----------|----------|-------|---------|--------|-------|
| Camions | CRUD+F | CRUD+F | CRUD | R | R | R+F | R |
| Chauffeurs | CRUD+F | CRUD+F | CRUD | R | - | R | - |
| Transport | CRUD+F | CRUD+F | CRUD | CRUD | - | R+F | - |
| Location | CRUD+F | CRUD+F | CRUD | CRUD | - | R+F | - |
| Carburant | CRUD+F | CRUD+F | CRUD | R | CRUD | R+F | - |
| Pièces | CRUD+F | CRUD+F | CRUD | R | CRUD | R+F | CR |
| Entretien | CRUD+F | CRUD+F | CRUD | R | R | R+F | CRUD |
| Pannes | CRUD+F | CRUD+F | CRUD | CRUD | R | R | CRUD |
| Caisses | CRUD+F | CRUD+F | - | - | - | CRUD+F | - |
| Clients | CRUD+F | CRUD+F | - | R | - | CRUD+F | - |
| Users | CRUD | CRUD | - | - | - | - | - |
| GPS | CRUD | CRUD | CRUD | R | - | - | - |
| Export | CRUD | CRUD | - | - | - | CRUD | - |

*CRUD = Create/Read/Update/Delete, F = View Financial, R = Read only, - = Pas d'accès*

---

## 7. Services API (Backend)

### 7.1 Authentification (`/api/auth`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/auth/login` | Connexion (email + mot de passe) → JWT token |
| GET | `/auth/profile` | Profil de l'utilisateur connecté |

### 7.2 Camions (`/api/camions`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/camions` | Liste de tous les camions |
| GET | `/camions/:id` | Détail d'un camion |
| POST | `/camions` | Créer un camion |
| PUT | `/camions/:id` | Modifier un camion |
| DELETE | `/camions/:id` | Supprimer un camion |

### 7.3 Carburant (`/api/carburant`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/carburant/cuves` | Liste des cuves |
| POST | `/carburant/cuves` | Créer une cuve |
| POST | `/carburant/cuves/:id/cloturer` | Clôturer une cuve |
| GET | `/carburant/cuves/:id/dotations` | Dotations par cuve et période |
| GET | `/carburant/cuves/:id/appros` | Approvisionnements par cuve et période |
| GET | `/carburant/dotations` | Liste des dotations |
| POST | `/carburant/dotations` | Créer une dotation |
| GET | `/carburant/appros` | Liste des approvisionnements |
| POST | `/carburant/appros` | Créer un approvisionnement |
| GET | `/carburant/fournisseurs` | Fournisseurs type CARBURANT/GENERAL uniquement |
| GET | `/carburant/stations` | Stations partenaires |

### 7.4 Entretien (`/api/entretien`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/entretien` | Liste des maintenances (filtres: search, statut, type, priorite) |
| GET | `/entretien/:id` | Détail d'une maintenance |
| GET | `/entretien/stats` | Statistiques (total, planifié, en cours, terminé, en retard, coût) |
| GET | `/entretien/upcoming` | Maintenances à venir |
| GET | `/entretien/overdue` | Maintenances en retard |
| GET | `/entretien/camion/:id` | Maintenances par camion |
| POST | `/entretien` | Créer une maintenance |
| PUT | `/entretien/:id` | Modifier une maintenance |
| PUT | `/entretien/:id/statut` | Changer le statut |
| DELETE | `/entretien/:id` | Supprimer |

### 7.5 GPS (`/api/gps`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/gps/trackers` | Liste des trackers |
| POST | `/gps/trackers` | Créer un tracker |
| PUT | `/gps/trackers/:id` | Modifier un tracker |
| GET | `/gps/positions` | Positions actuelles |
| GET | `/gps/positions/history` | Historique des positions |
| GET | `/gps/geofences` | Liste des géofences |
| POST | `/gps/geofences` | Créer une géofence |
| GET | `/gps/alerts` | Alertes GPS |

### 7.6 Pièces (`/api/pieces`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/pieces` | Catalogue des pièces |
| POST | `/pieces` | Créer une pièce |
| GET | `/pieces/stock` | Niveaux de stock |
| POST | `/pieces/entrees` | Créer une entrée de stock |
| POST | `/pieces/sorties` | Créer une sortie de stock |
| GET | `/pieces/mouvements` | Historique des mouvements |
| GET | `/pieces/fournisseurs` | Liste des fournisseurs |
| POST | `/pieces/fournisseurs` | Créer un fournisseur |
| PUT | `/pieces/fournisseurs/:id` | Modifier un fournisseur |
| DELETE | `/pieces/fournisseurs/:id` | Supprimer un fournisseur |

### 7.7 Caisses (`/api/caisses`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/caisses` | Liste des caisses avec soldes |
| POST | `/caisses` | Créer une caisse |
| GET | `/caisses/:id/mouvements` | Mouvements d'une caisse |
| POST | `/caisses/:id/mouvements` | Créer un mouvement |
| POST | `/caisses/virements` | Virement inter-caisses |

### 7.8 Synchronisation (`/api/sync`)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/sync/status` | Statut de connexion (health check) |
| GET | `/sync/reference-data` | Télécharger les données de référence |
| POST | `/sync/batch` | Envoyer un lot de transactions offline |

---

## 8. Fonctionnalités Offline (PWA)

### 8.1 Architecture Offline

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Interface   │────▶│  IndexedDB   │────▶│  Service     │
│  Utilisateur │     │  (Dexie)     │     │  Worker      │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                     │
                           ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  Sync Queue  │────▶│  API Backend │
                    └──────────────┘     └─────────────┘
```

### 8.2 Tables IndexedDB (13 tables)

**Données de référence (cache local) :**
- `camions` - Copie locale des camions
- `chauffeurs` - Copie locale des chauffeurs
- `clients` - Copie locale des clients
- `fournisseurs` - Copie locale des fournisseurs
- `cuves` - Copie locale des cuves carburant
- `pieces` - Copie locale du catalogue pièces

**Transactions offline :**
- `dotationsCarburant` - Dotations créées hors-ligne
- `sortiesStock` - Sorties de stock hors-ligne
- `bonsTransport` - Bons de transport hors-ligne
- `bonsLocation` - Bons de location hors-ligne
- `pannes` - Pannes déclarées hors-ligne

**Infrastructure sync :**
- `syncQueue` - File d'attente de synchronisation
- `syncMeta` - Métadonnées de sync (dernière sync, etc.)

### 8.3 Stratégies du Service Worker

| Type de requête | Stratégie | Description |
|-----------------|-----------|-------------|
| GET `/api/*` | Network First | Essayer le réseau, fallback sur le cache |
| POST/PUT/DELETE `/api/*` | Network First + Background Sync | File d'attente si hors-ligne |
| Assets statiques (JS/CSS/fonts) | Cache First | Servir depuis le cache |
| Images | Stale While Revalidate | Cache + mise à jour en arrière-plan |
| Navigation | Network First + Offline Fallback | SPA routing offline |

### 8.4 Processus de Synchronisation

1. **Détection réseau** : Écoute des événements `online`/`offline` + ping toutes les 30s
2. **Mode offline** : Les transactions sont stockées dans IndexedDB
3. **Retour en ligne** : Le sync service traite la file d'attente automatiquement
4. **Retry** : Backoff exponentiel (1s → 2s → 4s → 8s → max 60s) avec 5 tentatives max
5. **Résolution** : Les conflits sont signalés à l'utilisateur via notifications

---

## 9. Données Initiales (Seeds)

Au premier déploiement, le système crée automatiquement :

### Utilisateur Admin
- **Email** : `admin@acl.sn`
- **Mot de passe** : `admin123`
- **Rôle** : ADMIN

### Données de test
- **20 camions** : Types variés (Tracteur, Porte-char, Grue, Benne, Plateau, Citerne, Porte-conteneur) - Marques : VOLVO, RENAULT, MAN, MERCEDES, IVECO, SCANIA
- **10 chauffeurs** : Avec permis C et D
- **10 clients** : Entreprises sénégalaises (SONACOS, SENELEC, DANGOTE CEMENT, etc.)
- **2 fournisseurs** : Spare Parts Sénégal, Pneus Service
- **1 cuve carburant** : 10 000 litres de capacité
- **2 stations partenaires** : Total Energies Dakar Port, Shell Rufisque
- **10 pièces de rechange** : Filtres, plaquettes, courroies (PCS-00001 à PCS-00010)
- **5 modèles de pneus** : Michelin en différentes tailles
- **1 caisse centrale** : Solde initial 500 000 FCFA

---

## 10. Variables d'Environnement

### Backend (Railway)

```bash
# Base de données (auto-fourni par Railway)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis (auto-fourni par Railway)
REDIS_URL=redis://default:pass@host:6379

# Authentification
JWT_SECRET=votre-secret-jwt-32-caracteres-minimum
JWT_EXPIRES_IN=7d

# Frontend URL (pour CORS)
FRONTEND_URL=https://acl-platform.vercel.app

# Optionnel
PORT=3000
NODE_ENV=production
DATABASE_SSL=true
```

### Frontend (Vercel)

```bash
# URL de l'API backend
VITE_API_URL=https://votre-backend.railway.app/api
```

---

## 11. Commandes

### Backend

```bash
# Développement
npm run start:dev          # Lancer en mode dev (hot reload)
npm run start:debug        # Mode debug

# Production
npm run build              # Compiler TypeScript
npm run start:prod         # Lancer en production
npm run start:railway      # Railway: migrations + seed + start

# Base de données
npm run migration:run      # Exécuter les migrations
npm run migration:revert   # Annuler la dernière migration
npm run seed:run           # Insérer les données initiales

# Tests & Qualité
npm run test               # Tests unitaires
npm run test:e2e           # Tests end-to-end
npm run lint               # Vérification ESLint
```

### Frontend

```bash
npm run dev                # Serveur de développement (port 5173)
npm run build              # Build production (tsc + vite build)
npm run preview            # Prévisualiser le build
npm run lint               # Vérification ESLint
```

---

## 12. Déploiement

### Railway (Backend)

1. Connecter le repo GitHub sur railway.app
2. Configurer le **Root Directory** : `backend`
3. Ajouter les variables d'environnement (voir section 10)
4. **Start Command** : `npm run start:railway`
5. Activer le domaine public dans Settings > Networking

Le `start:railway` exécute automatiquement :
```
migrations → seed → démarrage du serveur
```

### Vercel (Frontend)

1. Connecter le repo GitHub sur vercel.com
2. Configurer le **Root Directory** : `frontend`
3. **Framework** : Vite (auto-détecté)
4. Ajouter la variable `VITE_API_URL` pointant vers le backend Railway
5. Deploy automatique à chaque push sur `main`

---

## 13. API Documentation (Swagger)

Une documentation interactive de l'API est disponible à :

```
https://votre-backend.railway.app/api/docs
```

Elle est générée automatiquement par `@nestjs/swagger` et permet de tester tous les endpoints directement depuis le navigateur.

---

## 14. Sécurité

- **JWT** : Tokens signés avec expiration configurable (défaut: 7 jours)
- **CORS** : Origines autorisées uniquement (*.vercel.app, *.railway.app, localhost)
- **Validation** : class-validator côté backend, Zod côté frontend
- **RBAC** : Contrôle d'accès granulaire par rôle/module/action
- **Bcrypt** : Hashage des mots de passe
- **SSL** : Connexion DB chiffrée en production
- **Audit Log** : Traçabilité complète des actions utilisateur

---

*Document généré le 9 avril 2026*
*Version : 1.0.0*
