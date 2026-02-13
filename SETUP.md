# ACL Platform - Guide de Démarrage Rapide

## Prérequis

- **Node.js** v18+ (recommandé v20)
- **Docker Desktop** (pour PostgreSQL et Redis)
- **Git**

## Installation en 5 minutes

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd acl-platform
```

### 2. Lancer les services Docker (Base de données + Redis)

```bash
docker compose up -d db redis
```

Cela démarre :
- PostgreSQL sur le port `5432`
- Redis sur le port `6379`

### 3. Créer la base de données avec les migrations

```bash
cd backend
npm run migration:run
```

Cette commande crée automatiquement toutes les tables, index, vues et triggers.

### 4. Insérer les données de démonstration

```bash
npm run seed:run
```

Cette commande insère les données de référence (utilisateurs, camions, chauffeurs, clients, etc.).

### 5. Configurer le Backend

```bash
cd backend
npm install --legacy-peer-deps
cp .env.example .env
```

Vérifier que le fichier `.env` contient :
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=acl_user
DATABASE_PASSWORD=acl_password
DATABASE_NAME=acl_db

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=votre-secret-jwt-ici

# WhatsGPS (optionnel)
WHATSGPS_ACCOUNT=votre-compte
WHATSGPS_PASSWORD=votre-mot-de-passe
```

### 6. Configurer le Frontend

```bash
cd ../frontend
npm install
```

### 7. Lancer l'application

**Terminal 1 - Backend :**
```bash
cd backend
npm run start:dev
```
Le backend démarre sur http://localhost:3000

**Terminal 2 - Frontend :**
```bash
cd frontend
npm run dev
```
Le frontend démarre sur http://localhost:5173

## Structure du Projet

```
acl-platform/
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── auth/           # Authentification JWT
│   │   ├── database/       # Entités TypeORM + Migrations
│   │   ├── gps/            # Module GPS (WhatsGPS, Geofences, Alertes)
│   │   └── ...
│   └── .env                # Configuration
├── frontend/               # Application React + Vite
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/          # Pages de l'application
│   │   └── services/       # Services API
│   └── ...
├── docker-compose.yml      # Services Docker
└── SETUP.md                # Ce fichier
```

## Commandes Utiles

### Docker
```bash
# Démarrer les services
docker compose up -d db redis

# Arrêter les services
docker compose down

# Voir les logs
docker compose logs -f db

# Reset la base de données
docker compose down -v
docker compose up -d db redis
cd backend
npm run migration:run
npm run seed:run
```

### Backend
```bash
# Développement avec hot-reload
npm run start:dev

# Build production
npm run build

# Lancer les tests
npm run test

# Migrations de base de données
npm run migration:run      # Appliquer les migrations
npm run migration:revert   # Annuler la dernière migration

# Seed des données
npm run seed:run           # Insérer les données de démonstration
```

### Frontend
```bash
# Développement
npm run dev

# Build production
npm run build

# Preview du build
npm run preview
```

## Accès par défaut

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Swagger API Docs:** http://localhost:3000/api

## Utilisateurs de test

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| amadou.diop@acl-transport.sn | Password123! | DIRECTION |
| fatou.ndiaye@acl-transport.sn | Password123! | COORDINATEUR |

## Configuration WhatsGPS (Optionnel)

Pour activer le suivi GPS en temps réel via WhatsGPS :

1. Créer un compte sur https://www.whatsgps.com
2. Ajouter vos identifiants dans `backend/.env` :
   ```env
   WHATSGPS_ACCOUNT=votre-email
   WHATSGPS_PASSWORD=votre-mot-de-passe
   ```
3. Redémarrer le backend

## Problèmes Courants

### "ECONNREFUSED" à la connexion DB
→ Vérifier que Docker est lancé : `docker ps`

### "Module not found" au démarrage
→ Réinstaller les dépendances : `npm install --legacy-peer-deps`

### Port déjà utilisé
→ Trouver et arrêter le processus :
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <pid>

# Linux/Mac
lsof -i :3000
kill -9 <pid>
```

## Support

Pour toute question, contacter l'équipe de développement.
