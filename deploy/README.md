# 🚀 Déploiement Vercel + Railway

Guide de déploiement **GRATUIT** pour ACL Platform.

---

## 📋 Prérequis

- [ ] Compte GitHub avec le code poussé
- [ ] Compte Railway ([railway.app](https://railway.app))
- [ ] Compte Vercel ([vercel.com](https://vercel.com))
- [ ] Node.js installé localement

---

## ⚡ Déploiement Rapide

```bash
# Lancer le déploiement interactif
cd /Users/demss/Downloads/acl-platform/deploy
./deploy.sh both
```

Le script vous guide **étape par étape**.

---

## 📁 Structure du Projet

```
acl-platform/
├── backend/          # NestJS API → Railway
├── frontend/         # React/Vite → Vercel
├── deploy/           # Scripts de déploiement
│   └── deploy.sh   # Script principal
└── DEPLOY.md        # Ce guide
```

---

## 🔧 Configuration

### Backend (Railway)

Variables dans Railway → Service backend → Variables :

```bash
JWT_SECRET=votre_clé_secret_au_moins_32_caractères
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://app.acl.sn
```

**Note :** PostgreSQL et Redis sont auto-créés par Railway.

### Frontend (Vercel)

Variables dans Vercel → Settings → Environment Variables :

```bash
VITE_API_URL=https://votre-backend.railway.app
```

---

## 🌐 Domaine (Optionnel)

### Avec domaine personnalisé (ex: acl.sn)

1. **Vercel** : Settings → Domains
   - Ajouter `app.acl.sn`
   - Configurer DNS chez votre registrar

2. **Railway** : Projet → Domains
   - Ajouter `api.acl.sn`
   - Configurer DNS chez votre registrar

### Sans domaine (gratuit)

- Frontend : `votre-projet.vercel.app`
- Backend : `votre-projet.railway.app`

---

## ✅ Vérification

```bash
# Tester le frontend
curl https://app.acl.sn

# Tester le backend
curl https://api.acl.sn/health

# Voir les logs
# Railway : Projet → Service → Logs
# Vercel : Project → Deployments → Logs
```

---

## 🎯 Étapes du Script

Le script [`deploy.sh`](deploy.sh) execute :

1. ✅ Vérifie les prérequis (CLI, git)
2. ✅ Connecte GitHub à Railway
3. ✅ Déploie le backend sur Railway
4. ✅ Affiche l'URL Railway (backend)
5. ✅ Exécute les migrations de la BDD
6. ✅ Connecte GitHub à Vercel
7. ✅ Déploie le frontend sur Vercel
8. ✅ Instructions pour configurer les variables

---

## 💰 Coûts

| Service | Plan | Coût |
|---------|-------|-------|
| Vercel | Hobby | **GRATUIT** |
| Railway | Free ($5 crédit) | **GRATUIT** (~500h CPU) |
| PostgreSQL | Inclus | **GRATUIT** |
| Redis | Inclus | **GRATUIT** |

**Total : $0/mois** 🎉

---

## 📈 Scalabilité

Quand les limites gratuites sont atteintes :

| Utilisation | Plan | Coût |
|-------------|-------|-------|
| < 100 utilisateurs | Free | $0 |
| 100-1000 utilisateurs | Pay As You Go | ~$5/mois |
| 1000+ utilisateurs | Pro | ~$20/mois |

---

## 🔄 Redéploiement

```bash
# Backend (auto avec git push)
git push origin main

# Frontend (auto avec git push)
git push origin main
```

Railway et Vercel déploient automatiquement à chaque `git push`.

---

## 🆘 Support

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [Problèmes connus Railway](https://docs.railway.app/troubleshooting)
- [Problèmes connus Vercel](https://vercel.com/docs/troubleshooting)

---

## ✅ Checklist Avant Déploiement

- [ ] Code poussé sur GitHub
- [ ] `package.json` valides (backend + frontend)
- [ ] Pas de `.env` commité (sécurité)
- [ ] Comptes Railway et Vercel créés
- [ ] Domaine configuré (optionnel)
- [ ] DNS propagé (si domaine personnalisé)

---

## 🚀 Prêt ?

```bash
./deploy.sh both
```

**15 minutes plus tard, votre application est en ligne !** 🎉
