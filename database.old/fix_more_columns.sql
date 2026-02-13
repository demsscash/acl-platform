-- Add missing columns to cuves_carburant
ALTER TABLE cuves_carburant ADD COLUMN IF NOT EXISTS type_carburant type_carburant DEFAULT 'DIESEL';

-- Add missing columns to sorties_stock
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add missing columns to dotations_carburant
ALTER TABLE dotations_carburant ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Insert sample cuve if not exists
INSERT INTO cuves_carburant (nom, capacite_litres, niveau_actuel_litres, seuil_alerte_bas, emplacement, type_carburant)
SELECT 'Cuve Principale Dakar', 50000, 35000, 5000, 'Dépôt Dakar', 'DIESEL'
WHERE NOT EXISTS (SELECT 1 FROM cuves_carburant WHERE nom = 'Cuve Principale Dakar');

-- Insert sample dotations if needed
INSERT INTO dotations_carburant (numero_bon, date_dotation, camion_id, chauffeur_id, cuve_id, quantite_litres, prix_unitaire, cout_total, kilometrage_camion, created_by)
SELECT 'DOT-202601-0001', '2026-01-15', 1, 1, 1, 150, 850, 127500, 125000, 1
WHERE NOT EXISTS (SELECT 1 FROM dotations_carburant WHERE numero_bon = 'DOT-202601-0001')
AND EXISTS (SELECT 1 FROM cuves_carburant WHERE id = 1);

INSERT INTO dotations_carburant (numero_bon, date_dotation, camion_id, chauffeur_id, cuve_id, quantite_litres, prix_unitaire, cout_total, kilometrage_camion, created_by)
SELECT 'DOT-202601-0002', '2026-01-18', 2, 2, 1, 200, 850, 170000, 180500, 1
WHERE NOT EXISTS (SELECT 1 FROM dotations_carburant WHERE numero_bon = 'DOT-202601-0002')
AND EXISTS (SELECT 1 FROM cuves_carburant WHERE id = 1);
