-- ============================================================
-- ACL LOGISTICS - MODIFICATIONS JANVIER 2026
-- Configuration système, Audit Trail & Améliorations
-- Version 2.1 - Janvier 2026
-- ============================================================

-- ============================================================
-- PARTIE 1: TABLE CONFIGURATION SYSTÈME
-- ============================================================

-- Table pour stocker les configurations système (prix carburant, etc.)
CREATE TABLE IF NOT EXISTS config_systeme (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur TEXT NOT NULL,
    description VARCHAR(255),
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide par clé
CREATE INDEX IF NOT EXISTS idx_config_systeme_cle ON config_systeme(cle);

-- Configuration initiale: Prix du carburant
INSERT INTO config_systeme (cle, valeur, description) VALUES
('PRIX_CARBURANT_LITRE', '850', 'Prix du carburant en FCFA par litre')
ON CONFLICT (cle) DO NOTHING;

-- ============================================================
-- PARTIE 2: TABLE AUDIT LOGS
-- ============================================================

-- Type d'action pour l'audit
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
        CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE');
    END IF;
END
$$;

-- Table des logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INTEGER NOT NULL,
    action audit_action NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- ============================================================
-- PARTIE 3: MODIFICATIONS ENTRÉES STOCK
-- ============================================================

-- Ajout colonne pour URL de facture fournisseur
ALTER TABLE entrees_stock ADD COLUMN IF NOT EXISTS facture_url VARCHAR(500);

-- ============================================================
-- PARTIE 4: NUMÉRO AUTOMATIQUE PIÈCES
-- ============================================================

-- Ajouter colonne numero_piece si elle n'existe pas (déjà présent dans entity mais vérifions)
ALTER TABLE catalogue_pieces ADD COLUMN IF NOT EXISTS numero_piece VARCHAR(50) UNIQUE;

-- Générer les numéros pour les pièces existantes qui n'en ont pas
UPDATE catalogue_pieces
SET numero_piece = 'PCS-' || LPAD(id::TEXT, 5, '0')
WHERE numero_piece IS NULL;

-- ============================================================
-- PARTIE 5: TRIGGER POUR MISE À JOUR AUTOMATIQUE updated_at
-- ============================================================

-- Fonction pour mettre à jour updated_at automatiquement sur config_systeme
CREATE OR REPLACE FUNCTION update_config_systeme_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur config_systeme
DROP TRIGGER IF EXISTS trg_config_systeme_updated_at ON config_systeme;
CREATE TRIGGER trg_config_systeme_updated_at
    BEFORE UPDATE ON config_systeme
    FOR EACH ROW
    EXECUTE FUNCTION update_config_systeme_updated_at();

-- ============================================================
-- FIN DES MODIFICATIONS
-- ============================================================
