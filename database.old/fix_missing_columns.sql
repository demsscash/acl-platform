-- Add missing columns for historique endpoint

-- dotations_carburant
ALTER TABLE dotations_carburant ADD COLUMN IF NOT EXISTS station_partenaire_id INTEGER REFERENCES stations_partenaires(id);

-- sorties_stock
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS panne_id INTEGER REFERENCES pannes(id);

-- Also check and add other potentially missing columns
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS numero_bon VARCHAR(50);
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS date_sortie DATE DEFAULT CURRENT_DATE;
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS camion_id INTEGER REFERENCES camions(id);
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS kilometrage_camion INTEGER;
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS motif VARCHAR(50);
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
