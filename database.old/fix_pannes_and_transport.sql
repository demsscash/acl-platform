-- Add updated_by column to pannes table
ALTER TABLE pannes ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Add PORTE_ENGIN to nature_chargement enum if not exists
DO $$
BEGIN
    -- Check if the value already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'PORTE_ENGIN'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'nature_chargement')
    ) THEN
        ALTER TYPE nature_chargement ADD VALUE IF NOT EXISTS 'PORTE_ENGIN';
    END IF;
EXCEPTION WHEN others THEN
    -- If nature_chargement doesn't exist as enum type, ignore
    NULL;
END $$;
