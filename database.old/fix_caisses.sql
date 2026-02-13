-- Create type_caisse enum if not exists
DO $$ BEGIN
    CREATE TYPE type_caisse AS ENUM ('CENTRALE', 'LOGISTIQUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create type_mouvement enum if not exists
DO $$ BEGIN
    CREATE TYPE type_mouvement AS ENUM ('ENTREE', 'SORTIE', 'VIREMENT_INTERNE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create caisses table
CREATE TABLE IF NOT EXISTS caisses (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    type type_caisse DEFAULT 'CENTRALE',
    solde_initial DECIMAL(15,2) DEFAULT 0,
    solde_actuel DECIMAL(15,2) DEFAULT 0,
    actif BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create mouvements_caisse table
CREATE TABLE IF NOT EXISTS mouvements_caisse (
    id SERIAL PRIMARY KEY,
    caisse_id INTEGER NOT NULL REFERENCES caisses(id),
    type type_mouvement NOT NULL,
    nature VARCHAR(255) NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    beneficiaire VARCHAR(200),
    caisse_destination_id INTEGER REFERENCES caisses(id),
    date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    reference_externe VARCHAR(100),
    created_by INTEGER NOT NULL REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mouvements_caisse_caisse ON mouvements_caisse(caisse_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_caisse_date ON mouvements_caisse(date);

-- Insert default caisses
INSERT INTO caisses (nom, type, solde_initial, solde_actuel, created_by)
SELECT 'Caisse Centrale', 'CENTRALE', 5000000, 5000000, 1
WHERE NOT EXISTS (SELECT 1 FROM caisses WHERE type = 'CENTRALE');

INSERT INTO caisses (nom, type, solde_initial, solde_actuel, created_by)
SELECT 'Caisse Logistique', 'LOGISTIQUE', 2000000, 2000000, 1
WHERE NOT EXISTS (SELECT 1 FROM caisses WHERE type = 'LOGISTIQUE');

-- Insert sample mouvements
INSERT INTO mouvements_caisse (caisse_id, type, nature, montant, beneficiaire, date, notes, created_by)
SELECT 1, 'SORTIE', 'Frais de route chauffeur', 150000, 'M. Diop - Trajet Dakar-Tambacounda', '2026-01-15', 'Voyage BT-202601-0005', 1
WHERE EXISTS (SELECT 1 FROM caisses WHERE id = 1);

INSERT INTO mouvements_caisse (caisse_id, type, nature, montant, beneficiaire, date, notes, created_by)
SELECT 1, 'ENTREE', 'Règlement client', 650000, 'Port Autonome de Dakar', '2026-01-18', 'Facture BT-202601-0001', 1
WHERE EXISTS (SELECT 1 FROM caisses WHERE id = 1);

INSERT INTO mouvements_caisse (caisse_id, type, nature, montant, beneficiaire, date, notes, created_by)
SELECT 2, 'SORTIE', 'Achat pièces de rechange', 285000, 'AFRIC AUTO', '2026-01-16', 'Filtres et plaquettes', 1
WHERE EXISTS (SELECT 1 FROM caisses WHERE id = 2);

INSERT INTO mouvements_caisse (caisse_id, type, nature, montant, beneficiaire, date, notes, created_by)
SELECT 2, 'ENTREE', 'Virement depuis centrale', 500000, 'Virement interne', '2026-01-10', 'Approvisionnement caisse logistique', 1
WHERE EXISTS (SELECT 1 FROM caisses WHERE id = 2);

-- Update solde_actuel based on mouvements
UPDATE caisses SET solde_actuel = (
    solde_initial +
    COALESCE((
        SELECT SUM(CASE WHEN type = 'ENTREE' THEN montant ELSE -montant END)
        FROM mouvements_caisse
        WHERE mouvements_caisse.caisse_id = caisses.id
    ), 0)
);
