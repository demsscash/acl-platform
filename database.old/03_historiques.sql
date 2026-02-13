-- ============================================================
-- ACL LOGISTICS - SCHÉMA COMPLÉMENTAIRE
-- Historiques, Traçabilité & Améliorations
-- Version 2.0 - Janvier 2026
-- ============================================================

-- ============================================================
-- PARTIE 1: HISTORIQUE DES AFFECTATIONS CHAUFFEURS ↔ CAMIONS
-- ============================================================

-- Types supplémentaires
CREATE TYPE motif_fin_affectation AS ENUM (
    'REASSIGNATION',      -- Changement de camion
    'CONGE',              -- Départ en congé
    'DEMISSION',          -- Démission du chauffeur
    'LICENCIEMENT',       -- Fin de contrat
    'MALADIE',            -- Arrêt maladie
    'CAMION_MAINTENANCE', -- Camion en maintenance longue
    'CAMION_REFORME',     -- Camion réformé
    'AUTRE'
);

-- Historique des affectations chauffeur ↔ camion
CREATE TABLE historique_affectations (
    id SERIAL PRIMARY KEY,
    chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id),
    camion_id INTEGER NOT NULL REFERENCES camions(id),
    date_debut DATE NOT NULL,
    date_fin DATE,
    motif_fin motif_fin_affectation,
    commentaire TEXT,
    km_debut INTEGER,           -- Kilométrage au début de l'affectation
    km_fin INTEGER,             -- Kilométrage à la fin
    nb_missions INTEGER DEFAULT 0,
    nb_incidents INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hist_affect_chauffeur ON historique_affectations(chauffeur_id);
CREATE INDEX idx_hist_affect_camion ON historique_affectations(camion_id);
CREATE INDEX idx_hist_affect_dates ON historique_affectations(date_debut, date_fin);

-- ============================================================
-- PARTIE 2: MISSIONS / VOYAGES DÉTAILLÉS
-- ============================================================

CREATE TYPE statut_mission AS ENUM (
    'PLANIFIEE',      -- Mission planifiée
    'EN_PREPARATION', -- Chargement en cours
    'EN_ROUTE',       -- En déplacement
    'LIVRAISON',      -- Déchargement en cours
    'TERMINEE',       -- Mission terminée
    'ANNULEE',        -- Mission annulée
    'INCIDENT'        -- Mission avec incident
);

CREATE TYPE type_mission AS ENUM (
    'TRANSPORT_MARCHANDISE',
    'TRANSPORT_MATERIEL',
    'LOCATION_COURTE',
    'LOCATION_LONGUE',
    'TRANSFERT_INTERNE',
    'RETOUR_VIDE'
);

-- Table principale des missions/voyages
CREATE TABLE missions (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,  -- Ex: MIS-2026-00001
    type_mission type_mission NOT NULL,
    statut statut_mission DEFAULT 'PLANIFIEE',

    -- Références
    bon_transport_id INTEGER REFERENCES bons_transport(id),
    bon_location_id INTEGER REFERENCES bons_location(id),
    client_id INTEGER REFERENCES clients(id),
    camion_id INTEGER NOT NULL REFERENCES camions(id),
    chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id),

    -- Planification
    date_planifiee DATE NOT NULL,
    heure_depart_prevue TIME,
    heure_arrivee_prevue TIME,

    -- Exécution réelle
    date_depart_reel TIMESTAMP,
    date_arrivee_reel TIMESTAMP,

    -- Itinéraire
    lieu_depart TEXT NOT NULL,
    lieu_arrivee TEXT NOT NULL,
    etapes JSONB,  -- [{ordre: 1, lieu: "...", heure_prevue: "...", heure_reelle: "..."}]
    distance_prevue_km INTEGER,
    distance_reelle_km INTEGER,

    -- Kilométrage camion
    km_depart INTEGER,
    km_arrivee INTEGER,

    -- Chargement
    nature_chargement TEXT,
    poids_kg DECIMAL(10,2),
    volume_m3 DECIMAL(10,2),
    nb_colis INTEGER,
    references_marchandise TEXT,

    -- Notes
    instructions_speciales TEXT,
    notes_chauffeur TEXT,
    notes_coordinateur TEXT,

    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_missions_camion ON missions(camion_id);
CREATE INDEX idx_missions_chauffeur ON missions(chauffeur_id);
CREATE INDEX idx_missions_date ON missions(date_planifiee);
CREATE INDEX idx_missions_statut ON missions(statut);
CREATE INDEX idx_missions_client ON missions(client_id);

-- ============================================================
-- PARTIE 3: COÛTS DÉTAILLÉS PAR MISSION
-- ============================================================

CREATE TYPE type_cout_mission AS ENUM (
    'CARBURANT',
    'PEAGE',
    'PARKING',
    'HEBERGEMENT',
    'REPAS',
    'REPARATION_URGENTE',
    'AMENDE',
    'MANUTENTION',
    'FRAIS_DOUANE',
    'ASSURANCE_VOYAGE',
    'AUTRE'
);

-- Coûts détaillés par mission
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

CREATE INDEX idx_couts_mission ON couts_mission(mission_id);
CREATE INDEX idx_couts_type ON couts_mission(type_cout);

-- Récapitulatif financier par mission
CREATE TABLE bilan_financier_mission (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER UNIQUE NOT NULL REFERENCES missions(id),

    -- Revenus
    montant_facture DECIMAL(15,2) DEFAULT 0,
    montant_supplements DECIMAL(15,2) DEFAULT 0,
    montant_penalites DECIMAL(15,2) DEFAULT 0,  -- Pénalités appliquées au client
    total_revenus DECIMAL(15,2) GENERATED ALWAYS AS (
        montant_facture + montant_supplements - montant_penalites
    ) STORED,

    -- Coûts
    cout_carburant DECIMAL(15,2) DEFAULT 0,
    cout_peages DECIMAL(15,2) DEFAULT 0,
    cout_autres DECIMAL(15,2) DEFAULT 0,
    cout_maintenance DECIMAL(15,2) DEFAULT 0,  -- Si réparation pendant mission
    total_couts DECIMAL(15,2) GENERATED ALWAYS AS (
        cout_carburant + cout_peages + cout_autres + cout_maintenance
    ) STORED,

    -- Marge
    marge_brute DECIMAL(15,2) GENERATED ALWAYS AS (
        (montant_facture + montant_supplements - montant_penalites) -
        (cout_carburant + cout_peages + cout_autres + cout_maintenance)
    ) STORED,

    -- Indicateurs
    cout_par_km DECIMAL(10,2),
    rentabilite_pourcent DECIMAL(5,2),

    calculé_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PARTIE 4: JOURNAL D'ÉVÉNEMENTS CAMION
-- ============================================================

CREATE TYPE type_evenement_camion AS ENUM (
    'MISE_EN_SERVICE',
    'AFFECTATION_CHAUFFEUR',
    'DEBUT_MISSION',
    'FIN_MISSION',
    'MAINTENANCE_PREVENTIVE',
    'REPARATION',
    'INCIDENT',
    'ACCIDENT',
    'PANNE',
    'CONTROLE_TECHNIQUE',
    'RENOUVELLEMENT_ASSURANCE',
    'RENOUVELLEMENT_DOCUMENT',
    'MODIFICATION_TECHNIQUE',
    'CHANGEMENT_PNEUMATIQUE',
    'PLEIN_CARBURANT',
    'MISE_EN_MAINTENANCE',
    'REMISE_EN_SERVICE',
    'MISE_HORS_SERVICE',
    'REFORME',
    'AUTRE'
);

CREATE TYPE gravite_evenement AS ENUM ('INFO', 'MINEUR', 'MODERE', 'MAJEUR', 'CRITIQUE');

-- Journal complet des événements par camion
CREATE TABLE journal_evenements_camion (
    id SERIAL PRIMARY KEY,
    camion_id INTEGER NOT NULL REFERENCES camions(id),
    type_evenement type_evenement_camion NOT NULL,
    gravite gravite_evenement DEFAULT 'INFO',
    date_evenement TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Contexte
    kilometrage INTEGER,
    lieu VARCHAR(200),
    mission_id INTEGER REFERENCES missions(id),
    chauffeur_id INTEGER REFERENCES chauffeurs(id),

    -- Détails
    titre VARCHAR(200) NOT NULL,
    description TEXT,
    actions_prises TEXT,

    -- Coûts éventuels
    cout_estime DECIMAL(15,2),
    cout_reel DECIMAL(15,2),

    -- Suivi
    necessite_suivi BOOLEAN DEFAULT false,
    date_suivi_prevu DATE,
    suivi_effectue BOOLEAN DEFAULT false,

    -- Références
    reference_externe VARCHAR(100),  -- N° PV, N° sinistre, etc.

    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_journal_camion ON journal_evenements_camion(camion_id);
CREATE INDEX idx_journal_type ON journal_evenements_camion(type_evenement);
CREATE INDEX idx_journal_date ON journal_evenements_camion(date_evenement);
CREATE INDEX idx_journal_gravite ON journal_evenements_camion(gravite);

-- ============================================================
-- PARTIE 5: INCIDENTS ET ACCIDENTS
-- ============================================================

CREATE TYPE type_incident AS ENUM (
    'PANNE_MECANIQUE',
    'PANNE_ELECTRIQUE',
    'CREVAISON',
    'ACCIDENT_CIRCULATION',
    'ACCIDENT_CHARGEMENT',
    'VOL',
    'AGRESSION',
    'RETARD_IMPORTANT',
    'MARCHANDISE_ENDOMMAGEE',
    'PROBLEME_DOUANE',
    'METEO_DEFAVORABLE',
    'ROUTE_IMPRATICABLE',
    'AUTRE'
);

CREATE TYPE statut_incident AS ENUM (
    'DECLARE',
    'EN_COURS_TRAITEMENT',
    'EN_ATTENTE_PIECES',
    'EN_ATTENTE_ASSURANCE',
    'RESOLU',
    'CLOS'
);

-- Table des incidents
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,  -- INC-2026-00001
    type_incident type_incident NOT NULL,
    statut statut_incident DEFAULT 'DECLARE',
    gravite gravite_evenement NOT NULL,

    -- Contexte
    date_incident TIMESTAMP NOT NULL,
    lieu_incident TEXT NOT NULL,
    coordonnees_gps VARCHAR(50),  -- "14.7167,-17.4677"

    -- Véhicule et personnel
    camion_id INTEGER NOT NULL REFERENCES camions(id),
    chauffeur_id INTEGER REFERENCES chauffeurs(id),
    mission_id INTEGER REFERENCES missions(id),
    kilometrage INTEGER,

    -- Description
    description TEXT NOT NULL,
    circonstances TEXT,
    temoins TEXT,

    -- Dommages
    dommages_vehicule TEXT,
    dommages_marchandise TEXT,
    dommages_tiers TEXT,
    blesses BOOLEAN DEFAULT false,
    nb_blesses INTEGER DEFAULT 0,
    details_blesses TEXT,

    -- Assurance
    declaration_assurance BOOLEAN DEFAULT false,
    numero_sinistre VARCHAR(100),
    date_declaration_assurance DATE,

    -- Police/Constat
    intervention_police BOOLEAN DEFAULT false,
    numero_pv VARCHAR(100),
    constat_amiable BOOLEAN DEFAULT false,

    -- Résolution
    actions_immediates TEXT,
    actions_correctives TEXT,
    date_resolution DATE,

    -- Coûts
    cout_reparation_vehicule DECIMAL(15,2),
    cout_reparation_tiers DECIMAL(15,2),
    cout_marchandise DECIMAL(15,2),
    franchise_assurance DECIMAL(15,2),
    remboursement_assurance DECIMAL(15,2),
    cout_total_net DECIMAL(15,2),

    -- Responsabilité
    responsabilite_chauffeur BOOLEAN,
    pourcentage_responsabilite INTEGER,  -- 0 à 100

    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incidents_camion ON incidents(camion_id);
CREATE INDEX idx_incidents_chauffeur ON incidents(chauffeur_id);
CREATE INDEX idx_incidents_date ON incidents(date_incident);
CREATE INDEX idx_incidents_statut ON incidents(statut);
CREATE INDEX idx_incidents_type ON incidents(type_incident);

-- ============================================================
-- PARTIE 6: HISTORIQUE ET PERFORMANCE CHAUFFEURS
-- ============================================================

-- Statistiques mensuelles par chauffeur
CREATE TABLE statistiques_chauffeur_mensuel (
    id SERIAL PRIMARY KEY,
    chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id),
    annee INTEGER NOT NULL,
    mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),

    -- Activité
    nb_missions INTEGER DEFAULT 0,
    nb_missions_terminees INTEGER DEFAULT 0,
    nb_missions_annulees INTEGER DEFAULT 0,
    nb_jours_travailles INTEGER DEFAULT 0,

    -- Distances
    km_parcourus INTEGER DEFAULT 0,

    -- Temps
    heures_conduite DECIMAL(10,2) DEFAULT 0,
    heures_attente DECIMAL(10,2) DEFAULT 0,

    -- Carburant
    litres_consommes DECIMAL(10,2) DEFAULT 0,
    consommation_moyenne DECIMAL(5,2),  -- L/100km

    -- Qualité
    nb_incidents INTEGER DEFAULT 0,
    nb_retards INTEGER DEFAULT 0,
    nb_reclamations_client INTEGER DEFAULT 0,
    note_moyenne_client DECIMAL(3,2),  -- Sur 5

    -- Coûts générés
    total_carburant DECIMAL(15,2) DEFAULT 0,
    total_peages DECIMAL(15,2) DEFAULT 0,
    total_frais DECIMAL(15,2) DEFAULT 0,
    total_amendes DECIMAL(15,2) DEFAULT 0,

    -- Score performance (calculé)
    score_performance INTEGER,  -- 0 à 100

    calculé_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(chauffeur_id, annee, mois)
);

CREATE INDEX idx_stats_chauffeur ON statistiques_chauffeur_mensuel(chauffeur_id);
CREATE INDEX idx_stats_periode ON statistiques_chauffeur_mensuel(annee, mois);

-- Évaluations des chauffeurs
CREATE TABLE evaluations_chauffeur (
    id SERIAL PRIMARY KEY,
    chauffeur_id INTEGER NOT NULL REFERENCES chauffeurs(id),
    evaluateur_id INTEGER NOT NULL REFERENCES users(id),
    date_evaluation DATE NOT NULL,
    periode_debut DATE NOT NULL,
    periode_fin DATE NOT NULL,

    -- Notes sur 5
    note_ponctualite DECIMAL(3,2),
    note_conduite DECIMAL(3,2),
    note_entretien_vehicule DECIMAL(3,2),
    note_relation_client DECIMAL(3,2),
    note_respect_consignes DECIMAL(3,2),
    note_globale DECIMAL(3,2),

    -- Commentaires
    points_forts TEXT,
    points_amelioration TEXT,
    objectifs TEXT,
    commentaire_general TEXT,

    -- Validation
    valide_par_direction BOOLEAN DEFAULT false,
    date_validation DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PARTIE 7: STATISTIQUES CAMIONS
-- ============================================================

-- Statistiques mensuelles par camion
CREATE TABLE statistiques_camion_mensuel (
    id SERIAL PRIMARY KEY,
    camion_id INTEGER NOT NULL REFERENCES camions(id),
    annee INTEGER NOT NULL,
    mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),

    -- Utilisation
    nb_missions INTEGER DEFAULT 0,
    nb_jours_en_mission INTEGER DEFAULT 0,
    nb_jours_maintenance INTEGER DEFAULT 0,
    nb_jours_disponible INTEGER DEFAULT 0,
    taux_utilisation DECIMAL(5,2),  -- Pourcentage

    -- Distances
    km_debut_mois INTEGER,
    km_fin_mois INTEGER,
    km_parcourus INTEGER DEFAULT 0,

    -- Carburant
    litres_consommes DECIMAL(10,2) DEFAULT 0,
    cout_carburant DECIMAL(15,2) DEFAULT 0,
    consommation_moyenne DECIMAL(5,2),  -- L/100km

    -- Maintenance
    cout_pieces DECIMAL(15,2) DEFAULT 0,
    cout_main_oeuvre DECIMAL(15,2) DEFAULT 0,
    cout_pneus DECIMAL(15,2) DEFAULT 0,
    nb_interventions INTEGER DEFAULT 0,

    -- Incidents
    nb_pannes INTEGER DEFAULT 0,
    nb_accidents INTEGER DEFAULT 0,
    cout_incidents DECIMAL(15,2) DEFAULT 0,

    -- Revenus
    revenus_transport DECIMAL(15,2) DEFAULT 0,
    revenus_location DECIMAL(15,2) DEFAULT 0,

    -- Rentabilité
    total_couts DECIMAL(15,2) GENERATED ALWAYS AS (
        cout_carburant + cout_pieces + cout_main_oeuvre + cout_pneus + cout_incidents
    ) STORED,
    total_revenus DECIMAL(15,2) GENERATED ALWAYS AS (
        revenus_transport + revenus_location
    ) STORED,
    marge_brute DECIMAL(15,2),
    cout_par_km DECIMAL(10,2),

    calculé_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(camion_id, annee, mois)
);

CREATE INDEX idx_stats_camion ON statistiques_camion_mensuel(camion_id);
CREATE INDEX idx_stats_camion_periode ON statistiques_camion_mensuel(annee, mois);

-- ============================================================
-- PARTIE 8: PLANIFICATION MAINTENANCE
-- ============================================================

CREATE TYPE type_maintenance AS ENUM (
    'VIDANGE',
    'REVISION_MINEURE',
    'REVISION_MAJEURE',
    'CONTROLE_TECHNIQUE',
    'CONTROLE_FREINS',
    'CONTROLE_PNEUS',
    'GEOMETRIE',
    'CLIMATISATION',
    'AUTRE'
);

CREATE TYPE periodicite_maintenance AS ENUM (
    'KM',      -- Basé sur kilométrage
    'JOURS',   -- Basé sur le temps
    'MIXTE'    -- Le premier des deux
);

-- Planification des maintenances
CREATE TABLE planification_maintenance (
    id SERIAL PRIMARY KEY,
    camion_id INTEGER NOT NULL REFERENCES camions(id),
    type_maintenance type_maintenance NOT NULL,
    libelle VARCHAR(200) NOT NULL,
    description TEXT,

    -- Périodicité
    periodicite periodicite_maintenance NOT NULL,
    intervalle_km INTEGER,           -- Tous les X km
    intervalle_jours INTEGER,        -- Tous les X jours

    -- Dernière exécution
    derniere_execution_date DATE,
    derniere_execution_km INTEGER,

    -- Prochaine échéance
    prochaine_echeance_date DATE,
    prochaine_echeance_km INTEGER,

    -- Alertes
    alerte_jours_avant INTEGER DEFAULT 7,
    alerte_km_avant INTEGER DEFAULT 1000,

    -- Estimation
    duree_estimee_heures DECIMAL(4,2),
    cout_estime DECIMAL(15,2),

    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historique des maintenances
CREATE TABLE historique_maintenance (
    id SERIAL PRIMARY KEY,
    planification_id INTEGER REFERENCES planification_maintenance(id),
    camion_id INTEGER NOT NULL REFERENCES camions(id),
    type_maintenance type_maintenance NOT NULL,

    -- Exécution
    date_debut TIMESTAMP NOT NULL,
    date_fin TIMESTAMP,
    kilometrage INTEGER NOT NULL,
    lieu VARCHAR(200),  -- Atelier interne ou externe
    prestataire VARCHAR(200),

    -- Travaux
    description_travaux TEXT,
    pieces_utilisees JSONB,  -- [{piece_id, quantite, prix}]
    observations TEXT,

    -- Coûts
    cout_pieces DECIMAL(15,2) DEFAULT 0,
    cout_main_oeuvre DECIMAL(15,2) DEFAULT 0,
    cout_externe DECIMAL(15,2) DEFAULT 0,
    cout_total DECIMAL(15,2) GENERATED ALWAYS AS (
        cout_pieces + cout_main_oeuvre + cout_externe
    ) STORED,

    -- Validation
    technicien VARCHAR(100),
    valide_par INTEGER REFERENCES users(id),

    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hist_maint_camion ON historique_maintenance(camion_id);
CREATE INDEX idx_hist_maint_date ON historique_maintenance(date_debut);

-- ============================================================
-- PARTIE 9: ITINÉRAIRES ET ROUTES FRÉQUENTES
-- ============================================================

-- Routes fréquentes (pour optimisation et estimation)
CREATE TABLE routes_frequentes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(200) NOT NULL,

    -- Points
    depart_ville VARCHAR(100) NOT NULL,
    depart_pays VARCHAR(100) DEFAULT 'Sénégal',
    arrivee_ville VARCHAR(100) NOT NULL,
    arrivee_pays VARCHAR(100) DEFAULT 'Sénégal',

    -- Distance et temps
    distance_km INTEGER NOT NULL,
    duree_estimee_heures DECIMAL(5,2),

    -- Coûts estimés
    peages_estimes DECIMAL(10,2) DEFAULT 0,
    carburant_estime_litres DECIMAL(10,2),

    -- Infos pratiques
    points_passage TEXT,  -- Villes intermédiaires
    zones_risque TEXT,    -- Zones à éviter ou dangereuses
    notes TEXT,

    -- Statistiques
    nb_fois_utilisee INTEGER DEFAULT 0,
    derniere_utilisation DATE,

    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PARTIE 10: SATISFACTION CLIENT
-- ============================================================

-- Évaluations par les clients
CREATE TABLE evaluations_client (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER NOT NULL REFERENCES missions(id),
    client_id INTEGER NOT NULL REFERENCES clients(id),
    date_evaluation DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Notes sur 5
    note_ponctualite INTEGER CHECK (note_ponctualite BETWEEN 1 AND 5),
    note_etat_marchandise INTEGER CHECK (note_etat_marchandise BETWEEN 1 AND 5),
    note_comportement_chauffeur INTEGER CHECK (note_comportement_chauffeur BETWEEN 1 AND 5),
    note_communication INTEGER CHECK (note_communication BETWEEN 1 AND 5),
    note_globale INTEGER CHECK (note_globale BETWEEN 1 AND 5),

    -- Commentaires
    points_positifs TEXT,
    points_negatifs TEXT,
    suggestions TEXT,

    -- Recommandation
    recommanderait BOOLEAN,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eval_client_mission ON evaluations_client(mission_id);
CREATE INDEX idx_eval_client_client ON evaluations_client(client_id);

-- Réclamations clients
CREATE TABLE reclamations_client (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,
    mission_id INTEGER REFERENCES missions(id),
    client_id INTEGER NOT NULL REFERENCES clients(id),
    date_reclamation DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Objet
    type_reclamation VARCHAR(50) NOT NULL,  -- RETARD, DOMMAGE, COMPORTEMENT, FACTURATION, AUTRE
    objet VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    -- Traitement
    statut VARCHAR(30) DEFAULT 'OUVERTE',  -- OUVERTE, EN_COURS, RESOLUE, REJETEE
    priorite VARCHAR(20) DEFAULT 'NORMALE',  -- BASSE, NORMALE, HAUTE, URGENTE
    assigne_a INTEGER REFERENCES users(id),

    -- Résolution
    date_resolution DATE,
    resolution TEXT,
    compensation_accordee DECIMAL(15,2),

    -- Suivi
    satisfaction_resolution INTEGER CHECK (satisfaction_resolution BETWEEN 1 AND 5),

    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PARTIE 11: TABLEAU DE BORD ET KPIs
-- ============================================================

-- KPIs globaux (calculés quotidiennement)
CREATE TABLE kpis_quotidiens (
    id SERIAL PRIMARY KEY,
    date_kpi DATE UNIQUE NOT NULL,

    -- Flotte
    nb_camions_total INTEGER,
    nb_camions_disponibles INTEGER,
    nb_camions_en_mission INTEGER,
    nb_camions_maintenance INTEGER,
    taux_disponibilite DECIMAL(5,2),

    -- Missions
    nb_missions_jour INTEGER,
    nb_missions_terminees INTEGER,
    nb_missions_en_cours INTEGER,
    nb_retards INTEGER,
    taux_ponctualite DECIMAL(5,2),

    -- Carburant
    litres_consommes DECIMAL(12,2),
    cout_carburant DECIMAL(15,2),
    niveau_cuves_pourcent DECIMAL(5,2),

    -- Alertes
    nb_alertes_critiques INTEGER,
    nb_alertes_warning INTEGER,
    nb_documents_expirant_30j INTEGER,

    -- Financier
    revenus_jour DECIMAL(15,2),
    couts_jour DECIMAL(15,2),
    marge_jour DECIMAL(15,2),

    -- Satisfaction
    note_moyenne_clients DECIMAL(3,2),
    nb_reclamations_ouvertes INTEGER,

    calculé_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kpis_date ON kpis_quotidiens(date_kpi);

-- ============================================================
-- PARTIE 12: NOTIFICATIONS ET ALERTES AVANCÉES
-- ============================================================

CREATE TYPE type_notification AS ENUM (
    'ALERTE_PIECE',
    'ALERTE_PNEU',
    'ALERTE_CARBURANT',
    'ALERTE_DOCUMENT',
    'ALERTE_MAINTENANCE',
    'MISSION_ASSIGNEE',
    'MISSION_TERMINEE',
    'INCIDENT_DECLARE',
    'RECLAMATION',
    'STOCK_BAS',
    'SYSTEME'
);

CREATE TYPE canal_notification AS ENUM (
    'APP',       -- Notification in-app
    'EMAIL',
    'SMS',
    'WHATSAPP'
);

-- Configuration des notifications par utilisateur
CREATE TABLE preferences_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type_notification type_notification NOT NULL,
    canal canal_notification NOT NULL,
    actif BOOLEAN DEFAULT true,
    UNIQUE(user_id, type_notification, canal)
);

-- Historique des notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    type_notification type_notification NOT NULL,
    canal canal_notification NOT NULL,

    titre VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    lien VARCHAR(500),  -- Lien vers la ressource concernée

    -- Statut
    envoyee BOOLEAN DEFAULT false,
    envoyee_at TIMESTAMP,
    lue BOOLEAN DEFAULT false,
    lue_at TIMESTAMP,

    -- Référence
    reference_type VARCHAR(50),  -- 'camion', 'mission', 'incident'...
    reference_id INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notif_user ON notifications(user_id);
CREATE INDEX idx_notif_lue ON notifications(lue) WHERE lue = false;

-- ============================================================
-- PARTIE 13: VUES POUR HISTORIQUES
-- ============================================================

-- Vue historique complet d'un camion
CREATE OR REPLACE VIEW v_historique_complet_camion AS
SELECT
    c.id AS camion_id,
    c.immatriculation,
    'EVENEMENT' AS type_enregistrement,
    jec.date_evenement AS date_record,
    jec.type_evenement::TEXT AS sous_type,
    jec.titre AS description,
    jec.kilometrage,
    jec.cout_reel AS montant,
    jec.chauffeur_id,
    ch.nom || ' ' || ch.prenom AS chauffeur_nom
FROM camions c
JOIN journal_evenements_camion jec ON jec.camion_id = c.id
LEFT JOIN chauffeurs ch ON jec.chauffeur_id = ch.id

UNION ALL

SELECT
    c.id AS camion_id,
    c.immatriculation,
    'MISSION' AS type_enregistrement,
    m.date_depart_reel AS date_record,
    m.type_mission::TEXT AS sous_type,
    m.numero || ' - ' || m.lieu_depart || ' → ' || m.lieu_arrivee AS description,
    m.km_arrivee AS kilometrage,
    bfm.total_revenus AS montant,
    m.chauffeur_id,
    ch.nom || ' ' || ch.prenom AS chauffeur_nom
FROM camions c
JOIN missions m ON m.camion_id = c.id
LEFT JOIN bilan_financier_mission bfm ON bfm.mission_id = m.id
LEFT JOIN chauffeurs ch ON m.chauffeur_id = ch.id

UNION ALL

SELECT
    c.id AS camion_id,
    c.immatriculation,
    'MAINTENANCE' AS type_enregistrement,
    hm.date_debut AS date_record,
    hm.type_maintenance::TEXT AS sous_type,
    hm.description_travaux AS description,
    hm.kilometrage,
    hm.cout_total AS montant,
    NULL AS chauffeur_id,
    NULL AS chauffeur_nom
FROM camions c
JOIN historique_maintenance hm ON hm.camion_id = c.id

UNION ALL

SELECT
    c.id AS camion_id,
    c.immatriculation,
    'INCIDENT' AS type_enregistrement,
    i.date_incident AS date_record,
    i.type_incident::TEXT AS sous_type,
    i.numero || ' - ' || i.description AS description,
    i.kilometrage,
    i.cout_total_net AS montant,
    i.chauffeur_id,
    ch.nom || ' ' || ch.prenom AS chauffeur_nom
FROM camions c
JOIN incidents i ON i.camion_id = c.id
LEFT JOIN chauffeurs ch ON i.chauffeur_id = ch.id

ORDER BY date_record DESC;

-- Vue historique complet d'un chauffeur
CREATE OR REPLACE VIEW v_historique_complet_chauffeur AS
SELECT
    ch.id AS chauffeur_id,
    ch.nom || ' ' || ch.prenom AS chauffeur_nom,
    'MISSION' AS type_enregistrement,
    m.date_depart_reel AS date_record,
    c.immatriculation AS camion,
    m.numero || ' - ' || m.lieu_depart || ' → ' || m.lieu_arrivee AS description,
    m.distance_reelle_km AS km,
    m.statut::TEXT AS statut
FROM chauffeurs ch
JOIN missions m ON m.chauffeur_id = ch.id
JOIN camions c ON m.camion_id = c.id

UNION ALL

SELECT
    ch.id AS chauffeur_id,
    ch.nom || ' ' || ch.prenom AS chauffeur_nom,
    'AFFECTATION' AS type_enregistrement,
    ha.date_debut AS date_record,
    c.immatriculation AS camion,
    CASE
        WHEN ha.date_fin IS NULL THEN 'Affectation en cours'
        ELSE 'Affectation du ' || ha.date_debut || ' au ' || ha.date_fin
    END AS description,
    ha.km_fin - ha.km_debut AS km,
    COALESCE(ha.motif_fin::TEXT, 'EN_COURS') AS statut
FROM chauffeurs ch
JOIN historique_affectations ha ON ha.chauffeur_id = ch.id
JOIN camions c ON ha.camion_id = c.id

UNION ALL

SELECT
    ch.id AS chauffeur_id,
    ch.nom || ' ' || ch.prenom AS chauffeur_nom,
    'INCIDENT' AS type_enregistrement,
    i.date_incident AS date_record,
    c.immatriculation AS camion,
    i.numero || ' - ' || i.type_incident::TEXT AS description,
    NULL AS km,
    i.statut::TEXT AS statut
FROM chauffeurs ch
JOIN incidents i ON i.chauffeur_id = ch.id
JOIN camions c ON i.camion_id = c.id

ORDER BY date_record DESC;

-- Vue synthèse performance chauffeur
CREATE OR REPLACE VIEW v_performance_chauffeur AS
SELECT
    ch.id AS chauffeur_id,
    ch.matricule,
    ch.nom || ' ' || ch.prenom AS nom_complet,
    ch.statut,
    c.immatriculation AS camion_actuel,

    -- Stats globales
    (SELECT COUNT(*) FROM missions m WHERE m.chauffeur_id = ch.id) AS total_missions,
    (SELECT COUNT(*) FROM missions m WHERE m.chauffeur_id = ch.id AND m.statut = 'TERMINEE') AS missions_terminees,
    (SELECT SUM(distance_reelle_km) FROM missions m WHERE m.chauffeur_id = ch.id) AS total_km,

    -- Incidents
    (SELECT COUNT(*) FROM incidents i WHERE i.chauffeur_id = ch.id) AS nb_incidents,
    (SELECT COUNT(*) FROM incidents i WHERE i.chauffeur_id = ch.id AND i.responsabilite_chauffeur = true) AS incidents_responsable,

    -- Évaluations
    (SELECT AVG(note_globale) FROM evaluations_chauffeur ec WHERE ec.chauffeur_id = ch.id) AS note_moyenne_evaluations,
    (SELECT AVG(note_globale) FROM evaluations_client ecl
     JOIN missions m ON ecl.mission_id = m.id WHERE m.chauffeur_id = ch.id) AS note_moyenne_clients,

    -- Dernière activité
    (SELECT MAX(date_depart_reel) FROM missions m WHERE m.chauffeur_id = ch.id) AS derniere_mission

FROM chauffeurs ch
LEFT JOIN camions c ON ch.camion_attribue_id = c.id
WHERE ch.actif = true;

-- Vue synthèse rentabilité camion
CREATE OR REPLACE VIEW v_rentabilite_camion AS
SELECT
    c.id AS camion_id,
    c.immatriculation,
    c.marque || ' ' || COALESCE(c.modele, '') AS designation,
    c.kilometrage_actuel,
    c.statut,

    -- Stats missions (12 derniers mois)
    COALESCE(SUM(scm.nb_missions), 0) AS missions_12_mois,
    COALESCE(SUM(scm.km_parcourus), 0) AS km_12_mois,

    -- Revenus
    COALESCE(SUM(scm.revenus_transport + scm.revenus_location), 0) AS revenus_12_mois,

    -- Coûts
    COALESCE(SUM(scm.cout_carburant), 0) AS cout_carburant_12_mois,
    COALESCE(SUM(scm.cout_pieces + scm.cout_main_oeuvre + scm.cout_pneus), 0) AS cout_maintenance_12_mois,
    COALESCE(SUM(scm.cout_incidents), 0) AS cout_incidents_12_mois,

    -- Rentabilité
    COALESCE(SUM(scm.revenus_transport + scm.revenus_location), 0) -
    COALESCE(SUM(scm.cout_carburant + scm.cout_pieces + scm.cout_main_oeuvre + scm.cout_pneus + scm.cout_incidents), 0) AS marge_12_mois,

    -- Taux utilisation moyen
    AVG(scm.taux_utilisation) AS taux_utilisation_moyen,

    -- Consommation moyenne
    CASE
        WHEN SUM(scm.km_parcourus) > 0
        THEN ROUND((SUM(scm.litres_consommes) / SUM(scm.km_parcourus)) * 100, 2)
        ELSE 0
    END AS consommation_moyenne

FROM camions c
LEFT JOIN statistiques_camion_mensuel scm ON scm.camion_id = c.id
    AND (scm.annee * 100 + scm.mois) >= TO_CHAR(CURRENT_DATE - INTERVAL '12 months', 'YYYYMM')::INTEGER
WHERE c.actif = true
GROUP BY c.id, c.immatriculation, c.marque, c.modele, c.kilometrage_actuel, c.statut;

-- ============================================================
-- PARTIE 14: TRIGGERS AUTOMATIQUES
-- ============================================================

-- Trigger pour créer une entrée dans le journal lors d'un changement de statut camion
CREATE OR REPLACE FUNCTION log_changement_statut_camion() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.statut IS DISTINCT FROM NEW.statut THEN
        INSERT INTO journal_evenements_camion (
            camion_id, type_evenement, gravite, date_evenement,
            kilometrage, titre, description, created_by
        ) VALUES (
            NEW.id,
            CASE NEW.statut
                WHEN 'EN_MAINTENANCE' THEN 'MISE_EN_MAINTENANCE'
                WHEN 'DISPONIBLE' THEN 'REMISE_EN_SERVICE'
                WHEN 'HORS_SERVICE' THEN 'MISE_HORS_SERVICE'
                ELSE 'AUTRE'
            END,
            CASE NEW.statut
                WHEN 'HORS_SERVICE' THEN 'MAJEUR'
                WHEN 'EN_MAINTENANCE' THEN 'MODERE'
                ELSE 'INFO'
            END,
            CURRENT_TIMESTAMP,
            NEW.kilometrage_actuel,
            'Changement de statut: ' || OLD.statut || ' → ' || NEW.statut,
            'Changement automatique de statut du véhicule',
            1  -- System user
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_statut_camion
    AFTER UPDATE OF statut ON camions
    FOR EACH ROW EXECUTE FUNCTION log_changement_statut_camion();

-- Trigger pour mettre à jour les stats après une mission
CREATE OR REPLACE FUNCTION update_stats_after_mission() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.statut = 'TERMINEE' AND OLD.statut != 'TERMINEE' THEN
        -- Mettre à jour le compteur de missions dans l'affectation
        UPDATE historique_affectations
        SET nb_missions = nb_missions + 1
        WHERE chauffeur_id = NEW.chauffeur_id
          AND camion_id = NEW.camion_id
          AND date_fin IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stats_mission
    AFTER UPDATE OF statut ON missions
    FOR EACH ROW EXECUTE FUNCTION update_stats_after_mission();

-- Trigger pour enregistrer l'historique d'affectation
CREATE OR REPLACE FUNCTION log_affectation_chauffeur() RETURNS TRIGGER AS $$
BEGIN
    -- Clôturer l'ancienne affectation si changement
    IF OLD.camion_attribue_id IS DISTINCT FROM NEW.camion_attribue_id THEN
        -- Clôturer l'ancienne
        IF OLD.camion_attribue_id IS NOT NULL THEN
            UPDATE historique_affectations
            SET date_fin = CURRENT_DATE,
                motif_fin = 'REASSIGNATION',
                km_fin = (SELECT kilometrage_actuel FROM camions WHERE id = OLD.camion_attribue_id)
            WHERE chauffeur_id = NEW.id
              AND camion_id = OLD.camion_attribue_id
              AND date_fin IS NULL;
        END IF;

        -- Créer la nouvelle
        IF NEW.camion_attribue_id IS NOT NULL THEN
            INSERT INTO historique_affectations (
                chauffeur_id, camion_id, date_debut, km_debut, created_by
            ) VALUES (
                NEW.id,
                NEW.camion_attribue_id,
                CURRENT_DATE,
                (SELECT kilometrage_actuel FROM camions WHERE id = NEW.camion_attribue_id),
                1  -- System user
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_affectation
    AFTER UPDATE OF camion_attribue_id ON chauffeurs
    FOR EACH ROW EXECUTE FUNCTION log_affectation_chauffeur();

-- ============================================================
-- FIN DU SCHÉMA COMPLÉMENTAIRE
-- ============================================================
