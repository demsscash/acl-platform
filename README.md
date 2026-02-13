# 🚀 ACL Platform - Déploiement Vercel + Railway

Plateforme de gestion logistique pour ACL (Africa Construction Logistics)

---

## 🎯 Déploiement Zéro Coût

### Architecture

```
     app.acl.sn                    api.acl.sn
         │                              │
         ▼                              ▼
    Vercel                         Railway
  (Frontend)                     (Backend + PG + Redis)
         │                              │
         └──────────┬──────────────────────┘
                    │
                    ▼
              Railway PostgreSQL + Redis
```

### Coûts

| Service | Plan | Coût |
|---------|-------|-------|
| **Vercel** (Frontend) | Hobby | **GRATUIT** |
| **Railway** (Backend) | Free | **GRATUIT** (~500h CPU/mois) |
| **Railway PostgreSQL** | Inclus | **GRATUIT** |
| **Railway Redis** | Inclus | **GRATUIT** |

**Total: $0/mois** 🎉

---

## ⚡ Déploiement Rapide (15 min)

### Prérequis

- [x] Compte GitHub avec le code poussé
- [x] Node.js installé localement
- [ ] Compte Railway ([railway.app](https://railway.app))
- [ ] Compte Vercel ([vercel.com](https://vercel.com))

### Étape 1: Backend Railway (5 min)

1. Allez sur [railway.app](https://railway.app)
2. Cliquez **"New Project → Deploy from GitHub repo"**
3. Configuration :
   - Repository : `acl-platform`
   - Root Directory : `backend`
   - Branch : `main`
4. Cliquez **"Deploy"**

### Étape 2: Variables Backend (2 min)

Dans Railway → Service `backend` → **Variables** :

```bash
# Authentification
JWT_SECRET=change_me_secret_key_au_moins_32_caracteres
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=https://app.acl.sn
```

**Note :** PostgreSQL et Redis sont automatiquement créés par Railway.

### Étape 3: Migrations (2 min)

Dans Railway → Service `backend` → **Metrics** → **Exec** (terminal) :

```bash
npm run migration:run
npm run seed
```

### Étape 4: Frontend Vercel (5 min)

1. Allez sur [vercel.com/new](https://vercel.com/new)
2. Importez le repository GitHub : `acl-platform`
3. Configuration :
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
4. Cliquez **"Deploy"**

### Étape 5: Variables Frontend (1 min)

Dans Vercel → Project → **Settings** → **Environment Variables** :

```bash
VITE_API_URL=https://votre-backend.railway.app
```

Remplacez `votre-backend` par votre vrai URL Railway.

---

## ✅ Vérification

```bash
# Frontend
curl https://app.acl.sn

# Backend
curl https://api.acl.sn/health

# Base de données
# Dans Railway → Service → PostgreSQL → Connect
```

---

## 📈 Scalabilité (quand payant)

| Utilisateurs | Plan | Coût |
|-------------|-------|-------|
| 0-100 | Free | $0 |
| 100-1000 | Pay As You Go | ~$5/mois |
| 1000+ | Pro | ~$20/mois |

Railway scale automatiquement - pas de migration complexe !

---

## 🔧 Maintenance

### Voir les logs

**Railway :** Projet → Service → Metrics → Logs
**Vercel :** Projet → Deployments → Logs

### Redéployer

```bash
# Simple git push
git push origin main
# Railway et Vercel déploient automatiquement
```

### Base de données

**Railway :** Projet → Service → PostgreSQL → Connect

```bash
# Ouvrir pgAdmin
psql $DATABASE_URL

# Sauvegarder
pg_dump $DATABASE_URL > backup.sql
```

---

## 📚 Documentation

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)

---

## 🎉 Félicitations !

Votre application ACL Platform est maintenant en ligne **gratuitement** !

```
┌─────────────────────────────────────┐
│     app.acl.sn (Vercel)       │
│          ▼                       │
│   ┌─────────────────────┐   │
│   │ Railway Backend      │   │
│   │ ┌──────────────┐   │   │
│   │ │ PostgreSQL   │   │   │
│   │ └──────────────┘   │   │
│   │ ┌──────────────┐   │   │
│   │ │ Redis (opt.) │   │   │
│   │ └──────────────┘   │   │
│   └─────────────────────┘   │
└─────────────────────────────────────┘
```

**Accès utilisateurs :**
- Application : https://app.acl.sn
- Admin : admin@acl.sn / admin123
