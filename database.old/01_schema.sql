-- ============================================================
-- ACL LOGISTICS - SCHÉMA DE BASE DE DONNÉES
-- Version 2.0 - Janvier 2026
-- ============================================================

-- Types énumérés
CREATE TYPE role_utilisateur AS ENUM ('DIRECTION', 'COORDINATEUR', 'MAGASINIER');
CREATE TYPE statut_camion AS ENUM ('DISPONIBLE', 'EN_MISSION', 'EN_MAINTENANCE', 'HORS_SERVICE');
CREATE TYPE type_camion AS ENUM ('PLATEAU', 'GRUE', 'BENNE', 'PORTE_CONTENEUR', 'CITERNE', 'FRIGORIFIQUE', 'AUTRE');
CREATE TYPE type_carburant AS ENUM ('DIESEL', 'ESSENCE');
CREATE TYPE statut_chauffeur AS ENUM ('DISPONIBLE', 'EN_MISSION', 'CONGE', 'INDISPONIBLE');
CREATE TYPE type_permis AS ENUM ('B', 'C', 'D', 'EC', 'ED');
CREATE TYPE type_source_carburant AS ENUM ('CUVE_INTERNE', 'STATION_EXTERNE');
CREATE TYPE niveau_alerte AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE statut_alerte AS ENUM ('ACTIVE', 'ACQUITTEE', 'RESOLUE');
CREATE TYPE nature_chargement AS ENUM ('CONTENEUR_20', 'CONTENEUR_40', 'CONTENEUR_40_HC', 'VRAC', 'PALETTE', 'COLIS', 'VEHICULE', 'MATERIEL_BTP', 'ENGIN', 'AUTRE');
CREATE TYPE statut_bon AS ENUM ('BROUILLON', 'EN_COURS', 'LIVRE', 'ANNULE', 'FACTURE');
CREATE TYPE statut_pneu AS ENUM ('NEUF', 'BON', 'USE', 'A_REMPLACER', 'REFORME');
CREATE TYPE position_pneu AS ENUM ('AVG', 'AVD', 'ARG_EXT', 'ARG_INT', 'ARD_EXT', 'ARD_INT', 'SECOURS');
CREATE TYPE type_alerte AS ENUM ('PIECE', 'PNEU', 'CARBURANT', 'DOCUMENT', 'MAINTENANCE', 'GPS');

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    role role_utilisateur NOT NULL,
    actif BOOLEAN DEFAULT true,
    derniere_connexion TIMESTAMP,
    refresh_token VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- TABLE: camions
-- ============================================================
CREATE TABLE camions (
    id SERIAL PRIMARY KEY,
    numero_interne VARCHAR(20) UNIQUE,
    immatriculation VARCHAR(20) UNIQUE NOT NULL,
    type_camion type_camion NOT NULL DEFAULT 'PLATEAU',
    marque VARCHAR(50) NOT NULL,
    modele VARCHAR(50),
    annee_mise_circulation INTEGER,
    type_carburant type_carburant DEFAULT 'DIESEL',
    capacite_reservoir_litres DECIMAL(10,2),
    kilometrage_actuel INTEGER DEFAULT 0,
    date_derniere_revision DATE,
    date_prochaine_revision DATE,
    statut statut_camion DEFAULT 'DISPONIBLE',
    photo_url VARCHAR(500),
    notes TEXT,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_camions_statut ON camions(statut);
CREATE INDEX idx_camions_type ON camions(type_camion);

-- ============================================================
-- TABLE: chauffeurs (gestion administrative, pas d'accès app)
-- ============================================================
CREATE TABLE chauffeurs (
    id SERIAL PRIMARY KEY,
    matricule VARCHAR(20) UNIQUE NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    date_naissance DATE,
    telephone VARCHAR(20),
    adresse TEXT,
    numero_permis VARCHAR(50) NOT NULL,
    type_permis type_permis NOT NULL,
    date_delivrance_permis DATE,
    date_expiration_permis DATE,
    camion_attribue_id INTEGER REFERENCES camions(id),
    statut statut_chauffeur DEFAULT 'DISPONIBLE',
    photo_url VARCHAR(500),
    notes_direction TEXT,
    evaluation_globale INTEGER CHECK (evaluation_globale BETWEEN 1 AND 5),
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chauffeurs_camion ON chauffeurs(camion_attribue_id);

-- ============================================================
-- TABLE: clients
-- ============================================================
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    raison_sociale VARCHAR(200) NOT NULL,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(255),
    contact_nom VARCHAR(100),
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: fournisseurs
-- ============================================================
CREATE TABLE fournisseurs (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    raison_sociale VARCHAR(200) NOT NULL,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(255),
    contact_nom VARCHAR(100),
    conditions_paiement VARCHAR(100),
    delai_livraison_jours INTEGER,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: catalogue_pieces
-- ============================================================
CREATE TABLE catalogue_pieces (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(50) UNIQUE NOT NULL,
    designation VARCHAR(200) NOT NULL,
    categorie VARCHAR(100),
    unite_mesure VARCHAR(20) DEFAULT 'UNITE',
    prix_unitaire_moyen DECIMAL(12,2),
    stock_minimum INTEGER DEFAULT 5,
    stock_maximum INTEGER DEFAULT 100,
    emplacement_defaut VARCHAR(50),
    fournisseur_principal_id INTEGER REFERENCES fournisseurs(id),
    duree_vie_km INTEGER,
    duree_vie_mois INTEGER,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: stock_pieces
-- ============================================================
CREATE TABLE stock_pieces (
    id SERIAL PRIMARY KEY,
    piece_id INTEGER NOT NULL REFERENCES catalogue_pieces(id),
    quantite_disponible INTEGER DEFAULT 0,
    quantite_reservee INTEGER DEFAULT 0,
    emplacement VARCHAR(50),
    dernier_mouvement_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(piece_id, emplacement)
);

-- ============================================================
-- TABLE: sorties_stock
-- ============================================================
CREATE TABLE sorties_stock (
    id SERIAL PRIMARY KEY,
    numero_bon VARCHAR(50) UNIQUE NOT NULL,
    date_sortie DATE DEFAULT CURRENT_DATE,
    camion_id INTEGER NOT NULL REFERENCES camions(id),
    kilometrage_camion INTEGER,
    motif TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: cuves_carburant
-- ============================================================
CREATE TABLE cuves_carburant (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    type_carburant type_carburant NOT NULL,
    capacite_litres DECIMAL(10,2) NOT NULL,
    niveau_actuel_litres DECIMAL(10,2) DEFAULT 0,
    seuil_alerte_bas DECIMAL(10,2) DEFAULT 2000,
    emplacement VARCHAR(200),
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: dotations_carburant
-- ============================================================
CREATE TABLE dotations_carburant (
    id SERIAL PRIMARY KEY,
    numero_bon VARCHAR(50) UNIQUE NOT NULL,
    date_dotation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    camion_id INTEGER NOT NULL REFERENCES camions(id),
    chauffeur_id INTEGER REFERENCES chauffeurs(id),
    type_source type_source_carburant NOT NULL,
    cuve_id INTEGER REFERENCES cuves_carburant(id),
    station_nom VARCHAR(200),
    quantite_litres DECIMAL(10,2) NOT NULL,
    prix_unitaire DECIMAL(10,2),
    cout_total DECIMAL(15,2),
    kilometrage_camion INTEGER,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: bons_transport
-- ============================================================
CREATE TABLE bons_transport (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,
    date_creation DATE DEFAULT CURRENT_DATE,
    client_id INTEGER REFERENCES clients(id),
    camion_id INTEGER REFERENCES camions(id),
    chauffeur_id INTEGER REFERENCES chauffeurs(id),
    nature_chargement nature_chargement,
    lieu_chargement TEXT,
    lieu_dechargement TEXT,
    date_chargement TIMESTAMP,
    date_livraison TIMESTAMP,
    poids_kg DECIMAL(10,2),
    montant_ht DECIMAL(15,2),
    statut statut_bon DEFAULT 'BROUILLON',
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: bons_location
-- ============================================================
CREATE TABLE bons_location (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    camion_id INTEGER REFERENCES camions(id),
    chauffeur_id INTEGER REFERENCES chauffeurs(id),
    date_debut TIMESTAMP,
    date_fin_prevue TIMESTAMP,
    date_fin_reelle TIMESTAMP,
    tarif_journalier DECIMAL(12,2),
    carburant_inclus BOOLEAN DEFAULT false,
    litres_carburant_inclus DECIMAL(10,2),
    supplement_carburant DECIMAL(15,2),
    km_depart INTEGER,
    km_retour INTEGER,
    montant_total DECIMAL(15,2),
    statut statut_bon DEFAULT 'BROUILLON',
    notes TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: trackers_gps (Seeworld/WhatsGPS)
-- ============================================================
CREATE TABLE trackers_gps (
    id SERIAL PRIMARY KEY,
    camion_id INTEGER UNIQUE REFERENCES camions(id),
    imei VARCHAR(20) UNIQUE NOT NULL,
    sim_numero VARCHAR(20),
    sim_operateur VARCHAR(50),
    modele_tracker VARCHAR(100),
    firmware_version VARCHAR(50),
    actif BOOLEAN DEFAULT true,
    derniere_position_lat DECIMAL(10,8),
    derniere_position_lng DECIMAL(11,8),
    derniere_position_date TIMESTAMP,
    vitesse_actuelle INTEGER,
    cap INTEGER,
    altitude INTEGER,
    en_ligne BOOLEAN DEFAULT false,
    derniere_connexion TIMESTAMP,
    alerte_survitesse_seuil INTEGER DEFAULT 100,
    alerte_geofence_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: alertes
-- ============================================================
CREATE TABLE alertes (
    id SERIAL PRIMARY KEY,
    type_alerte type_alerte NOT NULL,
    niveau niveau_alerte NOT NULL,
    camion_id INTEGER REFERENCES camions(id),
    titre VARCHAR(200) NOT NULL,
    message TEXT,
    reference_id INTEGER,
    reference_type VARCHAR(50),
    statut statut_alerte DEFAULT 'ACTIVE',
    acquittee_par INTEGER REFERENCES users(id),
    acquittee_at TIMESTAMP,
    resolue_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alertes_statut ON alertes(statut);
CREATE INDEX idx_alertes_camion ON alertes(camion_id);

-- ============================================================
-- DONNÉES INITIALES
-- ============================================================

-- Utilisateur admin par défaut (mot de passe: admin123)
INSERT INTO users (email, password_hash, nom, prenom, role) VALUES
('admin@acl.sn', '$2b$10$rQZ8K8Y8Y8Y8Y8Y8Y8Y8Y.8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8Y8', 'Admin', 'ACL', 'DIRECTION');

-- ============================================================
-- FIN DU SCHÉMA
-- ============================================================
