-- Create type_tarif enum if not exists
DO $$ BEGIN
    CREATE TYPE type_tarif AS ENUM ('JOURNALIER', 'MENSUEL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to bons_location
ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS type_tarif type_tarif DEFAULT 'JOURNALIER';
ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS tarif_mensuel DECIMAL(12,2);
ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS nb_jours_location INTEGER;
ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS prix_carburant_inclus DECIMAL(12,2);
ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Update existing data with nb_jours_location calculated
UPDATE bons_location
SET nb_jours_location = EXTRACT(DAY FROM (COALESCE(date_fin_reelle, date_fin_prevue) - date_debut)) + 1
WHERE date_debut IS NOT NULL AND (date_fin_prevue IS NOT NULL OR date_fin_reelle IS NOT NULL);
