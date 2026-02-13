-- Add missing columns to catalogue_pieces
ALTER TABLE catalogue_pieces ADD COLUMN IF NOT EXISTS source VARCHAR(200);
ALTER TABLE catalogue_pieces ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE catalogue_pieces ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Update numero_piece for existing pieces
UPDATE catalogue_pieces SET numero_piece = 'PCS-' || LPAD(id::TEXT, 5, '0') WHERE numero_piece IS NULL;
