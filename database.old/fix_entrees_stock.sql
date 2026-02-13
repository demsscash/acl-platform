-- Fix pour la table entrees_stock - Ajout RECUPERATION_CAMION et camion_origine

-- Ajouter la nouvelle valeur à l'enum type_entree
DO $$
BEGIN
    -- Ajouter RECUPERATION_CAMION si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'type_entree' AND e.enumlabel = 'RECUPERATION_CAMION'
    ) THEN
        ALTER TYPE type_entree ADD VALUE IF NOT EXISTS 'RECUPERATION_CAMION';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- Ajouter la colonne camion_origine_id pour les pièces récupérées
ALTER TABLE entrees_stock ADD COLUMN IF NOT EXISTS camion_origine_id INTEGER REFERENCES camions(id);

-- Créer l'index pour optimiser les recherches par camion d'origine
CREATE INDEX IF NOT EXISTS idx_entrees_stock_camion_origine ON entrees_stock(camion_origine_id);

-- Créer la table contacts_client si elle n'existe pas
CREATE TABLE IF NOT EXISTS contacts_client (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100),
    fonction VARCHAR(100),
    telephone VARCHAR(20),
    telephone_2 VARCHAR(20),
    email VARCHAR(255),
    est_principal BOOLEAN DEFAULT FALSE,
    notes TEXT,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer les index pour contacts_client
CREATE INDEX IF NOT EXISTS idx_contacts_client_client_id ON contacts_client(client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client_est_principal ON contacts_client(est_principal);

-- Ajouter preuve_url à mouvements_caisse si elle n'existe pas
ALTER TABLE mouvements_caisse ADD COLUMN IF NOT EXISTS preuve_url VARCHAR(500);
