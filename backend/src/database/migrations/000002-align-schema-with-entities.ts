import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 000002: Align database schema with TypeORM entities
 *
 * The initial migration (000001) created the base schema, but entities have
 * since evolved significantly. This migration brings the database in sync
 * with all current entity definitions.
 *
 * Strategy:
 * - Tables with minor differences: ALTER TABLE to add missing columns
 * - Tables with major divergence: DROP and recreate
 * - Enum types with different values: DROP and recreate
 */
export class AlignSchemaWithEntities1000000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 1. NEW ENUM TYPES needed by entities
    // ============================================================

    // TypeMaintenance entity uses different values than migration's type_maintenance
    await queryRunner.query(`ALTER TYPE type_maintenance RENAME TO type_maintenance_old;`);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_maintenance AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'REVISION', 'CONTROLE_TECHNIQUE', 'VIDANGE', 'FREINS', 'PNEUS', 'AUTRE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE statut_maintenance AS ENUM ('PLANIFIE', 'EN_ATTENTE_PIECES', 'EN_COURS', 'TERMINE', 'ANNULE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE priorite_maintenance AS ENUM ('BASSE', 'NORMALE', 'HAUTE', 'URGENTE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_mouvement_piece AS ENUM ('SORTIE_STOCK', 'RETOUR_STOCK', 'INTERCHANGE', 'INSTALLATION', 'DESINSTALLATION');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE etat_piece AS ENUM ('NEUVE', 'BON_ETAT', 'USEE', 'DEFECTUEUSE', 'REPAREE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_entree_stock AS ENUM ('ACHAT', 'RETOUR', 'TRANSFERT', 'INVENTAIRE', 'RECUPERATION_CAMION', 'AUTRE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE motif_sortie AS ENUM ('MAINTENANCE', 'REPARATION', 'REMPLACEMENT', 'USURE', 'PANNE', 'AUTRE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_caisse AS ENUM ('CENTRALE', 'LOGISTIQUE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_mouvement_caisse AS ENUM ('ENTREE', 'SORTIE', 'VIREMENT_INTERNE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE type_tarif_location AS ENUM ('JOURNALIER', 'MENSUEL');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM ('TRANSPORT_CREATED', 'TRANSPORT_UPDATED', 'LOCATION_CREATED', 'PANNE_DECLARED', 'STOCK_LOW', 'DOCUMENT_EXPIRING', 'ALERT', 'MAINTENANCE_CREATED', 'MAINTENANCE_STARTED', 'MAINTENANCE_COMPLETED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add missing enum values
    await queryRunner.query(`ALTER TYPE nature_chargement ADD VALUE IF NOT EXISTS 'CONTENEUR_2X20';`);
    await queryRunner.query(`ALTER TYPE nature_chargement ADD VALUE IF NOT EXISTS 'PORTE_ENGIN';`);
    await queryRunner.query(`ALTER TYPE statut_bon ADD VALUE IF NOT EXISTS 'TERMINE';`);
    await queryRunner.query(`ALTER TYPE type_alerte ADD VALUE IF NOT EXISTS 'STOCK';`);

    // ============================================================
    // 2. contacts_clients - Add missing columns
    // ============================================================
    await queryRunner.query(`ALTER TABLE contacts_clients ADD COLUMN IF NOT EXISTS fonction VARCHAR(100);`);
    await queryRunner.query(`ALTER TABLE contacts_clients ADD COLUMN IF NOT EXISTS telephone_2 VARCHAR(20);`);
    await queryRunner.query(`ALTER TABLE contacts_clients ADD COLUMN IF NOT EXISTS notes TEXT;`);
    await queryRunner.query(`ALTER TABLE contacts_clients ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;`);

    // ============================================================
    // 3. entrees_stock - Add missing columns, fix type_entree
    // ============================================================
    await queryRunner.query(`ALTER TABLE entrees_stock ADD COLUMN IF NOT EXISTS fournisseur_autre VARCHAR(200);`);
    await queryRunner.query(`ALTER TABLE entrees_stock ADD COLUMN IF NOT EXISTS camion_origine_id INTEGER REFERENCES camions(id);`);
    await queryRunner.query(`ALTER TABLE entrees_stock ADD COLUMN IF NOT EXISTS numero_facture VARCHAR(100);`);
    await queryRunner.query(`ALTER TABLE entrees_stock ADD COLUMN IF NOT EXISTS numero_bl VARCHAR(100);`);
    await queryRunner.query(`ALTER TABLE entrees_stock ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);`);
    await queryRunner.query(`ALTER TABLE entrees_stock ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
    // Change type_entree from VARCHAR to enum
    await queryRunner.query(`ALTER TABLE entrees_stock ALTER COLUMN type_entree TYPE type_entree_stock USING type_entree::type_entree_stock;`);

    // ============================================================
    // 4. lignes_entrees_stock - Add missing columns
    // ============================================================
    await queryRunner.query(`ALTER TABLE lignes_entrees_stock ADD COLUMN IF NOT EXISTS emplacement VARCHAR(50);`);
    await queryRunner.query(`ALTER TABLE lignes_entrees_stock ADD COLUMN IF NOT EXISTS notes TEXT;`);

    // ============================================================
    // 5. sorties_stock - Fix motif to enum, add missing columns
    // ============================================================
    await queryRunner.query(`ALTER TABLE sorties_stock ALTER COLUMN motif TYPE motif_sortie USING motif::motif_sortie;`);
    await queryRunner.query(`ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);`);
    await queryRunner.query(`ALTER TABLE sorties_stock ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

    // ============================================================
    // 6. lignes_sorties_stock - Add missing columns
    // ============================================================
    await queryRunner.query(`ALTER TABLE lignes_sorties_stock ADD COLUMN IF NOT EXISTS prix_unitaire DECIMAL(12,2);`);
    await queryRunner.query(`ALTER TABLE lignes_sorties_stock ADD COLUMN IF NOT EXISTS emplacement VARCHAR(50);`);
    await queryRunner.query(`ALTER TABLE lignes_sorties_stock ADD COLUMN IF NOT EXISTS notes TEXT;`);

    // ============================================================
    // 7. bons_transport - Add missing columns
    // ============================================================
    await queryRunner.query(`ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS tonnage DECIMAL(10,2);`);
    await queryRunner.query(`ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS prix_tonne DECIMAL(12,2);`);
    await queryRunner.query(`ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS frais_route DECIMAL(12,2) DEFAULT 0;`);
    await queryRunner.query(`ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS frais_depannage DECIMAL(12,2) DEFAULT 0;`);
    await queryRunner.query(`ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS frais_autres DECIMAL(12,2) DEFAULT 0;`);
    await queryRunner.query(`ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS frais_autres_description TEXT;`);
    await queryRunner.query(`ALTER TABLE bons_transport ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);`);

    // ============================================================
    // 8. bons_location - Add missing columns
    // ============================================================
    await queryRunner.query(`ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS type_tarif type_tarif_location DEFAULT 'JOURNALIER';`);
    await queryRunner.query(`ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS tarif_mensuel DECIMAL(12,2);`);
    await queryRunner.query(`ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS nb_jours_location INTEGER;`);
    await queryRunner.query(`ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS prix_carburant_inclus DECIMAL(12,2);`);
    await queryRunner.query(`ALTER TABLE bons_location ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);`);

    // ============================================================
    // 9. pannes - Add missing column
    // ============================================================
    await queryRunner.query(`ALTER TABLE pannes ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);`);

    // ============================================================
    // 10. approvisionnements_cuves - Add missing columns
    // ============================================================
    await queryRunner.query(`ALTER TABLE approvisionnements_cuves ADD COLUMN IF NOT EXISTS numero_bon VARCHAR(50) UNIQUE;`);
    await queryRunner.query(`ALTER TABLE approvisionnements_cuves ADD COLUMN IF NOT EXISTS fournisseur_autre VARCHAR(200);`);
    await queryRunner.query(`ALTER TABLE approvisionnements_cuves ADD COLUMN IF NOT EXISTS numero_facture VARCHAR(100);`);
    await queryRunner.query(`ALTER TABLE approvisionnements_cuves ADD COLUMN IF NOT EXISTS observations TEXT;`);
    await queryRunner.query(`ALTER TABLE approvisionnements_cuves ADD COLUMN IF NOT EXISTS niveau_avant_litres DECIMAL(10,2);`);
    await queryRunner.query(`ALTER TABLE approvisionnements_cuves ADD COLUMN IF NOT EXISTS niveau_apres_litres DECIMAL(10,2);`);

    // ============================================================
    // 11. catalogue_pneus - Add missing columns
    // ============================================================
    await queryRunner.query(`ALTER TABLE catalogue_pneus ADD COLUMN IF NOT EXISTS type_usage VARCHAR(50);`);
    await queryRunner.query(`ALTER TABLE catalogue_pneus ADD COLUMN IF NOT EXISTS duree_vie_km INTEGER;`);
    await queryRunner.query(`ALTER TABLE catalogue_pneus ADD COLUMN IF NOT EXISTS profondeur_initiale_mm DECIMAL(4,2);`);

    // ============================================================
    // 12. caisses - DROP and RECREATE (major differences: missing type, solde_initial; has code/devise that entity doesn't use)
    // ============================================================
    await queryRunner.query(`DROP TABLE IF EXISTS mouvements_caisse CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS caisses CASCADE;`);

    await queryRunner.query(`
      CREATE TABLE caisses (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        type type_caisse DEFAULT 'CENTRALE',
        solde_initial DECIMAL(15,2) DEFAULT 0,
        solde_actuel DECIMAL(15,2) DEFAULT 0,
        actif BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 13. mouvements_caisse - RECREATE (completely different schema)
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE mouvements_caisse (
        id SERIAL PRIMARY KEY,
        caisse_id INTEGER NOT NULL REFERENCES caisses(id),
        type type_mouvement_caisse NOT NULL,
        nature VARCHAR(255) NOT NULL,
        montant DECIMAL(15,2) NOT NULL,
        beneficiaire VARCHAR(200),
        mode_paiement VARCHAR(50),
        numero_reference VARCHAR(100),
        caisse_destination_id INTEGER REFERENCES caisses(id),
        date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        reference_externe VARCHAR(100),
        preuve_url VARCHAR(500),
        created_by INTEGER NOT NULL REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 14. maintenances - DROP and RECREATE (completely different schema)
    // ============================================================
    await queryRunner.query(`DROP TABLE IF EXISTS maintenances CASCADE;`);

    await queryRunner.query(`
      CREATE TABLE maintenances (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(50) UNIQUE NOT NULL,
        type_maintenance type_maintenance NOT NULL,
        statut statut_maintenance DEFAULT 'PLANIFIE',
        priorite priorite_maintenance DEFAULT 'NORMALE',
        titre VARCHAR(255) NOT NULL,
        description_travaux TEXT,
        camion_id INTEGER NOT NULL REFERENCES camions(id),
        date_planifiee DATE NOT NULL,
        date_debut TIMESTAMP,
        date_fin TIMESTAMP,
        kilometrage_actuel INTEGER,
        prochain_kilometrage INTEGER,
        cout_pieces DECIMAL(10,2) DEFAULT 0,
        cout_main_oeuvre DECIMAL(10,2) DEFAULT 0,
        cout_externe DECIMAL(10,2) DEFAULT 0,
        pieces_utilisees JSONB,
        technicien_id INTEGER REFERENCES users(id),
        prestataire_externe VARCHAR(255),
        observations TEXT,
        travaux_effectues TEXT,
        panne_id INTEGER,
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_maintenances_camion ON maintenances(camion_id);`);

    // ============================================================
    // 15. mouvements_pieces - DROP and RECREATE (completely different schema)
    // ============================================================
    await queryRunner.query(`DROP TABLE IF EXISTS mouvements_pieces CASCADE;`);

    await queryRunner.query(`
      CREATE TABLE mouvements_pieces (
        id SERIAL PRIMARY KEY,
        numero_mouvement VARCHAR(50) UNIQUE NOT NULL,
        type_mouvement type_mouvement_piece NOT NULL,
        date_mouvement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        piece_id INTEGER NOT NULL REFERENCES catalogue_pieces(id),
        quantite INTEGER NOT NULL,
        etat_piece etat_piece DEFAULT 'NEUVE',
        camion_source_id INTEGER REFERENCES camions(id),
        camion_destination_id INTEGER REFERENCES camions(id),
        kilometrage_source INTEGER,
        kilometrage_destination INTEGER,
        sortie_stock_id INTEGER,
        maintenance_id INTEGER,
        motif VARCHAR(255),
        description TEXT,
        cout DECIMAL(12,2) DEFAULT 0,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 16. gps_position_history - DROP and RECREATE (column names diverged)
    // ============================================================
    await queryRunner.query(`DROP TABLE IF EXISTS gps_position_history CASCADE;`);

    await queryRunner.query(`
      CREATE TABLE gps_position_history (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER NOT NULL REFERENCES trackers_gps(id) ON DELETE CASCADE,
        lat DECIMAL(10,8) NOT NULL,
        lng DECIMAL(11,8) NOT NULL,
        vitesse INTEGER,
        cap INTEGER,
        altitude INTEGER,
        mileage DECIMAL(10,2),
        en_ligne BOOLEAN DEFAULT true,
        timestamp TIMESTAMP NOT NULL,
        point_type INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_gps_pos_tracker_ts ON gps_position_history(tracker_id, timestamp);`);
    await queryRunner.query(`CREATE INDEX idx_gps_pos_ts ON gps_position_history(timestamp);`);

    // ============================================================
    // 17. gps_geofences - DROP and RECREATE (completely different structure)
    // ============================================================
    await queryRunner.query(`DROP TABLE IF EXISTS gps_alerts CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS gps_geofences CASCADE;`);

    await queryRunner.query(`
      CREATE TABLE gps_geofences (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        description TEXT,
        type geofence_type DEFAULT 'circle',
        center_lat DECIMAL(10,8),
        center_lng DECIMAL(11,8),
        radius INTEGER,
        coordinates JSONB,
        alert_type geofence_alert_type DEFAULT 'both',
        actif BOOLEAN DEFAULT true,
        external_id INTEGER,
        couleur VARCHAR(20) DEFAULT '#FF5722',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Join table for geofence <-> tracker many-to-many
    await queryRunner.query(`
      CREATE TABLE gps_geofence_trackers (
        geofence_id INTEGER NOT NULL REFERENCES gps_geofences(id) ON DELETE CASCADE,
        tracker_id INTEGER NOT NULL REFERENCES trackers_gps(id) ON DELETE CASCADE,
        PRIMARY KEY (geofence_id, tracker_id)
      );
    `);

    // ============================================================
    // 18. gps_alerts - RECREATE (completely different structure)
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE gps_alerts (
        id SERIAL PRIMARY KEY,
        tracker_id INTEGER REFERENCES trackers_gps(id) ON DELETE SET NULL,
        camion_id INTEGER REFERENCES camions(id) ON DELETE SET NULL,
        geofence_id INTEGER REFERENCES gps_geofences(id) ON DELETE SET NULL,
        type gps_alert_type NOT NULL,
        severity gps_alert_severity DEFAULT 'medium',
        status gps_alert_status DEFAULT 'new',
        message VARCHAR(255) NOT NULL,
        details TEXT,
        lat DECIMAL(10,8),
        lng DECIMAL(11,8),
        speed_recorded INTEGER,
        speed_limit INTEGER,
        external_id INTEGER,
        alert_time TIMESTAMP NOT NULL,
        acknowledged_at TIMESTAMP,
        acknowledged_by VARCHAR(255),
        resolved_at TIMESTAMP,
        resolved_by VARCHAR(255),
        resolution TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_gps_alerts_time ON gps_alerts(alert_time);`);

    // ============================================================
    // 19. stock_pneumatiques - DROP and RECREATE (completely different)
    // ============================================================
    await queryRunner.query(`DROP TABLE IF EXISTS controles_pneumatiques CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_pneumatiques CASCADE;`);

    await queryRunner.query(`
      CREATE TABLE stock_pneumatiques (
        id SERIAL PRIMARY KEY,
        catalogue_id INTEGER REFERENCES catalogue_pneus(id),
        numero_serie VARCHAR(50) UNIQUE NOT NULL,
        date_achat DATE,
        fournisseur_id INTEGER REFERENCES fournisseurs(id),
        statut VARCHAR(20) DEFAULT 'NEUF',
        camion_id INTEGER REFERENCES camions(id),
        position_actuelle VARCHAR(20),
        km_installation INTEGER,
        km_actuel INTEGER,
        profondeur_actuelle_mm DECIMAL(4,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 20. controles_pneumatiques - RECREATE (different structure)
    // ============================================================
    await queryRunner.query(`
      CREATE TABLE controles_pneumatiques (
        id SERIAL PRIMARY KEY,
        pneu_id INTEGER NOT NULL REFERENCES stock_pneumatiques(id),
        date_controle DATE NOT NULL,
        kilometrage INTEGER,
        profondeur_mesuree_mm DECIMAL(4,2),
        pression_bar DECIMAL(4,2),
        etat_visuel VARCHAR(20),
        observations TEXT,
        controleur_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 21. fichiers - DROP and RECREATE (column name mismatches)
    // ============================================================
    await queryRunner.query(`DROP TABLE IF EXISTS fichiers CASCADE;`);

    await queryRunner.query(`
      CREATE TABLE fichiers (
        id SERIAL PRIMARY KEY,
        nom_original VARCHAR(255) NOT NULL,
        nom_stockage VARCHAR(255) NOT NULL,
        chemin VARCHAR(500) NOT NULL,
        type_mime VARCHAR(100),
        type_fichier VARCHAR(20),
        categorie VARCHAR(50),
        taille INTEGER,
        entite_type VARCHAR(50),
        entite_id INTEGER,
        description TEXT,
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 22. notifications - DROP and RECREATE (different enum, structure)
    // ============================================================
    await queryRunner.query(`DROP TABLE IF EXISTS preferences_notifications CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS notifications CASCADE;`);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        type notification_type DEFAULT 'ALERT',
        titre VARCHAR(255) NOT NULL,
        message TEXT,
        user_id INTEGER REFERENCES users(id),
        target_role role_utilisateur,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        lue BOOLEAN DEFAULT false,
        lue_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_notif_user ON notifications(user_id);`);
    await queryRunner.query(`CREATE INDEX idx_notif_lue ON notifications(lue) WHERE lue = false;`);

    // Recreate preferences_notifications without the old enum dependency
    await queryRunner.query(`
      CREATE TABLE preferences_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type_notification VARCHAR(50) NOT NULL,
        canal VARCHAR(20) NOT NULL,
        actif BOOLEAN DEFAULT true,
        UNIQUE(user_id, type_notification, canal)
      );
    `);

    // ============================================================
    // 23. Update planification_maintenance to use new type_maintenance enum
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE planification_maintenance
        ALTER COLUMN type_maintenance TYPE type_maintenance
        USING 'AUTRE'::type_maintenance;
    `);

    // Update historique_maintenance to use new type_maintenance enum
    await queryRunner.query(`
      ALTER TABLE historique_maintenance
        ALTER COLUMN type_maintenance TYPE type_maintenance
        USING 'AUTRE'::type_maintenance;
    `);

    // Clean up old enum
    await queryRunner.query(`DROP TYPE IF EXISTS type_maintenance_old;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration is not easily reversible due to data loss from DROP/RECREATE.
    // For rollback, restore from backup or re-run migration 000001.
    console.warn('Migration 000002 down: Manual restore required');
  }
}
