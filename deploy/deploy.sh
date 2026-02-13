#!/bin/bash
# Script de déploiement - Vercel + Railway
# Usage: ./deploy.sh [vercel|railway|both]

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_step() { echo -e "${BLUE}===>${NC} $1"; }

# Deploy target
TARGET=${1:-both}

# ==========================================
# RAILWAY DEPLOY
# ==========================================
deploy_railway() {
    log_step "Déploiement Backend sur Railway..."

    # Vérifier si Railway CLI est installé
    if ! command -v railway &> /dev/null; then
        log_warn "Installation de Railway CLI..."
        npm install -g @railway/cli
    fi

    # Se connecter si pas déjà connecté
    if ! railway whoami &> /dev/null; then
        log_info "Connexion à Railway..."
        railway login
    fi

    # Lier le projet si pas déjà lié
    if ! railway list | grep -q "acl-platform"; then
        log_info "Lier le projet GitHub..."
        echo "Suivez les instructions :"
        echo "1. https://railway.app/new"
        echo "2. New Project → Deploy from GitHub repo"
        echo "3. Repository: acl-platform, Root: backend, Branch: main"
        echo ""
        read -p "Appuyez sur ENTRÉE une fois lié..."
    fi

    # Uploader le code
    log_info "Déploiement du code..."
    railway up

    # Attendre que le service soit prêt
    log_info "Attente du service (30s)..."
    sleep 30

    # Afficher l'URL
    RAILWAY_URL=$(railway domain --no-input 2>/dev/null | head -1)
    log_info "✅ Backend déployé: $RAILWAY_URL"

    # Exécuter les migrations
    log_info "Exécution des migrations..."
    echo "Ouvrez Railway → Service backend → Metrics → Exec puis :"
    echo "  npm run migration:run"
    echo "  npm run seed"
}

# ==========================================
# VERCEL DEPLOY
# ==========================================
deploy_vercel() {
    log_step "Déploiement Frontend sur Vercel..."

    # Vérifier si Vercel CLI est installé
    if ! command -v vercel &> /dev/null; then
        log_warn "Installation de Vercel CLI..."
        npm install -g vercel
    fi

    # Se connecter si pas déjà connecté
    if ! vercel whoami &> /dev/null; then
        log_info "Connexion à Vercel..."
        vercel login
    fi

    # Lier le projet si pas déjà lié
    if ! vercel link list 2>/dev/null | grep -q "acl-platform"; then
        log_info "Lier le projet GitHub..."
        echo "Suivez les instructions :"
        echo "1. https://vercel.com/new"
        echo "2. Import GitHub repo: acl-platform"
        echo "3. Root: frontend, Framework: Vite"
        echo ""
        read -p "Appuyez sur ENTRÉE une fois lié..."
    fi

    # Uploader le code
    log_info "Déploiement du code..."
    cd frontend
    vercel --prod

    # Afficher l'URL
    log_info "✅ Frontend déployé"
    echo "Configurez VITE_API_URL dans Vercel → Settings → Environment Variables"
}

# ==========================================
# MAIN
# ==========================================

case "$TARGET" in
    vercel)
        deploy_vercel
        ;;
    railway)
        deploy_railway
        ;;
    both)
        log_info "Déploiement complet..."
        deploy_railway
        deploy_vercel
        ;;
    *)
        echo "Usage: $0 [vercel|railway|both]"
        exit 1
        ;;
esac
