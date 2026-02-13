-- Add payment mode columns to mouvements_caisse
ALTER TABLE mouvements_caisse ADD COLUMN IF NOT EXISTS mode_paiement VARCHAR(50);
ALTER TABLE mouvements_caisse ADD COLUMN IF NOT EXISTS numero_reference VARCHAR(100);

-- Comment explaining the payment modes
COMMENT ON COLUMN mouvements_caisse.mode_paiement IS 'Mode de paiement: VIREMENT, CHEQUE, ESPECE pour entrées; ORANGE_MONEY, WAVE, FREE_MONEY, MOBILE_MONEY_AUTRE, ESPECE, VIREMENT, CHEQUE pour sorties';
COMMENT ON COLUMN mouvements_caisse.numero_reference IS 'Numéro de référence: ID transaction mobile money, numéro de chèque, référence virement';
