-- Add missing columns to bons_transport
ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS tonnage DECIMAL(10,2);
ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS prix_tonne DECIMAL(12,2);
ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS frais_route DECIMAL(12,2) DEFAULT 0;
ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS frais_depannage DECIMAL(12,2) DEFAULT 0;
ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS frais_autres DECIMAL(12,2) DEFAULT 0;
ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS frais_autres_description TEXT;
ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Update test data with tonnage and prix_tonne where applicable
UPDATE bons_transport SET
    tonnage = poids_kg / 1000,
    prix_tonne = montant_ht / NULLIF(poids_kg / 1000, 0)
WHERE poids_kg IS NOT NULL AND poids_kg > 0;
