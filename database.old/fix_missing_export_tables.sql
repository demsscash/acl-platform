-- Create type_entree enum if not exists
DO $$ BEGIN
    CREATE TYPE type_entree AS ENUM ('ACHAT', 'RETOUR', 'TRANSFERT', 'INVENTAIRE', 'AUTRE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create entrees_stock table
CREATE TABLE IF NOT EXISTS entrees_stock (
    id SERIAL PRIMARY KEY,
    numero_bon VARCHAR(50) UNIQUE NOT NULL,
    date_entree DATE DEFAULT CURRENT_DATE,
    type_entree type_entree DEFAULT 'ACHAT',
    fournisseur_id INTEGER REFERENCES fournisseurs(id),
    fournisseur_autre VARCHAR(200),
    numero_facture VARCHAR(100),
    numero_bl VARCHAR(100),
    notes TEXT,
    facture_seule BOOLEAN DEFAULT FALSE,
    facture_url VARCHAR(500),
    created_by INTEGER NOT NULL REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create lignes_entree_stock table
CREATE TABLE IF NOT EXISTS lignes_entree_stock (
    id SERIAL PRIMARY KEY,
    entree_id INTEGER NOT NULL REFERENCES entrees_stock(id) ON DELETE CASCADE,
    piece_id INTEGER NOT NULL REFERENCES catalogue_pieces(id),
    quantite INTEGER NOT NULL,
    prix_unitaire DECIMAL(12,2),
    emplacement VARCHAR(50),
    notes TEXT
);

-- Create approvisionnements_cuve table if not exists
CREATE TABLE IF NOT EXISTS approvisionnements_cuve (
    id SERIAL PRIMARY KEY,
    numero_bon VARCHAR(50) UNIQUE NOT NULL,
    date_approvisionnement DATE DEFAULT CURRENT_DATE,
    cuve_id INTEGER REFERENCES cuves_carburant(id),
    fournisseur_id INTEGER REFERENCES fournisseurs(id),
    fournisseur_autre VARCHAR(200),
    quantite_litres DECIMAL(12,2) NOT NULL,
    prix_unitaire DECIMAL(10,2),
    cout_total DECIMAL(15,2),
    numero_facture VARCHAR(100),
    numero_bl VARCHAR(100),
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_entrees_stock_date ON entrees_stock(date_entree);
CREATE INDEX IF NOT EXISTS idx_lignes_entree_stock_entree ON lignes_entree_stock(entree_id);
CREATE INDEX IF NOT EXISTS idx_approvisionnements_cuve_date ON approvisionnements_cuve(date_approvisionnement);
