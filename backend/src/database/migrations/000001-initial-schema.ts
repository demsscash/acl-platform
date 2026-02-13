import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // TYPES ENUMÉRÉS
    // ============================================================

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE role_utilisateur AS ENUM ('ADMIN', 'DIRECTION', 'RESPONSABLE_LOGISTIQUE', 'COORDINATEUR', 'MAGASINIER', 'COMPTABLE', 'MAINTENANCIEN');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE statut_camion AS ENUM ('DISPONIBLE', 'EN_MISSION', 'EN_MAINTENANCE', 'HORS_SERVICE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_camion AS ENUM ('PLATEAU', 'GRUE', 'BENNE', 'PORTE_CONTENEUR', 'CITERNE', 'FRIGORIFIQUE', 'TRACTEUR', 'PORTE_CHAR', 'VRAC', 'AUTRE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_carburant AS ENUM ('DIESEL', 'ESSENCE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE statut_chauffeur AS ENUM ('DISPONIBLE', 'EN_MISSION', 'CONGE', 'INDISPONIBLE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_permis AS ENUM ('B', 'C', 'D', 'EC', 'ED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_source_carburant AS ENUM ('CUVE_INTERNE', 'STATION_EXTERNE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE niveau_alerte AS ENUM ('INFO', 'WARNING', 'CRITICAL');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE statut_alerte AS ENUM ('ACTIVE', 'ACQUITTEE', 'RESOLUE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE nature_chargement AS ENUM ('CONTENEUR_20', 'CONTENEUR_40', 'CONTENEUR_40_HC', 'VRAC', 'PALETTE', 'COLIS', 'VEHICULE', 'MATERIEL_BTP', 'ENGIN', 'AUTRE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE statut_bon AS ENUM ('BROUILLON', 'EN_COURS', 'LIVRE', 'ANNULE', 'FACTURE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE statut_pneu AS ENUM ('NEUF', 'BON', 'USE', 'A_REMPLACER', 'REFORME');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE position_pneu AS ENUM ('AVG', 'AVD', 'ARG_EXT', 'ARG_INT', 'ARD_EXT', 'ARD_INT', 'SECOURS');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_alerte AS ENUM ('PIECE', 'PNEU', 'CARBURANT', 'DOCUMENT', 'MAINTENANCE', 'GPS');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Types supplémentaires pour pannes
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_panne AS ENUM ('MECANIQUE', 'ELECTRIQUE', 'PNEUMATIQUE', 'HYDRAULIQUE', 'CARROSSERIE', 'ACCIDENT', 'AUTRE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE priorite_panne AS ENUM ('URGENTE', 'HAUTE', 'NORMALE', 'BASSE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE statut_panne AS ENUM ('DECLAREE', 'EN_DIAGNOSTIC', 'EN_ATTENTE_PIECES', 'EN_REPARATION', 'REPAREE', 'CLOTUREE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_reparation AS ENUM ('INTERNE', 'EXTERNE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_carburant_station AS ENUM ('DIESEL', 'ESSENCE', 'TOUS');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Types pour audit
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Types GPS
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE gps_alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE gps_alert_status AS ENUM ('new', 'read', 'acknowledged', 'resolved');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE gps_alert_type AS ENUM ('overspeed', 'geofence_enter', 'geofence_exit', 'offline', 'low_battery', 'sos', 'vibration', 'power_cut', 'external');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE geofence_type AS ENUM ('circle', 'polygon');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE geofence_alert_type AS ENUM ('enter', 'exit', 'both');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Types pour notifications
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_notification AS ENUM ('ALERTE_PIECE', 'ALERTE_PNEU', 'ALERTE_CARBURANT', 'ALERTE_DOCUMENT', 'ALERTE_MAINTENANCE', 'MISSION_ASSIGNEE', 'MISSION_TERMINEE', 'INCIDENT_DECLARE', 'RECLAMATION', 'STOCK_BAS', 'SYSTEME');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE canal_notification AS ENUM ('APP', 'EMAIL', 'SMS', 'WHATSAPP');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Types pour historiques
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE motif_fin_affectation AS ENUM ('REASSIGNATION', 'CONGE', 'DEMISSION', 'LICENCIEMENT', 'MALADIE', 'CAMION_MAINTENANCE', 'CAMION_REFORME', 'AUTRE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE statut_mission AS ENUM ('PLANIFIEE', 'EN_PREPARATION', 'EN_ROUTE', 'LIVRAISON', 'TERMINEE', 'ANNULEE', 'INCIDENT');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_mission AS ENUM ('TRANSPORT_MARCHANDISE', 'TRANSPORT_MATERIEL', 'LOCATION_COURTE', 'LOCATION_LONGUE', 'TRANSFERT_INTERNE', 'RETOUR_VIDE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_cout_mission AS ENUM ('CARBURANT', 'PEAGE', 'PARKING', 'HEBERGEMENT', 'REPAS', 'REPARATION_URGENTE', 'AMENDE', 'MANUTENTION', 'FRAIS_DOUANE', 'ASSURANCE_VOYAGE', 'AUTRE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_evenement_camion AS ENUM ('MISE_EN_SERVICE', 'AFFECTATION_CHAUFFEUR', 'DEBUT_MISSION', 'FIN_MISSION', 'MAINTENANCE_PREVENTIVE', 'REPARATION', 'INCIDENT', 'ACCIDENT', 'PANNE', 'CONTROLE_TECHNIQUE', 'RENOUVELLEMENT_ASSURANCE', 'RENOUVELLEMENT_DOCUMENT', 'MODIFICATION_TECHNIQUE', 'CHANGEMENT_PNEUMATIQUE', 'PLEIN_CARBURANT', 'MISE_EN_MAINTENANCE', 'REMISE_EN_SERVICE', 'MISE_HORS_SERVICE', 'REFORME', 'AUTRE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE gravite_evenement AS ENUM ('INFO', 'MINEUR', 'MODERE', 'MAJEUR', 'CRITIQUE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_incident AS ENUM ('PANNE_MECANIQUE', 'PANNE_ELECTRIQUE', 'CREVAISON', 'ACCIDENT_CIRCULATION', 'ACCIDENT_CHARGEMENT', 'VOL', 'AGRESSION', 'RETARD_IMPORTANT', 'MARCHANDISE_ENDOMMAGEE', 'PROBLEME_DOUANE', 'METEO_DEFAVORABLE', 'ROUTE_IMPRATICABLE', 'AUTRE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE statut_incident AS ENUM ('DECLARE', 'EN_COURS_TRAITEMENT', 'EN_ATTENTE_PIECES', 'EN_ATTENTE_ASSURANCE', 'RESOLU', 'CLOS');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_maintenance AS ENUM ('VIDANGE', 'REVISION_MINEURE', 'REVISION_MAJEURE', 'CONTROLE_TECHNIQUE', 'CONTROLE_FREINS', 'CONTROLE_PNEUS', 'GEOMETRIE', 'CLIMATISATION', 'AUTRE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE periodicite_maintenance AS ENUM ('KM', 'JOURS', 'MIXTE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // ============================================================
    // TABLE USERS
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        telephone VARCHAR(20),
        role role_utilisateur NOT NULL DEFAULT 'COORDINATEUR',
        actif BOOLEAN DEFAULT true,
        derniere_connexion TIMESTAMP,
        refresh_token VARCHAR(500),
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_users_email ON users(email)`);
    await queryRunner.query(`CREATE INDEX idx_users_role ON users(role)`);

    // ============================================================
    // TABLE CAMIONS
    // ============================================================
    await queryRunner.query(`
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
        date_expiration_assurance DATE,
        date_expiration_visite_technique DATE,
        date_expiration_licence DATE,
        date_mise_en_circulation DATE,
        numero_carte_grise VARCHAR(50),
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_camions_statut ON camions(statut)`);
    await queryRunner.query(`CREATE INDEX idx_camions_type ON camions(type_camion)`);

    // ============================================================
    // TABLE CHAUFFEURS
    // ============================================================
    await queryRunner.query(`
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
        date_derniere_evaluation DATE,
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_chauffeurs_camion ON chauffeurs(camion_attribue_id)`);

    // ============================================================
    // TABLE CLIENTS
    // ============================================================
    await queryRunner.query(`
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
    `);

    // ============================================================
    // TABLE CONTACTS CLIENTS
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE contacts_clients (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100),
        poste VARCHAR(100),
        telephone VARCHAR(20),
        email VARCHAR(255),
        est_principal BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_contacts_client ON contacts_clients(client_id)`);

    // ============================================================
    // TABLE FOURNISSEURS
    // ============================================================
    await queryRunner.query(`
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
    `);

    // ============================================================
    // TABLE CATALOGUE PIECES
    // ============================================================
    await queryRunner.query(`
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
        numero_piece VARCHAR(50) UNIQUE,
        source VARCHAR(100),
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE STOCK PIECES
    // ============================================================
    await queryRunner.query(`
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
    `);

    // ============================================================
    // TABLE ENTREES STOCK
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE entrees_stock (
        id SERIAL PRIMARY KEY,
        numero_bon VARCHAR(50) UNIQUE NOT NULL,
        date_entree DATE DEFAULT CURRENT_DATE,
        fournisseur_id INTEGER REFERENCES fournisseurs(id),
        type_entree VARCHAR(50) DEFAULT 'ACHAT',
        facture_url VARCHAR(500),
        facture_seule BOOLEAN DEFAULT false,
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE LIGNES ENTREES STOCK
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE lignes_entrees_stock (
        id SERIAL PRIMARY KEY,
        entree_id INTEGER NOT NULL REFERENCES entrees_stock(id) ON DELETE CASCADE,
        piece_id INTEGER NOT NULL REFERENCES catalogue_pieces(id),
        quantite INTEGER NOT NULL,
        prix_unitaire DECIMAL(12,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE SORTIES STOCK
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE sorties_stock (
        id SERIAL PRIMARY KEY,
        numero_bon VARCHAR(50) UNIQUE NOT NULL,
        date_sortie DATE DEFAULT CURRENT_DATE,
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        kilometrage_camion INTEGER,
        panne_id INTEGER,
        motif TEXT,
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE LIGNES SORTIES STOCK
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE lignes_sorties_stock (
        id SERIAL PRIMARY KEY,
        sortie_id INTEGER NOT NULL REFERENCES sorties_stock(id) ON DELETE CASCADE,
        piece_id INTEGER NOT NULL REFERENCES catalogue_pieces(id),
        quantite INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE MOUVEMENTS PIECES
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE mouvements_pieces (
        id SERIAL PRIMARY KEY,
        piece_id INTEGER NOT NULL REFERENCES catalogue_pieces(id),
        type_mouvement VARCHAR(10) NOT NULL,
        quantite INTEGER NOT NULL,
        stock_apres INTEGER NOT NULL,
        motif VARCHAR(100),
        reference_id INTEGER,
        reference_type VARCHAR(50),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE CUVES CARBURANT
    // ============================================================
    await queryRunner.query(`
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
    `);

    // ============================================================
    // TABLE APPROVISIONNEMENTS CUVES
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE approvisionnements_cuves (
        id SERIAL PRIMARY KEY,
        cuve_id INTEGER NOT NULL REFERENCES cuves_carburant(id),
        date_approvisionnement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fournisseur_id INTEGER REFERENCES fournisseurs(id),
        quantite_litres DECIMAL(10,2) NOT NULL,
        prix_unitaire DECIMAL(10,2),
        cout_total DECIMAL(15,2),
        numero_bon_livraison VARCHAR(50),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE STATIONS PARTENAIRES
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE stations_partenaires (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        nom VARCHAR(200) NOT NULL,
        adresse TEXT,
        ville VARCHAR(100),
        telephone VARCHAR(20),
        email VARCHAR(255),
        contact_nom VARCHAR(100),
        tarif_negocie DECIMAL(10,2),
        volume_mensuel_alloue DECIMAL(10,2),
        type_carburant type_carburant_station DEFAULT 'DIESEL',
        observations TEXT,
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE DOTATIONS CARBURANT
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE dotations_carburant (
        id SERIAL PRIMARY KEY,
        numero_bon VARCHAR(50) UNIQUE NOT NULL,
        date_dotation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        chauffeur_id INTEGER REFERENCES chauffeurs(id),
        type_source type_source_carburant NOT NULL,
        cuve_id INTEGER REFERENCES cuves_carburant(id),
        station_partenaire_id INTEGER REFERENCES stations_partenaires(id),
        station_nom VARCHAR(200),
        quantite_litres DECIMAL(10,2) NOT NULL,
        prix_unitaire DECIMAL(10,2),
        cout_total DECIMAL(15,2),
        kilometrage_camion INTEGER,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE BONS TRANSPORT
    // ============================================================
    await queryRunner.query(`
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
        camion_immatriculation VARCHAR(20),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE BONS LOCATION
    // ============================================================
    await queryRunner.query(`
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
        camion_immatriculation VARCHAR(20),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE PANNES
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE pannes (
        id SERIAL PRIMARY KEY,
        numero_panne VARCHAR(50) UNIQUE NOT NULL,
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        chauffeur_id INTEGER REFERENCES chauffeurs(id),
        date_panne TIMESTAMP NOT NULL,
        type_panne type_panne DEFAULT 'MECANIQUE',
        priorite priorite_panne DEFAULT 'NORMALE',
        statut statut_panne DEFAULT 'DECLAREE',
        description TEXT NOT NULL,
        localisation VARCHAR(255),
        kilometrage_panne INTEGER,
        cout_estime DECIMAL(15,2),
        cout_reel DECIMAL(15,2),
        date_debut_reparation TIMESTAMP,
        date_fin_reparation TIMESTAMP,
        type_reparation type_reparation,
        reparateur_interne VARCHAR(200),
        reparateur_externe VARCHAR(200),
        garage_externe VARCHAR(200),
        telephone_garage VARCHAR(50),
        diagnostic TEXT,
        travaux_effectues TEXT,
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_pannes_camion ON pannes(camion_id)`);
    await queryRunner.query(`CREATE INDEX idx_pannes_statut ON pannes(statut)`);

    // ============================================================
    // TABLE MAINTENANCES
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE maintenances (
        id SERIAL PRIMARY KEY,
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        type_maintenance type_maintenance NOT NULL,
        date_debut TIMESTAMP NOT NULL,
        date_fin TIMESTAMP,
        kilometrage INTEGER,
        lieu VARCHAR(200),
        prestataire VARCHAR(200),
        description_travaux TEXT,
        pieces_utilisees JSONB,
        observations TEXT,
        cout_pieces DECIMAL(15,2) DEFAULT 0,
        cout_main_oeuvre DECIMAL(15,2) DEFAULT 0,
        cout_externe DECIMAL(15,2) DEFAULT 0,
        technicien VARCHAR(100),
        valide_par INTEGER REFERENCES users(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_maintenances_camion ON maintenances(camion_id)`);

    // ============================================================
    // TABLE GPS TRACKERS
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE trackers_gps (
        id SERIAL PRIMARY KEY,
        camion_id INTEGER UNIQUE REFERENCES camions(id) ON DELETE CASCADE,
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
    `);

    await queryRunner.query(`CREATE INDEX idx_tracker_imei ON trackers_gps(imei)`);
    await queryRunner.query(`CREATE INDEX idx_tracker_camion ON trackers_gps(camion_id)`);

    // ============================================================
    // TABLE GPS POSITION HISTORY
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE gps_position_history (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER NOT NULL REFERENCES trackers_gps(id) ON DELETE CASCADE,
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        altitude INTEGER,
        precision_metres INTEGER,
        vitesse INTEGER,
        cap INTEGER,
        date_position TIMESTAMP NOT NULL,
        donnees_raw JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_gps_pos_date ON gps_position_history(date_position)`);
    await queryRunner.query(`CREATE INDEX idx_gps_pos_camion ON gps_position_history(camion_id)`);

    // ============================================================
    // TABLE GPS GEOFENCES
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE gps_geofences (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(200) NOT NULL,
        description TEXT,
        type_geofence geofence_type NOT NULL DEFAULT 'circle',
        coordonnees JSONB NOT NULL,
        rayon_metres INTEGER,
        alert_type geofence_alert_type DEFAULT 'both',
        camion_ids INTEGER[],
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE GPS ALERTS
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE gps_alerts (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER NOT NULL REFERENCES trackers_gps(id),
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        type_alerte gps_alert_type NOT NULL,
        severite gps_alert_severity NOT NULL,
        statut gps_alert_status DEFAULT 'new',
        date_alerte TIMESTAMP NOT NULL,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        vitesse INTEGER,
        message TEXT NOT NULL,
        donnees_contexte JSONB,
        traitee BOOLEAN DEFAULT false,
        traitee_par INTEGER REFERENCES users(id),
        traitee_at TIMESTAMP,
        commentaire_traitement TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_gps_alerts_date ON gps_alerts(date_alerte)`);
    await queryRunner.query(`CREATE INDEX idx_gps_alerts_non_traitee ON gps_alerts(traitee) WHERE traitee = false`);

    // ============================================================
    // TABLE CONFIG API GPS
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE config_api_gps (
        id SERIAL PRIMARY KEY,
        cle VARCHAR(100) UNIQUE NOT NULL,
        valeur TEXT NOT NULL,
        description TEXT,
        chiffre BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE ALERTES
    // ============================================================
    await queryRunner.query(`
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
    `);

    await queryRunner.query(`CREATE INDEX idx_alertes_statut ON alertes(statut)`);
    await queryRunner.query(`CREATE INDEX idx_alertes_camion ON alertes(camion_id)`);

    // ============================================================
    // TABLE CATALOGUE PNEUS
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE catalogue_pneus (
        id SERIAL PRIMARY KEY,
        reference VARCHAR(50) UNIQUE NOT NULL,
        designation VARCHAR(200) NOT NULL,
        marque VARCHAR(100),
        dimension VARCHAR(50),
        type_pneu VARCHAR(50),
        prix_unitaire DECIMAL(12,2),
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE STOCK PNEUMATIQUES
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE stock_pneumatiques (
        id SERIAL PRIMARY KEY,
        pneu_id INTEGER NOT NULL REFERENCES catalogue_pneus(id),
        date_achat DATE,
        date_mise_en_service DATE,
        statut statut_pneu DEFAULT 'NEUF',
        position_actuelle position_pneu,
        kilometrage_debut INTEGER,
        kilometrage_actuel INTEGER,
        usure_pourcent INTEGER,
        camion_id INTEGER REFERENCES camions(id),
        reforme_le DATE,
        motif_reforme VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE CONTROLES PNEUMATIQUES
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE controles_pneumatiques (
        id SERIAL PRIMARY KEY,
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        date_controle DATE NOT NULL,
        kilometrage INTEGER NOT NULL,
        controles JSONB NOT NULL,
        observations TEXT,
        controle_par INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE CAISSES
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE caisses (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        solde_actuel DECIMAL(15,2) DEFAULT 0,
        devise VARCHAR(3) DEFAULT 'XOF',
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE MOUVEMENTS CAISSE
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE mouvements_caisse (
        id SERIAL PRIMARY KEY,
        caisse_id INTEGER NOT NULL REFERENCES caisses(id),
        type_mouvement VARCHAR(10) NOT NULL,
        montant DECIMAL(15,2) NOT NULL,
        motif VARCHAR(200),
        reference VARCHAR(100),
        reference_type VARCHAR(50),
        date_mouvement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE FICHIERS
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE fichiers (
        id SERIAL PRIMARY KEY,
        nom_original VARCHAR(255) NOT NULL,
        nom_stockage VARCHAR(255) NOT NULL,
        chemin VARCHAR(500) NOT NULL,
        type_mime VARCHAR(100),
        taille_octets INTEGER,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // TABLE NOTIFICATIONS
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type_notification type_notification NOT NULL,
        canal canal_notification NOT NULL,
        titre VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        lien VARCHAR(500),
        envoyee BOOLEAN DEFAULT false,
        envoyee_at TIMESTAMP,
        lue BOOLEAN DEFAULT false,
        lue_at TIMESTAMP,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_notif_user ON notifications(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_notif_lue ON notifications(lue) WHERE lue = false`);

    // ============================================================
    // TABLE PREFERENCES NOTIFICATIONS
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE preferences_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type_notification type_notification NOT NULL,
        canal canal_notification NOT NULL,
        actif BOOLEAN DEFAULT true,
        UNIQUE(user_id, type_notification, canal)
      );
    `);

    // ============================================================
    // TABLE CONFIG SYSTEME
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE config_systeme (
        id SERIAL PRIMARY KEY,
        cle VARCHAR(100) UNIQUE NOT NULL,
        valeur TEXT NOT NULL,
        description VARCHAR(255),
        updated_by INTEGER REFERENCES users(id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_config_systeme_cle ON config_systeme(cle)`);

    // ============================================================
    // TABLE AUDIT LOGS
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(100) NOT NULL,
        entity_id INTEGER NOT NULL,
        action audit_action NOT NULL,
        old_values JSONB,
        new_values JSONB,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_user ON audit_logs(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_date ON audit_logs(created_at)`);

    // ============================================================
    // TABLES HISTORIQUES (03_historiques.sql)
    // ============================================================

    // Historique affectations
    await queryRunner.query(`
      CREATE TABLE historique_affectations (
        id SERIAL PRIMARY KEY,
        chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id),
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        date_debut DATE NOT NULL,
        date_fin DATE,
        motif_fin motif_fin_affectation,
        commentaire TEXT,
        km_debut INTEGER,
        km_fin INTEGER,
        nb_missions INTEGER DEFAULT 0,
        nb_incidents INTEGER DEFAULT 0,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_hist_affect_chauffeur ON historique_affectations(chauffeur_id)`);
    await queryRunner.query(`CREATE INDEX idx_hist_affect_camion ON historique_affectations(camion_id)`);

    // Missions
    await queryRunner.query(`
      CREATE TABLE missions (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(50) UNIQUE NOT NULL,
        type_mission type_mission NOT NULL,
        statut statut_mission DEFAULT 'PLANIFIEE',
        bon_transport_id INTEGER REFERENCES bons_transport(id),
        bon_location_id INTEGER REFERENCES bons_location(id),
        client_id INTEGER REFERENCES clients(id),
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id),
        date_planifiee DATE NOT NULL,
        heure_depart_prevue TIME,
        heure_arrivee_prevue TIME,
        date_depart_reel TIMESTAMP,
        date_arrivee_reel TIMESTAMP,
        lieu_depart TEXT NOT NULL,
        lieu_arrivee TEXT NOT NULL,
        etapes JSONB,
        distance_prevue_km INTEGER,
        distance_reelle_km INTEGER,
        km_depart INTEGER,
        km_arrivee INTEGER,
        nature_chargement TEXT,
        poids_kg DECIMAL(10,2),
        volume_m3 DECIMAL(10,2),
        nb_colis INTEGER,
        references_marchandise TEXT,
        instructions_speciales TEXT,
        notes_chauffeur TEXT,
        notes_coordinateur TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_missions_camion ON missions(camion_id)`);
    await queryRunner.query(`CREATE INDEX idx_missions_chauffeur ON missions(chauffeur_id)`);
    await queryRunner.query(`CREATE INDEX idx_missions_date ON missions(date_planifiee)`);
    await queryRunner.query(`CREATE INDEX idx_missions_statut ON missions(statut)`);

    // Coûts mission
    await queryRunner.query(`
      CREATE TABLE couts_mission (
        id SERIAL PRIMARY KEY,
        mission_id INTEGER NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
        type_cout type_cout_mission NOT NULL,
        libelle VARCHAR(200) NOT NULL,
        montant DECIMAL(15,2) NOT NULL,
        devise VARCHAR(3) DEFAULT 'XOF',
        date_depense DATE NOT NULL,
        lieu VARCHAR(200),
        numero_justificatif VARCHAR(100),
        justificatif_joint BOOLEAN DEFAULT false,
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Bilan financier mission
    await queryRunner.query(`
      CREATE TABLE bilan_financier_mission (
        id SERIAL PRIMARY KEY,
        mission_id INTEGER UNIQUE NOT NULL REFERENCES missions(id),
        montant_facture DECIMAL(15,2) DEFAULT 0,
        montant_supplements DECIMAL(15,2) DEFAULT 0,
        montant_penalites DECIMAL(15,2) DEFAULT 0,
        cout_carburant DECIMAL(15,2) DEFAULT 0,
        cout_peages DECIMAL(15,2) DEFAULT 0,
        cout_autres DECIMAL(15,2) DEFAULT 0,
        cout_maintenance DECIMAL(15,2) DEFAULT 0,
        cout_par_km DECIMAL(10,2),
        rentabilite_pourcent DECIMAL(5,2),
        calcule_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Journal événements camion
    await queryRunner.query(`
      CREATE TABLE journal_evenements_camion (
        id SERIAL PRIMARY KEY,
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        type_evenement type_evenement_camion NOT NULL,
        gravite gravite_evenement DEFAULT 'INFO',
        date_evenement TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        kilometrage INTEGER,
        lieu VARCHAR(200),
        mission_id INTEGER REFERENCES missions(id),
        chauffeur_id INTEGER REFERENCES chauffeurs(id),
        titre VARCHAR(200) NOT NULL,
        description TEXT,
        actions_prises TEXT,
        cout_estime DECIMAL(15,2),
        cout_reel DECIMAL(15,2),
        necessite_suivi BOOLEAN DEFAULT false,
        date_suivi_prevu DATE,
        suivi_effectue BOOLEAN DEFAULT false,
        reference_externe VARCHAR(100),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_journal_camion ON journal_evenements_camion(camion_id)`);
    await queryRunner.query(`CREATE INDEX idx_journal_type ON journal_evenements_camion(type_evenement)`);
    await queryRunner.query(`CREATE INDEX idx_journal_date ON journal_evenements_camion(date_evenement)`);

    // Incidents
    await queryRunner.query(`
      CREATE TABLE incidents (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(50) UNIQUE NOT NULL,
        type_incident type_incident NOT NULL,
        statut statut_incident DEFAULT 'DECLARE',
        gravite gravite_evenement NOT NULL,
        date_incident TIMESTAMP NOT NULL,
        lieu_incident TEXT NOT NULL,
        coordonnees_gps VARCHAR(50),
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        chauffeur_id INTEGER REFERENCES chauffeurs(id),
        mission_id INTEGER REFERENCES missions(id),
        kilometrage INTEGER,
        description TEXT NOT NULL,
        circonstances TEXT,
        temoins TEXT,
        dommages_vehicule TEXT,
        dommages_marchandise TEXT,
        dommages_tiers TEXT,
        blesses BOOLEAN DEFAULT false,
        nb_blesses INTEGER DEFAULT 0,
        details_blesses TEXT,
        declaration_assurance BOOLEAN DEFAULT false,
        numero_sinistre VARCHAR(100),
        date_declaration_assurance DATE,
        intervention_police BOOLEAN DEFAULT false,
        numero_pv VARCHAR(100),
        constat_amiable BOOLEAN DEFAULT false,
        actions_immediates TEXT,
        actions_correctives TEXT,
        date_resolution DATE,
        cout_reparation_vehicule DECIMAL(15,2),
        cout_reparation_tiers DECIMAL(15,2),
        cout_marchandise DECIMAL(15,2),
        franchise_assurance DECIMAL(15,2),
        remboursement_assurance DECIMAL(15,2),
        cout_total_net DECIMAL(15,2),
        responsabilite_chauffeur BOOLEAN,
        pourcentage_responsabilite INTEGER,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_incidents_camion ON incidents(camion_id)`);
    await queryRunner.query(`CREATE INDEX idx_incidents_chauffeur ON incidents(chauffeur_id)`);
    await queryRunner.query(`CREATE INDEX idx_incidents_date ON incidents(date_incident)`);
    await queryRunner.query(`CREATE INDEX idx_incidents_statut ON incidents(statut)`);

    // Statistiques chauffeur mensuel
    await queryRunner.query(`
      CREATE TABLE statistiques_chauffeur_mensuel (
        id SERIAL PRIMARY KEY,
        chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id),
        annee INTEGER NOT NULL,
        mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
        nb_missions INTEGER DEFAULT 0,
        nb_missions_terminees INTEGER DEFAULT 0,
        nb_missions_annulees INTEGER DEFAULT 0,
        nb_jours_travailles INTEGER DEFAULT 0,
        km_parcourus INTEGER DEFAULT 0,
        heures_conduite DECIMAL(10,2) DEFAULT 0,
        heures_attente DECIMAL(10,2) DEFAULT 0,
        litres_consommes DECIMAL(10,2) DEFAULT 0,
        consommation_moyenne DECIMAL(5,2),
        nb_incidents INTEGER DEFAULT 0,
        nb_retards INTEGER DEFAULT 0,
        nb_reclamations_client INTEGER DEFAULT 0,
        note_moyenne_client DECIMAL(3,2),
        total_carburant DECIMAL(15,2) DEFAULT 0,
        total_peages DECIMAL(15,2) DEFAULT 0,
        total_frais DECIMAL(15,2) DEFAULT 0,
        total_amendes DECIMAL(15,2) DEFAULT 0,
        score_performance INTEGER,
        calcule_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chauffeur_id, annee, mois)
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_stats_chauffeur ON statistiques_chauffeur_mensuel(chauffeur_id)`);

    // Évaluations chauffeur
    await queryRunner.query(`
      CREATE TABLE evaluations_chauffeur (
        id SERIAL PRIMARY KEY,
        chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id),
        evaluateur_id INTEGER NOT NULL REFERENCES users(id),
        date_evaluation DATE NOT NULL,
        periode_debut DATE NOT NULL,
        periode_fin DATE NOT NULL,
        note_ponctualite DECIMAL(3,2),
        note_conduite DECIMAL(3,2),
        note_entretien_vehicule DECIMAL(3,2),
        note_relation_client DECIMAL(3,2),
        note_respect_consignes DECIMAL(3,2),
        note_globale DECIMAL(3,2),
        points_forts TEXT,
        points_amelioration TEXT,
        objectifs TEXT,
        commentaire_general TEXT,
        valide_par_direction BOOLEAN DEFAULT false,
        date_validation DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Statistiques camion mensuel
    await queryRunner.query(`
      CREATE TABLE statistiques_camion_mensuel (
        id SERIAL PRIMARY KEY,
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        annee INTEGER NOT NULL,
        mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
        nb_missions INTEGER DEFAULT 0,
        nb_jours_en_mission INTEGER DEFAULT 0,
        nb_jours_maintenance INTEGER DEFAULT 0,
        nb_jours_disponible INTEGER DEFAULT 0,
        taux_utilisation DECIMAL(5,2),
        km_debut_mois INTEGER,
        km_fin_mois INTEGER,
        km_parcourus INTEGER DEFAULT 0,
        litres_consommes DECIMAL(10,2) DEFAULT 0,
        cout_carburant DECIMAL(15,2) DEFAULT 0,
        consommation_moyenne DECIMAL(5,2),
        cout_pieces DECIMAL(15,2) DEFAULT 0,
        cout_main_oeuvre DECIMAL(15,2) DEFAULT 0,
        cout_pneus DECIMAL(15,2) DEFAULT 0,
        nb_interventions INTEGER DEFAULT 0,
        nb_pannes INTEGER DEFAULT 0,
        nb_accidents INTEGER DEFAULT 0,
        cout_incidents DECIMAL(15,2) DEFAULT 0,
        revenus_transport DECIMAL(15,2) DEFAULT 0,
        revenus_location DECIMAL(15,2) DEFAULT 0,
        marge_brute DECIMAL(15,2),
        cout_par_km DECIMAL(10,2),
        calcule_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(camion_id, annee, mois)
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_stats_camion ON statistiques_camion_mensuel(camion_id)`);

    // Planification maintenance
    await queryRunner.query(`
      CREATE TABLE planification_maintenance (
        id SERIAL PRIMARY KEY,
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        type_maintenance type_maintenance NOT NULL,
        libelle VARCHAR(200) NOT NULL,
        description TEXT,
        periodicite periodicite_maintenance NOT NULL,
        intervalle_km INTEGER,
        intervalle_jours INTEGER,
        derniere_execution_date DATE,
        derniere_execution_km INTEGER,
        prochaine_echeance_date DATE,
        prochaine_echeance_km INTEGER,
        alerte_jours_avant INTEGER DEFAULT 7,
        alerte_km_avant INTEGER DEFAULT 1000,
        duree_estimee_heures DECIMAL(4,2),
        cout_estime DECIMAL(15,2),
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Historique maintenance
    await queryRunner.query(`
      CREATE TABLE historique_maintenance (
        id SERIAL PRIMARY KEY,
        planification_id INTEGER REFERENCES planification_maintenance(id),
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        type_maintenance type_maintenance NOT NULL,
        date_debut TIMESTAMP NOT NULL,
        date_fin TIMESTAMP,
        kilometrage INTEGER NOT NULL,
        lieu VARCHAR(200),
        prestataire VARCHAR(200),
        description_travaux TEXT,
        pieces_utilisees JSONB,
        observations TEXT,
        cout_pieces DECIMAL(15,2) DEFAULT 0,
        cout_main_oeuvre DECIMAL(15,2) DEFAULT 0,
        cout_externe DECIMAL(15,2) DEFAULT 0,
        technicien VARCHAR(100),
        valide_par INTEGER REFERENCES users(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_hist_maint_camion ON historique_maintenance(camion_id)`);
    await queryRunner.query(`CREATE INDEX idx_hist_maint_date ON historique_maintenance(date_debut)`);

    // Routes fréquentes
    await queryRunner.query(`
      CREATE TABLE routes_frequentes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        nom VARCHAR(200) NOT NULL,
        depart_ville VARCHAR(100) NOT NULL,
        depart_pays VARCHAR(100) DEFAULT 'Sénégal',
        arrivee_ville VARCHAR(100) NOT NULL,
        arrivee_pays VARCHAR(100) DEFAULT 'Sénégal',
        distance_km INTEGER NOT NULL,
        duree_estimee_heures DECIMAL(5,2),
        peages_estimes DECIMAL(10,2) DEFAULT 0,
        carburant_estime_litres DECIMAL(10,2),
        points_passage TEXT,
        zones_risque TEXT,
        notes TEXT,
        nb_fois_utilisee INTEGER DEFAULT 0,
        derniere_utilisation DATE,
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Évaluations client
    await queryRunner.query(`
      CREATE TABLE evaluations_client (
        id SERIAL PRIMARY KEY,
        mission_id INTEGER NOT NULL REFERENCES missions(id),
        client_id INTEGER NOT NULL REFERENCES clients(id),
        date_evaluation DATE NOT NULL DEFAULT CURRENT_DATE,
        note_ponctualite INTEGER CHECK (note_ponctualite BETWEEN 1 AND 5),
        note_etat_marchandise INTEGER CHECK (note_etat_marchandise BETWEEN 1 AND 5),
        note_comportement_chauffeur INTEGER CHECK (note_comportement_chauffeur BETWEEN 1 AND 5),
        note_communication INTEGER CHECK (note_communication BETWEEN 1 AND 5),
        note_globale INTEGER CHECK (note_globale BETWEEN 1 AND 5),
        points_positifs TEXT,
        points_negatifs TEXT,
        suggestions TEXT,
        recommanderait BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_eval_client_mission ON evaluations_client(mission_id)`);
    await queryRunner.query(`CREATE INDEX idx_eval_client_client ON evaluations_client(client_id)`);

    // Réclamations client
    await queryRunner.query(`
      CREATE TABLE reclamations_client (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(50) UNIQUE NOT NULL,
        mission_id INTEGER REFERENCES missions(id),
        client_id INTEGER NOT NULL REFERENCES clients(id),
        date_reclamation DATE NOT NULL DEFAULT CURRENT_DATE,
        type_reclamation VARCHAR(50) NOT NULL,
        objet VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        statut VARCHAR(30) DEFAULT 'OUVERTE',
        priorite VARCHAR(20) DEFAULT 'NORMALE',
        assigne_a INTEGER REFERENCES users(id),
        date_resolution DATE,
        resolution TEXT,
        compensation_accordee DECIMAL(15,2),
        satisfaction_resolution INTEGER CHECK (satisfaction_resolution BETWEEN 1 AND 5),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // KPIs quotidiens
    await queryRunner.query(`
      CREATE TABLE kpis_quotidiens (
        id SERIAL PRIMARY KEY,
        date_kpi DATE UNIQUE NOT NULL,
        nb_camions_total INTEGER,
        nb_camions_disponibles INTEGER,
        nb_camions_en_mission INTEGER,
        nb_camions_maintenance INTEGER,
        taux_disponibilite DECIMAL(5,2),
        nb_missions_jour INTEGER,
        nb_missions_terminees INTEGER,
        nb_missions_en_cours INTEGER,
        nb_retards INTEGER,
        taux_ponctualite DECIMAL(5,2),
        litres_consommes DECIMAL(12,2),
        cout_carburant DECIMAL(15,2),
        niveau_cuves_pourcent DECIMAL(5,2),
        nb_alertes_critiques INTEGER,
        nb_alertes_warning INTEGER,
        nb_documents_expirant_30j INTEGER,
        revenus_jour DECIMAL(15,2),
        couts_jour DECIMAL(15,2),
        marge_jour DECIMAL(15,2),
        note_moyenne_clients DECIMAL(3,2),
        nb_reclamations_ouvertes INTEGER,
        calcule_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_kpis_date ON kpis_quotidiens(date_kpi)`);

    // ============================================================
    // VUES
    // ============================================================

    await queryRunner.query(`
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
    `);

    // ============================================================
    // FONCTIONS ET TRIGGERS
    // ============================================================

    // Fonction pour numéro interne camion
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION generate_numero_interne_acl() RETURNS TRIGGER AS $$
      DECLARE
        next_num INTEGER;
      BEGIN
        SELECT COALESCE(MAX(CAST(SUBSTRING(numero_interne FROM 4) AS INTEGER)), 0) + 1
        INTO next_num
        FROM camions
        WHERE numero_interne ~ '^ACL[0-9]+$';

        NEW.numero_interne := 'ACL' || LPAD(next_num::TEXT, 4, '0');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_generate_numero_interne
        BEFORE INSERT ON camions
        FOR EACH ROW
        WHEN (NEW.numero_interne IS NULL OR NEW.numero_interne = '')
        EXECUTE FUNCTION generate_numero_interne_acl();
    `);

    // Fonction pour remplir immatriculation dans bons_transport
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fill_camion_immatriculation_transport() RETURNS TRIGGER AS $$
      BEGIN
        SELECT immatriculation INTO NEW.camion_immatriculation
        FROM camions WHERE id = NEW.camion_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_fill_immat_transport
        BEFORE INSERT OR UPDATE OF camion_id ON bons_transport
        FOR EACH ROW EXECUTE FUNCTION fill_camion_immatriculation_transport();
    `);

    // Fonction pour remplir immatriculation dans bons_location
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fill_camion_immatriculation_location() RETURNS TRIGGER AS $$
      BEGIN
        SELECT immatriculation INTO NEW.camion_immatriculation
        FROM camions WHERE id = NEW.camion_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_fill_immat_location
        BEFORE INSERT OR UPDATE OF camion_id ON bons_location
        FOR EACH ROW EXECUTE FUNCTION fill_camion_immatriculation_location();
    `);

    // Fonction pour mettre à jour updated_at automatiquement
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Trigger pour config_systeme
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_config_systeme_updated_at ON config_systeme;
      CREATE TRIGGER trg_config_systeme_updated_at
        BEFORE UPDATE ON config_systeme
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop views
    await queryRunner.query(`DROP VIEW IF EXISTS v_positions_actuelles_camions;`);

    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_fill_immat_location ON bons_location;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_fill_immat_transport ON bons_transport;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_generate_numero_interne ON camions;`);

    // Drop functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fill_camion_immatriculation_location;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fill_camion_immatriculation_transport;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS generate_numero_interne_acl;`);

    // Drop tables in reverse order (due to foreign keys)
    const tables = [
      'kpis_quotidiens',
      'reclamations_client',
      'evaluations_client',
      'routes_frequentes',
      'historique_maintenance',
      'planification_maintenance',
      'statistiques_camion_mensuel',
      'evaluations_chauffeur',
      'statistiques_chauffeur_mensuel',
      'incidents',
      'journal_evenements_camion',
      'bilan_financier_mission',
      'couts_mission',
      'missions',
      'historique_affectations',
      'audit_logs',
      'config_systeme',
      'preferences_notifications',
      'notifications',
      'fichiers',
      'mouvements_caisse',
      'caisses',
      'controles_pneumatiques',
      'stock_pneumatiques',
      'catalogue_pneus',
      'alertes',
      'config_api_gps',
      'gps_alerts',
      'gps_geofences',
      'gps_position_history',
      'trackers_gps',
      'maintenances',
      'pannes',
      'bons_location',
      'bons_transport',
      'dotations_carburant',
      'stations_partenaires',
      'approvisionnements_cuves',
      'cuves_carburant',
      'mouvements_pieces',
      'lignes_sorties_stock',
      'sorties_stock',
      'lignes_entrees_stock',
      'entrees_stock',
      'stock_pieces',
      'catalogue_pieces',
      'fournisseurs',
      'contacts_clients',
      'clients',
      'chauffeurs',
      'camions',
      'users',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    }

    // Drop types
    const types = [
      'canal_notification',
      'type_notification',
      'periodicite_maintenance',
      'type_maintenance',
      'statut_incident',
      'type_incident',
      'gravite_evenement',
      'type_evenement_camion',
      'type_cout_mission',
      'type_mission',
      'statut_mission',
      'motif_fin_affectation',
      'geofence_alert_type',
      'geofence_type',
      'gps_alert_type',
      'gps_alert_status',
      'gps_alert_severity',
      'audit_action',
      'type_carburant_station',
      'type_reparation',
      'statut_panne',
      'priorite_panne',
      'type_panne',
      'type_alerte',
      'position_pneu',
      'statut_pneu',
      'statut_bon',
      'nature_chargement',
      'statut_alerte',
      'niveau_alerte',
      'type_source_carburant',
      'type_permis',
      'statut_chauffeur',
      'type_carburant',
      'type_camion',
      'statut_camion',
      'role_utilisateur',
    ];

    for (const type of types) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${type} CASCADE;`);
    }
  }
}
