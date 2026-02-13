-- ============================================================
-- ACL LOGISTICS - DONNÉES DE TEST
-- Contexte: Sénégal - Transport et Logistique
-- ============================================================

-- ============================================================
-- 1. UTILISATEURS (mot de passe: password123)
-- ============================================================

-- D'abord, ajouter les rôles manquants à l'enum si nécessaire
DO $$
BEGIN
    -- Ajouter ADMIN si non existant
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN' AND enumtypid = 'role_utilisateur'::regtype) THEN
        ALTER TYPE role_utilisateur ADD VALUE 'ADMIN';
    END IF;
    -- Ajouter RESPONSABLE_LOGISTIQUE si non existant
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'RESPONSABLE_LOGISTIQUE' AND enumtypid = 'role_utilisateur'::regtype) THEN
        ALTER TYPE role_utilisateur ADD VALUE 'RESPONSABLE_LOGISTIQUE';
    END IF;
    -- Ajouter COMPTABLE si non existant
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'COMPTABLE' AND enumtypid = 'role_utilisateur'::regtype) THEN
        ALTER TYPE role_utilisateur ADD VALUE 'COMPTABLE';
    END IF;
    -- Ajouter MAINTENANCIER si non existant
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MAINTENANCIER' AND enumtypid = 'role_utilisateur'::regtype) THEN
        ALTER TYPE role_utilisateur ADD VALUE 'MAINTENANCIER';
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ajouter types de camion manquants
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TRACTEUR' AND enumtypid = 'type_camion'::regtype) THEN
        ALTER TYPE type_camion ADD VALUE 'TRACTEUR';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PORTE_CHAR' AND enumtypid = 'type_camion'::regtype) THEN
        ALTER TYPE type_camion ADD VALUE 'PORTE_CHAR';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PORTEUR' AND enumtypid = 'type_camion'::regtype) THEN
        ALTER TYPE type_camion ADD VALUE 'PORTEUR';
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO users (email, password_hash, nom, prenom, telephone, role, actif) VALUES
('direction@acl.sn', '$2a$10$Q4fVgC26fb/Zg5/Uaf8mmuMnR2.twtm2Q4KBD3LQvgSR77kYLmh8u', 'DIALLO', 'Mamadou', '77 123 45 67', 'DIRECTION', true),
('coordinateur@acl.sn', '$2a$10$Q4fVgC26fb/Zg5/Uaf8mmuMnR2.twtm2Q4KBD3LQvgSR77kYLmh8u', 'FALL', 'Ibrahima', '77 345 67 89', 'COORDINATEUR', true),
('magasinier@acl.sn', '$2a$10$Q4fVgC26fb/Zg5/Uaf8mmuMnR2.twtm2Q4KBD3LQvgSR77kYLmh8u', 'SOW', 'Amadou', '77 456 78 90', 'MAGASINIER', true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. CLIENTS
-- ============================================================

INSERT INTO clients (code, raison_sociale, adresse, telephone, email, contact_nom, actif) VALUES
('CLI-0001', 'SONACOS SA', 'Zone Industrielle, Dakar', '33 849 50 00', 'contact@sonacos.sn', 'M. Diop', true),
('CLI-0002', 'SENELEC', 'Route du Service Géographique, Dakar', '33 839 30 30', 'commercial@senelec.sn', 'Mme Sy', true),
('CLI-0003', 'Ciments du Sahel', 'Km 26, Route de Rufisque', '33 836 00 00', 'logistique@cimentsdusahel.sn', 'M. Ba', true),
('CLI-0004', 'DANGOTE CEMENT', 'Zone Industrielle de Pout', '33 951 00 00', 'transport@dangote.sn', 'M. Faye', true),
('CLI-0005', 'ICS (Industries Chimiques du Sénégal)', 'Route de Mboro', '33 955 10 00', 'logistics@ics.sn', 'Mme Niang', true),
('CLI-0006', 'SUNEOR', 'Zone Industrielle Hann, Dakar', '33 859 20 00', 'transport@suneor.sn', 'M. Seck', true),
('CLI-0007', 'CSS (Compagnie Sucrière Sénégalaise)', 'Richard-Toll', '33 963 11 00', 'logistique@css.sn', 'M. Mbaye', true),
('CLI-0008', 'SOCAS', 'Sakal', '33 962 80 00', 'commercial@socas.sn', 'Mme Diallo', true),
('CLI-0009', 'Port Autonome de Dakar', 'Boulevard de la Libération, Dakar', '33 849 45 45', 'operations@portdakar.sn', 'M. Diouf', true),
('CLI-0010', 'BOLLORE LOGISTICS', 'Zone Portuaire, Dakar', '33 849 96 00', 'senegal@bollore.com', 'M. Ndour', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. FOURNISSEURS
-- ============================================================

INSERT INTO fournisseurs (code, raison_sociale, adresse, telephone, email, contact_nom, conditions_paiement, delai_livraison_jours, actif) VALUES
('FOUR-0001', 'CFAO Motors Sénégal', 'Route de Ouakam, Dakar', '33 869 69 69', 'pieces@cfao.sn', 'M. Thiam', '30 jours', 5, true),
('FOUR-0002', 'SÉNÉGAL PIÈCES AUTO', 'Colobane, Dakar', '33 825 12 34', 'ventes@spa.sn', 'M. Camara', 'Comptant', 2, true),
('FOUR-0003', 'TOTAL SÉNÉGAL', 'Route de Rufisque, Dakar', '33 859 50 00', 'commercial@total.sn', 'Mme Kane', '15 jours', 1, true),
('FOUR-0004', 'SHELL SÉNÉGAL', 'Plateau, Dakar', '33 889 00 00', 'business@shell.sn', 'M. Diagne', '15 jours', 1, true),
('FOUR-0005', 'MICHELIN AFRIQUE', 'Zone Franche, Dakar', '33 859 80 00', 'pneus@michelin.sn', 'M. Toure', '45 jours', 7, true),
('FOUR-0006', 'RENAULT TRUCKS SENEGAL', 'VDN, Dakar', '33 869 45 00', 'pieces@renault-trucks.sn', 'Mme Sall', '30 jours', 10, true),
('FOUR-0007', 'MERCEDES-BENZ SENEGAL', 'Almadies, Dakar', '33 820 45 00', 'service@mercedes.sn', 'M. Cisse', '30 jours', 10, true),
('FOUR-0008', 'PNEU SERVICE DAKAR', 'Pikine, Dakar', '33 834 56 78', 'contact@pneuservice.sn', 'M. Ly', 'Comptant', 1, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. CAMIONS
-- ============================================================

INSERT INTO camions (immatriculation, numero_interne, marque, modele, type_camion, annee_mise_circulation, kilometrage_actuel, statut, capacite_reservoir_litres, notes, actif) VALUES
-- Plateaux (transport conteneurs)
('DK-1234-AB', 'ACL-001', 'RENAULT', 'T480', 'PLATEAU', 2021, 125000, 'DISPONIBLE', 400, 'Tracteur routier principal', true),
('DK-2345-BC', 'ACL-002', 'MERCEDES', 'ACTROS 1845', 'PLATEAU', 2020, 180000, 'EN_MISSION', 450, 'Transport conteneurs port', true),
('DK-3456-CD', 'ACL-003', 'VOLVO', 'FH16', 'PLATEAU', 2022, 85000, 'DISPONIBLE', 500, 'Longue distance', true),
('DK-4567-DE', 'ACL-004', 'SCANIA', 'R500', 'PLATEAU', 2019, 220000, 'EN_MAINTENANCE', 480, 'Révision majeure en cours', true),
('DK-5678-EF', 'ACL-005', 'MAN', 'TGX 18.500', 'PLATEAU', 2021, 145000, 'DISPONIBLE', 420, 'Transport régional', true),

-- Porte-conteneurs
('DK-6789-FG', 'ACL-006', 'RENAULT', 'D Wide', 'PORTE_CONTENEUR', 2020, 95000, 'DISPONIBLE', 300, 'Livraisons urbaines', true),
('DK-7890-GH', 'ACL-007', 'MERCEDES', 'ATEGO 1524', 'PORTE_CONTENEUR', 2019, 165000, 'EN_MISSION', 250, 'Distribution locale', true),
('DK-8901-HI', 'ACL-008', 'IVECO', 'EUROCARGO', 'PORTE_CONTENEUR', 2021, 78000, 'DISPONIBLE', 280, 'Livraisons Dakar', true),

-- Bennes
('DK-9012-IJ', 'ACL-009', 'RENAULT', 'K480', 'BENNE', 2020, 110000, 'DISPONIBLE', 400, 'Transport matériaux BTP', true),
('DK-0123-JK', 'ACL-010', 'MERCEDES', 'AROCS 3243', 'BENNE', 2021, 88000, 'EN_MISSION', 450, 'Chantiers construction', true),

-- Citernes
('DK-1122-KL', 'ACL-011', 'RENAULT', 'T460', 'CITERNE', 2019, 195000, 'DISPONIBLE', 380, 'Transport hydrocarbures', true),
('DK-2233-LM', 'ACL-012', 'VOLVO', 'FM', 'CITERNE', 2020, 142000, 'DISPONIBLE', 400, 'Citernes alimentaires', true),

-- Grues
('DK-3344-MN', 'ACL-013', 'MERCEDES', 'ACTROS 3353', 'GRUE', 2021, 72000, 'DISPONIBLE', 500, 'Transport engins lourds', true),
('DK-4455-NO', 'ACL-014', 'SCANIA', 'R580', 'GRUE', 2022, 45000, 'DISPONIBLE', 520, 'Manutention conteneurs', true)
ON CONFLICT (immatriculation) DO NOTHING;

-- ============================================================
-- 5. CHAUFFEURS
-- ============================================================

INSERT INTO chauffeurs (matricule, nom, prenom, telephone, adresse, date_naissance, numero_permis, type_permis, date_expiration_permis, statut, actif) VALUES
('CHF-001', 'DIOP', 'Ousmane', '77 111 22 33', 'Parcelles Assainies, Dakar', '1985-03-15', 'SN-2015-123456', 'EC', '2026-03-15', 'DISPONIBLE', true),
('CHF-002', 'MBAYE', 'Cheikh', '77 222 33 44', 'Pikine, Dakar', '1982-07-22', 'SN-2014-234567', 'EC', '2025-07-22', 'EN_MISSION', true),
('CHF-003', 'NDIAYE', 'Abdoulaye', '77 333 44 55', 'Guédiawaye, Dakar', '1988-11-08', 'SN-2016-345678', 'EC', '2026-11-08', 'DISPONIBLE', true),
('CHF-004', 'FALL', 'Modou', '77 444 55 66', 'Thiaroye, Dakar', '1979-05-30', 'SN-2012-456789', 'EC', '2025-05-30', 'DISPONIBLE', true),
('CHF-005', 'GUEYE', 'Pape', '77 555 66 77', 'Rufisque', '1990-02-14', 'SN-2018-567890', 'EC', '2027-02-14', 'EN_MISSION', true),
('CHF-006', 'SOW', 'Babacar', '77 666 77 88', 'Mbour', '1984-09-25', 'SN-2013-678901', 'EC', '2025-09-25', 'DISPONIBLE', true),
('CHF-007', 'SARR', 'Alioune', '77 777 88 99', 'Thiès', '1987-12-03', 'SN-2015-789012', 'EC', '2026-12-03', 'DISPONIBLE', true),
('CHF-008', 'DIALLO', 'Mamadou', '77 888 99 00', 'Kaolack', '1983-06-18', 'SN-2011-890123', 'EC', '2025-06-18', 'CONGE', true),
('CHF-009', 'KANE', 'Ibrahima', '77 999 00 11', 'Saint-Louis', '1991-01-07', 'SN-2019-901234', 'EC', '2027-01-07', 'DISPONIBLE', true),
('CHF-010', 'THIAM', 'Moustapha', '77 000 11 22', 'Ziguinchor', '1986-08-12', 'SN-2014-012345', 'ED', '2026-08-12', 'DISPONIBLE', true)
ON CONFLICT (matricule) DO NOTHING;

-- ============================================================
-- 6. CATALOGUE PIÈCES
-- ============================================================

INSERT INTO catalogue_pieces (numero_piece, reference, designation, categorie, unite_mesure, prix_unitaire_moyen, stock_minimum, stock_maximum, actif) VALUES
-- Filtration
('PCS-00001', 'FLT-HLE-001', 'Filtre à huile RENAULT', 'FILTRATION', 'UNITE', 15000, 10, 50, true),
('PCS-00002', 'FLT-AIR-001', 'Filtre à air RENAULT', 'FILTRATION', 'UNITE', 25000, 10, 50, true),
('PCS-00003', 'FLT-GAZ-001', 'Filtre à gasoil', 'FILTRATION', 'UNITE', 18000, 10, 40, true),
('PCS-00004', 'FLT-HYD-001', 'Filtre hydraulique', 'FILTRATION', 'UNITE', 45000, 5, 20, true),

-- Freinage
('PCS-00005', 'FRN-PLQ-001', 'Plaquettes de frein AV', 'FREINAGE', 'JEU', 85000, 8, 30, true),
('PCS-00006', 'FRN-PLQ-002', 'Plaquettes de frein AR', 'FREINAGE', 'JEU', 75000, 8, 30, true),
('PCS-00007', 'FRN-DSQ-001', 'Disque de frein', 'FREINAGE', 'UNITE', 120000, 4, 16, true),
('PCS-00008', 'FRN-TMB-001', 'Tambour de frein', 'FREINAGE', 'UNITE', 95000, 4, 12, true),

-- Moteur
('PCS-00009', 'MOT-CRG-001', 'Courroie alternateur', 'MOTEUR', 'UNITE', 35000, 6, 24, true),
('PCS-00010', 'MOT-DMR-001', 'Démarreur reconditionné', 'MOTEUR', 'UNITE', 250000, 2, 8, true),
('PCS-00011', 'MOT-ALT-001', 'Alternateur', 'MOTEUR', 'UNITE', 350000, 2, 6, true),
('PCS-00012', 'MOT-INJ-001', 'Injecteur diesel', 'MOTEUR', 'UNITE', 180000, 4, 16, true),

-- Transmission
('PCS-00013', 'TRS-EMB-001', 'Kit embrayage complet', 'TRANSMISSION', 'KIT', 850000, 2, 8, true),
('PCS-00014', 'TRS-CRD-001', 'Cardan transmission', 'TRANSMISSION', 'UNITE', 450000, 2, 6, true),

-- Suspension
('PCS-00015', 'SUS-AMR-001', 'Amortisseur AV', 'SUSPENSION', 'UNITE', 125000, 4, 16, true),
('PCS-00016', 'SUS-AMR-002', 'Amortisseur AR', 'SUSPENSION', 'UNITE', 95000, 4, 16, true),
('PCS-00017', 'SUS-RST-001', 'Ressort à lames', 'SUSPENSION', 'UNITE', 280000, 2, 8, true),

-- Électricité
('PCS-00018', 'ELC-BAT-001', 'Batterie 180Ah', 'ELECTRICITE', 'UNITE', 185000, 4, 12, true),
('PCS-00019', 'ELC-PHR-001', 'Phare complet', 'ELECTRICITE', 'UNITE', 95000, 4, 12, true),
('PCS-00020', 'ELC-FEU-001', 'Feu arrière', 'ELECTRICITE', 'UNITE', 45000, 6, 20, true),

-- Pneumatiques
('PCS-00021', 'PNU-TRC-001', 'Pneu 315/80 R22.5 Tracteur', 'PNEUMATIQUES', 'UNITE', 450000, 8, 32, true),
('PCS-00022', 'PNU-RMQ-001', 'Pneu 385/65 R22.5 Remorque', 'PNEUMATIQUES', 'UNITE', 380000, 8, 32, true),
('PCS-00023', 'PNU-CHB-001', 'Chambre à air 22.5', 'PNEUMATIQUES', 'UNITE', 25000, 10, 40, true),

-- Huiles et lubrifiants
('PCS-00024', 'HLE-MOT-001', 'Huile moteur 15W40 (20L)', 'LUBRIFIANTS', 'BIDON', 85000, 10, 50, true),
('PCS-00025', 'HLE-BVT-001', 'Huile boîte de vitesse (20L)', 'LUBRIFIANTS', 'BIDON', 95000, 6, 30, true),
('PCS-00026', 'HLE-HYD-001', 'Huile hydraulique (20L)', 'LUBRIFIANTS', 'BIDON', 75000, 6, 30, true),
('PCS-00027', 'GRS-UNI-001', 'Graisse universelle (15kg)', 'LUBRIFIANTS', 'SEAU', 45000, 4, 20, true)
ON CONFLICT (reference) DO NOTHING;

-- ============================================================
-- 7. STOCK PIÈCES
-- ============================================================

INSERT INTO stock_pieces (piece_id, emplacement, quantite_disponible)
SELECT id, 'Magasin Principal',
  CASE
    WHEN categorie = 'FILTRATION' THEN 25
    WHEN categorie = 'FREINAGE' THEN 15
    WHEN categorie = 'MOTEUR' THEN 8
    WHEN categorie = 'TRANSMISSION' THEN 4
    WHEN categorie = 'SUSPENSION' THEN 10
    WHEN categorie = 'ELECTRICITE' THEN 12
    WHEN categorie = 'PNEUMATIQUES' THEN 20
    WHEN categorie = 'LUBRIFIANTS' THEN 30
    ELSE 10
  END
FROM catalogue_pieces
WHERE actif = true AND id NOT IN (SELECT piece_id FROM stock_pieces);

-- ============================================================
-- 8. BONS DE TRANSPORT
-- ============================================================

INSERT INTO bons_transport (numero, date_creation, client_id, camion_id, chauffeur_id, nature_chargement, lieu_chargement, lieu_dechargement, poids_kg, montant_ht, statut, notes, created_by)
VALUES
('BT-202601-0001', CURRENT_DATE - 25, (SELECT id FROM clients WHERE code = 'CLI-0009'), (SELECT id FROM camions WHERE immatriculation = 'DK-1234-AB'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-001'), 'CONTENEUR_40', 'Port de Dakar - Terminal à Conteneurs', 'Zone Industrielle Thiès', 28000, 650000, 'LIVRE', 'Conteneur 40 pieds - Marchandises générales', 1),
('BT-202601-0002', CURRENT_DATE - 22, (SELECT id FROM clients WHERE code = 'CLI-0003'), (SELECT id FROM camions WHERE immatriculation = 'DK-9012-IJ'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-004'), 'VRAC', 'Carrière Diack', 'Chantier Diamniadio', 32000, 480000, 'LIVRE', 'Transport sable construction', 1),
('BT-202601-0003', CURRENT_DATE - 20, (SELECT id FROM clients WHERE code = 'CLI-0004'), (SELECT id FROM camions WHERE immatriculation = 'DK-2345-BC'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-002'), 'CONTENEUR_20', 'Port de Dakar', 'Usine Dangote Pout', 18000, 420000, 'LIVRE', 'Matières premières cimenterie', 1),
('BT-202601-0004', CURRENT_DATE - 18, (SELECT id FROM clients WHERE code = 'CLI-0005'), (SELECT id FROM camions WHERE immatriculation = 'DK-3456-CD'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-003'), 'VRAC', 'ICS Mboro', 'Port de Dakar Export', 35000, 780000, 'FACTURE', 'Exportation phosphates', 1),
('BT-202601-0005', CURRENT_DATE - 15, (SELECT id FROM clients WHERE code = 'CLI-0001'), (SELECT id FROM camions WHERE immatriculation = 'DK-5678-EF'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-006'), 'PALETTE', 'SONACOS Dakar', 'Entrepôt Kaolack', 12000, 350000, 'LIVRE', 'Huiles végétales conditionnées', 1),
('BT-202601-0006', CURRENT_DATE - 12, (SELECT id FROM clients WHERE code = 'CLI-0007'), (SELECT id FROM camions WHERE immatriculation = 'DK-1122-KL'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-007'), 'VRAC', 'CSS Richard-Toll', 'Port de Dakar', 30000, 850000, 'EN_COURS', 'Transport sucre exportation', 1),
('BT-202601-0007', CURRENT_DATE - 10, (SELECT id FROM clients WHERE code = 'CLI-0010'), (SELECT id FROM camions WHERE immatriculation = 'DK-6789-FG'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-001'), 'CONTENEUR_20', 'Terminal Bolloré', 'Entrepôt Mbao', 15000, 280000, 'LIVRE', 'Distribution locale conteneur', 1),
('BT-202601-0008', CURRENT_DATE - 8, (SELECT id FROM clients WHERE code = 'CLI-0002'), (SELECT id FROM camions WHERE immatriculation = 'DK-3344-MN'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-009'), 'ENGIN', 'Port de Dakar', 'Centrale SENELEC Bel-Air', 45000, 1200000, 'EN_COURS', 'Transport transformateur électrique', 1),
('BT-202601-0009', CURRENT_DATE - 5, (SELECT id FROM clients WHERE code = 'CLI-0006'), (SELECT id FROM camions WHERE immatriculation = 'DK-7890-GH'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-005'), 'PALETTE', 'SUNEOR Dakar', 'Dépôt Tambacounda', 10000, 520000, 'EN_COURS', 'Distribution huiles intérieur pays', 1),
('BT-202601-0010', CURRENT_DATE - 2, (SELECT id FROM clients WHERE code = 'CLI-0009'), (SELECT id FROM camions WHERE immatriculation = 'DK-8901-HI'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-003'), 'CONTENEUR_40', 'Port de Dakar', 'Zone Franche DIASS', 26000, 580000, 'BROUILLON', 'Import marchandises diverses', 1)
ON CONFLICT (numero) DO NOTHING;

-- ============================================================
-- 9. BONS DE LOCATION
-- ============================================================

INSERT INTO bons_location (numero, client_id, camion_id, chauffeur_id, date_debut, date_fin_prevue, tarif_journalier, carburant_inclus, litres_carburant_inclus, montant_total, statut, notes, created_by)
VALUES
('BL-202601-0001', (SELECT id FROM clients WHERE code = 'CLI-0003'), (SELECT id FROM camions WHERE immatriculation = 'DK-0123-JK'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-004'), CURRENT_DATE - 20, CURRENT_DATE - 5, 400000, true, 100, 6000000, 'TERMINE', 'Location benne chantier Diamniadio - 15 jours', 1),
('BL-202601-0002', (SELECT id FROM clients WHERE code = 'CLI-0004'), (SELECT id FROM camions WHERE immatriculation = 'DK-4455-NO'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-007'), CURRENT_DATE - 15, CURRENT_DATE + 15, 550000, false, 0, 16500000, 'EN_COURS', 'Location grue chantier Dangote - 30 jours', 1),
('BL-202601-0003', (SELECT id FROM clients WHERE code = 'CLI-0005'), (SELECT id FROM camions WHERE immatriculation = 'DK-2233-LM'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-010'), CURRENT_DATE - 10, CURRENT_DATE + 20, 480000, true, 150, 14400000, 'EN_COURS', 'Location citerne ICS - 30 jours', 1),
('BL-202601-0004', (SELECT id FROM clients WHERE code = 'CLI-0002'), (SELECT id FROM camions WHERE immatriculation = 'DK-3344-MN'), NULL, CURRENT_DATE - 5, CURRENT_DATE + 10, 650000, false, 0, 9750000, 'EN_COURS', 'Location grue sans chauffeur SENELEC', 1),
('BL-202601-0005', (SELECT id FROM clients WHERE code = 'CLI-0010'), (SELECT id FROM camions WHERE immatriculation = 'DK-6789-FG'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-006'), CURRENT_DATE - 3, CURRENT_DATE + 4, 280000, true, 80, 1960000, 'EN_COURS', 'Location courte durée Bolloré', 1)
ON CONFLICT (numero) DO NOTHING;

-- ============================================================
-- 10. DOTATIONS CARBURANT (sans cuve - station externe)
-- ============================================================

INSERT INTO dotations_carburant (numero_bon, date_dotation, camion_id, chauffeur_id, type_source, station_nom, quantite_litres, prix_unitaire, cout_total, kilometrage_camion, created_by)
VALUES
('DOT-202601-0001', CURRENT_DATE - 25, (SELECT id FROM camions WHERE immatriculation = 'DK-1234-AB'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-001'), 'STATION_EXTERNE', 'Total Hann Maristes', 350, 900, 315000, 124500, 1),
('DOT-202601-0002', CURRENT_DATE - 23, (SELECT id FROM camions WHERE immatriculation = 'DK-2345-BC'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-002'), 'STATION_EXTERNE', 'Shell Rufisque', 400, 900, 360000, 179200, 1),
('DOT-202601-0003', CURRENT_DATE - 20, (SELECT id FROM camions WHERE immatriculation = 'DK-9012-IJ'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-004'), 'STATION_EXTERNE', 'Total Diamniadio', 380, 900, 342000, 109500, 1),
('DOT-202601-0004', CURRENT_DATE - 18, (SELECT id FROM camions WHERE immatriculation = 'DK-3456-CD'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-003'), 'STATION_EXTERNE', 'Shell Thiès', 450, 900, 405000, 84200, 1),
('DOT-202601-0005', CURRENT_DATE - 15, (SELECT id FROM camions WHERE immatriculation = 'DK-5678-EF'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-006'), 'STATION_EXTERNE', 'Total Kaolack', 380, 900, 342000, 144200, 1),
('DOT-202601-0006', CURRENT_DATE - 12, (SELECT id FROM camions WHERE immatriculation = 'DK-1122-KL'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-007'), 'STATION_EXTERNE', 'Shell Saint-Louis', 350, 900, 315000, 194500, 1),
('DOT-202601-0007', CURRENT_DATE - 10, (SELECT id FROM camions WHERE immatriculation = 'DK-6789-FG'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-001'), 'STATION_EXTERNE', 'Total Plateau', 280, 900, 252000, 94800, 1),
('DOT-202601-0008', CURRENT_DATE - 8, (SELECT id FROM camions WHERE immatriculation = 'DK-3344-MN'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-009'), 'STATION_EXTERNE', 'Shell Almadies', 480, 900, 432000, 71500, 1),
('DOT-202601-0009', CURRENT_DATE - 5, (SELECT id FROM camions WHERE immatriculation = 'DK-7890-GH'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-005'), 'STATION_EXTERNE', 'Total Pikine', 230, 900, 207000, 164800, 1),
('DOT-202601-0010', CURRENT_DATE - 2, (SELECT id FROM camions WHERE immatriculation = 'DK-8901-HI'), (SELECT id FROM chauffeurs WHERE matricule = 'CHF-003'), 'STATION_EXTERNE', 'Shell Yoff', 260, 900, 234000, 77800, 1)
ON CONFLICT (numero_bon) DO NOTHING;

-- ============================================================
-- 11. ALERTES
-- ============================================================

INSERT INTO alertes (type_alerte, niveau, titre, message, reference_type, reference_id, statut, created_at) VALUES
('DOCUMENT', 'WARNING', 'Permis expire bientôt', 'Le permis du chauffeur FALL Modou (CHF-004) expire le 30/05/2025', 'chauffeur', (SELECT id FROM chauffeurs WHERE matricule = 'CHF-004'), 'ACTIVE', CURRENT_TIMESTAMP),
('MAINTENANCE', 'INFO', 'Vidange à planifier', 'Le camion DK-3456-CD a atteint 85000 km - Vidange recommandée', 'camion', (SELECT id FROM camions WHERE immatriculation = 'DK-3456-CD'), 'ACTIVE', CURRENT_TIMESTAMP),
('MAINTENANCE', 'WARNING', 'Révision en retard', 'Le camion DK-4567-DE nécessite une révision majeure (220000 km)', 'camion', (SELECT id FROM camions WHERE immatriculation = 'DK-4567-DE'), 'ACTIVE', CURRENT_TIMESTAMP),
('DOCUMENT', 'WARNING', 'Visite technique', 'Visite technique du camion DK-2345-BC à renouveler', 'camion', (SELECT id FROM camions WHERE immatriculation = 'DK-2345-BC'), 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ============================================================
-- RÉSUMÉ
-- ============================================================

SELECT '========================================' as info;
SELECT 'DONNÉES DE TEST INSÉRÉES AVEC SUCCÈS' as info;
SELECT '========================================' as info;
SELECT 'Utilisateurs: ' || COUNT(*) as compte FROM users;
SELECT 'Clients: ' || COUNT(*) as compte FROM clients;
SELECT 'Fournisseurs: ' || COUNT(*) as compte FROM fournisseurs;
SELECT 'Camions: ' || COUNT(*) as compte FROM camions;
SELECT 'Chauffeurs: ' || COUNT(*) as compte FROM chauffeurs;
SELECT 'Pièces catalogue: ' || COUNT(*) as compte FROM catalogue_pieces;
SELECT 'Stock pièces: ' || COUNT(*) as compte FROM stock_pieces;
SELECT 'Bons transport: ' || COUNT(*) as compte FROM bons_transport;
SELECT 'Bons location: ' || COUNT(*) as compte FROM bons_location;
SELECT 'Dotations carburant: ' || COUNT(*) as compte FROM dotations_carburant;
SELECT 'Alertes: ' || COUNT(*) as compte FROM alertes;
SELECT '========================================' as info;
