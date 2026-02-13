-- ============================================================
-- ACL LOGISTICS - CORRECTIONS SCHÉMA
-- Conformité Cahier des Charges
-- Version 1.0 - Janvier 2026
-- ============================================================

-- ============================================================
-- CORRECTION 1: TYPE DE CAMION (Plateau, Grue, Benne)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE type_camion AS ENUM (
        'PLATEAU', 'GRUE', 'BENNE', 'PORTE_CONTENEUR', 'CITERNE', 'FRIGORIFIQUE', 'AUTRE'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ajouter la colonne type_camion à la table camions
ALTER TABLE camions ADD COLUMN IF NOT EXISTS type_camion type_camion DEFAULT 'PLATEAU';

-- Commentaire descriptif
COMMENT ON COLUMN camions.type_camion IS 'Type de camion: Plateau, Grue, Benne, etc.';


-- ============================================================
-- CORRECTION 2: NATURE DU CHARGEMENT (20', 40', vrac)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE nature_chargement AS ENUM (
        'CONTENEUR_20', 'CONTENEUR_40', 'CONTENEUR_40_HC', 'VRAC', 'PALETTE', 'COLIS', 'VEHICULE', 'MATERIEL_BTP', 'ENGIN', 'AUTRE'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ajouter la colonne nature_chargement à la table bons_transport
ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS nature_chargement nature_chargement;

-- Commentaire descriptif
COMMENT ON COLUMN bons_transport.nature_chargement IS 'Nature du chargement: Conteneur 20/40, vrac, etc.';


-- ============================================================
-- CORRECTION 3: CARBURANT INCLUS (Bons de location)
-- ============================================================

-- Ajouter l'option carburant inclus aux bons de location
ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS carburant_inclus BOOLEAN DEFAULT false;
ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS litres_carburant_inclus DECIMAL(10,2);
ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS supplement_carburant DECIMAL(15,2);

-- Commentaires descriptifs
COMMENT ON COLUMN bons_location.carburant_inclus IS 'Indique si le carburant est inclus dans le tarif de location';
COMMENT ON COLUMN bons_location.litres_carburant_inclus IS 'Nombre de litres de carburant inclus si applicable';
COMMENT ON COLUMN bons_location.supplement_carburant IS 'Supplément facturé pour carburant consommé au-delà du forfait';


-- ============================================================
-- CORRECTION 4: SEUIL ALERTE CUVE = 2000L
-- ============================================================

-- S'assurer que le seuil d'alerte par défaut pour les cuves est de 2000L
ALTER TABLE cuves_carburant ALTER COLUMN seuil_alerte_bas SET DEFAULT 2000;

-- Mettre à jour les cuves existantes si nécessaire
UPDATE cuves_carburant SET seuil_alerte_bas = 2000 WHERE seuil_alerte_bas IS NULL OR seuil_alerte_bas = 0;


-- ============================================================
-- CORRECTION 5: IDENTIFIANT CAMION FORMAT ACL000X
-- ============================================================

-- Fonction pour générer automatiquement le numéro interne ACL
CREATE OR REPLACE FUNCTION generate_numero_interne_acl() RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    -- Récupérer le prochain numéro
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_interne FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM camions
    WHERE numero_interne ~ '^ACL[0-9]+$';

    -- Formater avec padding (ACL0001, ACL0002, etc.)
    NEW.numero_interne := 'ACL' || LPAD(next_num::TEXT, 4, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour auto-génération
CREATE TRIGGER trg_generate_numero_interne
    BEFORE INSERT ON camions
    FOR EACH ROW
    WHEN (NEW.numero_interne IS NULL OR NEW.numero_interne = '')
    EXECUTE FUNCTION generate_numero_interne_acl();

-- Commentaire
COMMENT ON FUNCTION generate_numero_interne_acl() IS 'Génère automatiquement un numéro interne au format ACL000X';


-- ============================================================
-- CORRECTION 6: PROFIL CHAUFFEUR (Sans accès app)
-- ============================================================

-- Les chauffeurs sont gérés administrativement mais n'ont pas de compte utilisateur
-- Ils sont créés par les gestionnaires (DIRECTION, COORDINATEUR)

-- S'assurer que la table chauffeurs existe avec les bons champs
-- (Cette table existe déjà dans le schéma principal)

-- Ajouter des champs administratifs supplémentaires si nécessaire
ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);
ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS notes_direction TEXT;
ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS evaluation_globale INTEGER CHECK (evaluation_globale BETWEEN 1 AND 5);
ALTER TABLE chauffeurs ADD COLUMN IF NOT EXISTS date_derniere_evaluation DATE;

-- Les chauffeurs n'ont PAS de user_id associé (pas de compte app)
-- La colonne user_id dans chauffeurs doit être nullable (si elle existe)
DO $$ BEGIN
    ALTER TABLE chauffeurs ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Commentaire explicatif
COMMENT ON TABLE chauffeurs IS 'Profils chauffeurs gérés administrativement. Les chauffeurs n''utilisent pas l''application.';


-- ============================================================
-- CORRECTION 7: INTÉGRATION GPS SEEWORLD/WHATSGPS
-- ============================================================

-- Table de configuration des trackers GPS
CREATE TABLE IF NOT EXISTS trackers_gps (
    id SERIAL PRIMARY KEY,
    camion_id INTEGER UNIQUE REFERENCES camions(id) ON DELETE CASCADE,

    -- Identifiants Seeworld/WhatsGPS
    imei VARCHAR(20) NOT NULL UNIQUE,          -- IMEI du tracker (15 caractères)
    sim_numero VARCHAR(20),                     -- Numéro SIM
    sim_operateur VARCHAR(50),                  -- Opérateur télécom

    -- Configuration
    modele_tracker VARCHAR(100),               -- Ex: S102A, R56L, S06N
    firmware_version VARCHAR(50),

    -- État
    actif BOOLEAN DEFAULT true,
    derniere_position_lat DECIMAL(10,8),
    derniere_position_lng DECIMAL(11,8),
    derniere_position_date TIMESTAMP,
    vitesse_actuelle INTEGER,                  -- km/h
    cap INTEGER,                               -- Direction en degrés
    altitude INTEGER,                          -- Mètres

    -- Statut connexion
    en_ligne BOOLEAN DEFAULT false,
    derniere_connexion TIMESTAMP,

    -- Configuration alertes
    alerte_survitesse_seuil INTEGER DEFAULT 100,  -- km/h
    alerte_geofence_active BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tracker_imei ON trackers_gps(imei);
CREATE INDEX idx_tracker_camion ON trackers_gps(camion_id);

-- Historique des positions GPS
CREATE TABLE IF NOT EXISTS historique_positions_gps (
    id SERIAL PRIMARY KEY,
    tracker_id INTEGER NOT NULL REFERENCES trackers_gps(id) ON DELETE CASCADE,
    camion_id INTEGER NOT NULL REFERENCES camions(id),

    -- Position
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    altitude INTEGER,
    precision_metres INTEGER,

    -- Mouvement
    vitesse INTEGER,                           -- km/h
    cap INTEGER,                               -- Degrés

    -- Contexte
    date_position TIMESTAMP NOT NULL,
    -- mission_id INTEGER REFERENCES missions(id),  -- Table missions à créer ultérieurement

    -- Données additionnelles du tracker
    donnees_raw JSONB,                         -- Données brutes pour debug

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partitionnement par mois recommandé pour les gros volumes
CREATE INDEX idx_pos_gps_date ON historique_positions_gps(date_position);
CREATE INDEX idx_pos_gps_camion ON historique_positions_gps(camion_id);
-- CREATE INDEX idx_pos_gps_mission ON historique_positions_gps(mission_id);  -- Table missions à créer

-- Configuration API Seeworld/WhatsGPS
CREATE TABLE IF NOT EXISTS config_api_gps (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur TEXT NOT NULL,
    description TEXT,
    chiffre BOOLEAN DEFAULT false,              -- Si la valeur est chiffrée
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insérer les configurations par défaut
INSERT INTO config_api_gps (cle, valeur, description) VALUES
    ('WHATSGPS_API_URL', 'https://api.whatsgps.com', 'URL de base de l''API WhatsGPS'),
    ('WHATSGPS_API_KEY', '', 'Clé API WhatsGPS (à configurer)'),
    ('WHATSGPS_ACCOUNT', '', 'Compte WhatsGPS (à configurer)'),
    ('SYNC_INTERVAL_SECONDS', '60', 'Intervalle de synchronisation des positions en secondes'),
    ('HISTORY_RETENTION_DAYS', '365', 'Durée de conservation de l''historique en jours')
ON CONFLICT (cle) DO NOTHING;

-- Alertes GPS (survitesse, sortie zone, etc.)
CREATE TABLE IF NOT EXISTS alertes_gps (
    id SERIAL PRIMARY KEY,
    tracker_id INTEGER NOT NULL REFERENCES trackers_gps(id),
    camion_id INTEGER NOT NULL REFERENCES camions(id),

    type_alerte VARCHAR(50) NOT NULL,          -- SURVITESSE, SORTIE_ZONE, BATTERIE_FAIBLE, SABOTAGE
    severite niveau_alerte NOT NULL,

    -- Contexte
    date_alerte TIMESTAMP NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    vitesse INTEGER,

    -- Détails
    message TEXT NOT NULL,
    donnees_contexte JSONB,

    -- Traitement
    traitee BOOLEAN DEFAULT false,
    traitee_par INTEGER REFERENCES users(id),
    traitee_at TIMESTAMP,
    commentaire_traitement TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerte_gps_date ON alertes_gps(date_alerte);
CREATE INDEX idx_alerte_gps_non_traitee ON alertes_gps(traitee) WHERE traitee = false;

-- Vue position actuelle de tous les camions
CREATE OR REPLACE VIEW v_positions_actuelles_camions AS
SELECT
    c.id AS camion_id,
    c.immatriculation,
    c.numero_interne,
    c.type_camion,
    c.statut,
    t.imei,
    t.derniere_position_lat AS latitude,
    t.derniere_position_lng AS longitude,
    t.derniere_position_date,
    t.vitesse_actuelle,
    t.cap,
    t.en_ligne,
    t.derniere_connexion
FROM camions c
LEFT JOIN trackers_gps t ON t.camion_id = c.id AND t.actif = true
WHERE c.actif = true;

COMMENT ON VIEW v_positions_actuelles_camions IS 'Vue temps réel des positions de tous les camions avec leur mission en cours';


-- ============================================================
-- CORRECTION 8: AJOUT COLONNE IMMATRICULATION DANS BONS
-- ============================================================

-- Pour faciliter l'affichage sans jointure
ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS camion_immatriculation VARCHAR(20);
ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS camion_immatriculation VARCHAR(20);

-- Trigger pour remplir automatiquement
CREATE OR REPLACE FUNCTION fill_camion_immatriculation_transport() RETURNS TRIGGER AS $$
BEGIN
    SELECT immatriculation INTO NEW.camion_immatriculation
    FROM camions WHERE id = NEW.camion_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fill_immat_transport
    BEFORE INSERT OR UPDATE OF camion_id ON bons_transport
    FOR EACH ROW EXECUTE FUNCTION fill_camion_immatriculation_transport();

CREATE OR REPLACE FUNCTION fill_camion_immatriculation_location() RETURNS TRIGGER AS $$
BEGIN
    SELECT immatriculation INTO NEW.camion_immatriculation
    FROM camions WHERE id = NEW.camion_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fill_immat_location
    BEFORE INSERT OR UPDATE OF camion_id ON bons_location
    FOR EACH ROW EXECUTE FUNCTION fill_camion_immatriculation_location();


-- ============================================================
-- INDEXES SUPPLÉMENTAIRES POUR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_camions_type ON camions(type_camion);
CREATE INDEX IF NOT EXISTS idx_bons_transport_nature ON bons_transport(nature_chargement);
CREATE INDEX IF NOT EXISTS idx_bons_location_carburant ON bons_location(carburant_inclus);


-- ============================================================
-- FIN DES CORRECTIONS
-- ============================================================
