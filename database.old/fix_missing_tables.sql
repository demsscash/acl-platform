-- Create missing enums
DO $$ BEGIN CREATE TYPE type_panne AS ENUM ('MECANIQUE', 'ELECTRIQUE', 'PNEUMATIQUE', 'HYDRAULIQUE', 'CARROSSERIE', 'ACCIDENT', 'AUTRE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE priorite_panne AS ENUM ('URGENTE', 'HAUTE', 'NORMALE', 'BASSE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE statut_panne AS ENUM ('DECLAREE', 'EN_DIAGNOSTIC', 'EN_ATTENTE_PIECES', 'EN_REPARATION', 'REPAREE', 'CLOTUREE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE type_reparation AS ENUM ('INTERNE', 'EXTERNE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE type_carburant_station AS ENUM ('DIESEL', 'ESSENCE', 'TOUS'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create stations_partenaires table
CREATE TABLE IF NOT EXISTS stations_partenaires (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    nom VARCHAR(200) NOT NULL,
    adresse TEXT,
    ville VARCHAR(100),
    telephone VARCHAR(20),
    email VARCHAR(255),
    contact_nom VARCHAR(100),
    tarif_negocie DECIMAL(10,2),
    volume_mensuel_alloue DECIMAL(10,2),
    type_carburant type_carburant_station DEFAULT 'DIESEL',
    observations TEXT,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create pannes table
CREATE TABLE IF NOT EXISTS pannes (
    id SERIAL PRIMARY KEY,
    numero_panne VARCHAR(50) UNIQUE NOT NULL,
    camion_id INTEGER NOT NULL REFERENCES camions(id),
    chauffeur_id INTEGER REFERENCES chauffeurs(id),
    date_panne TIMESTAMP NOT NULL,
    type_panne type_panne DEFAULT 'MECANIQUE',
    priorite priorite_panne DEFAULT 'NORMALE',
    statut statut_panne DEFAULT 'DECLAREE',
    description TEXT NOT NULL,
    localisation VARCHAR(255),
    kilometrage_panne INTEGER,
    cout_estime DECIMAL(15,2),
    cout_reel DECIMAL(15,2),
    date_debut_reparation TIMESTAMP,
    date_fin_reparation TIMESTAMP,
    type_reparation type_reparation,
    reparateur_interne VARCHAR(200),
    reparateur_externe VARCHAR(200),
    garage_externe VARCHAR(200),
    telephone_garage VARCHAR(50),
    diagnostic TEXT,
    travaux_effectues TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to dotations_carburant
ALTER TABLE dotations_carburant ADD COLUMN IF NOT EXISTS station_partenaire_id INTEGER REFERENCES stations_partenaires(id);

-- Add missing columns to sorties_stock
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS panne_id INTEGER REFERENCES pannes(id);
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS numero_bon VARCHAR(50);
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS date_sortie DATE DEFAULT CURRENT_DATE;
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS camion_id INTEGER REFERENCES camions(id);
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS kilometrage_camion INTEGER;
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS motif VARCHAR(50);
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pannes_camion ON pannes(camion_id);
CREATE INDEX IF NOT EXISTS idx_pannes_statut ON pannes(statut);
CREATE INDEX IF NOT EXISTS idx_pannes_type ON pannes(type_panne);

-- Insert sample stations
INSERT INTO stations_partenaires (code, nom, adresse, ville, telephone, tarif_negocie, type_carburant)
SELECT 'ST-001', 'Total Energies Dakar Port', 'Zone Portuaire', 'Dakar', '33 849 00 00', 850, 'DIESEL'
WHERE NOT EXISTS (SELECT 1 FROM stations_partenaires WHERE code = 'ST-001');

INSERT INTO stations_partenaires (code, nom, adresse, ville, telephone, tarif_negocie, type_carburant)
SELECT 'ST-002', 'Shell Rufisque', 'Route Nationale 1', 'Rufisque', '33 836 00 00', 855, 'DIESEL'
WHERE NOT EXISTS (SELECT 1 FROM stations_partenaires WHERE code = 'ST-002');

-- Insert sample pannes
INSERT INTO pannes (numero_panne, camion_id, chauffeur_id, date_panne, type_panne, priorite, statut, description, localisation, cout_estime, created_by)
SELECT 'PAN-202601-0001', 4, 2, '2026-01-20 10:30:00', 'MECANIQUE', 'HAUTE', 'EN_REPARATION', 'Problème de freinage - plaquettes usées', 'Dakar', 350000, 1
WHERE NOT EXISTS (SELECT 1 FROM pannes WHERE numero_panne = 'PAN-202601-0001');

INSERT INTO pannes (numero_panne, camion_id, chauffeur_id, date_panne, type_panne, priorite, statut, description, localisation, cout_estime, cout_reel, type_reparation, garage_externe, created_by)
SELECT 'PAN-202601-0002', 7, 5, '2026-01-18 14:00:00', 'ELECTRIQUE', 'NORMALE', 'REPAREE', 'Alternateur défaillant', 'Thiès', 280000, 320000, 'EXTERNE', 'Garage Mbaye Auto', 1
WHERE NOT EXISTS (SELECT 1 FROM pannes WHERE numero_panne = 'PAN-202601-0002');
