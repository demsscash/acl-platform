-- Migration: GPS Real-time Monitoring Tables
-- Date: 2026-01-26
-- Description: Add tables for geofences, position history, and GPS alerts

-- Create enum types
DO $$ BEGIN
    CREATE TYPE geofence_type AS ENUM ('circle', 'polygon');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE geofence_alert_type AS ENUM ('enter', 'exit', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gps_alert_type AS ENUM (
        'overspeed', 'geofence_enter', 'geofence_exit',
        'offline', 'low_battery', 'sos',
        'vibration', 'power_cut', 'external'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gps_alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE gps_alert_status AS ENUM ('new', 'read', 'acknowledged', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- GPS Geofences Table
CREATE TABLE IF NOT EXISTS gps_geofences (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    type geofence_type DEFAULT 'circle',
    center_lat DECIMAL(10, 8),
    center_lng DECIMAL(11, 8),
    radius INTEGER,
    coordinates JSONB,
    alert_type geofence_alert_type DEFAULT 'both',
    actif BOOLEAN DEFAULT true,
    external_id INTEGER,
    couleur VARCHAR(20) DEFAULT '#FF5722',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GPS Geofence-Trackers Junction Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS gps_geofence_trackers (
    geofence_id INTEGER NOT NULL REFERENCES gps_geofences(id) ON DELETE CASCADE,
    tracker_id INTEGER NOT NULL REFERENCES trackers_gps(id) ON DELETE CASCADE,
    PRIMARY KEY (geofence_id, tracker_id)
);

-- GPS Position History Table
CREATE TABLE IF NOT EXISTS gps_position_history (
    id SERIAL PRIMARY KEY,
    tracker_id INTEGER NOT NULL REFERENCES trackers_gps(id) ON DELETE CASCADE,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    vitesse INTEGER,
    cap INTEGER,
    altitude INTEGER,
    mileage DECIMAL(10, 2),
    en_ligne BOOLEAN DEFAULT true,
    timestamp TIMESTAMP NOT NULL,
    point_type INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for position history
CREATE INDEX IF NOT EXISTS idx_gps_position_history_tracker_timestamp
ON gps_position_history(tracker_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_gps_position_history_timestamp
ON gps_position_history(timestamp);

-- GPS Alerts Table
CREATE TABLE IF NOT EXISTS gps_alerts (
    id SERIAL PRIMARY KEY,
    tracker_id INTEGER REFERENCES trackers_gps(id) ON DELETE SET NULL,
    camion_id INTEGER REFERENCES camions(id) ON DELETE SET NULL,
    geofence_id INTEGER REFERENCES gps_geofences(id) ON DELETE SET NULL,
    type gps_alert_type NOT NULL,
    severity gps_alert_severity DEFAULT 'medium',
    status gps_alert_status DEFAULT 'new',
    message VARCHAR(255) NOT NULL,
    details TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    speed_recorded INTEGER,
    speed_limit INTEGER,
    external_id INTEGER,
    alert_time TIMESTAMP NOT NULL,
    acknowledged_at TIMESTAMP,
    acknowledged_by VARCHAR(100),
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100),
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for alerts
CREATE INDEX IF NOT EXISTS idx_gps_alerts_tracker_id ON gps_alerts(tracker_id);
CREATE INDEX IF NOT EXISTS idx_gps_alerts_status ON gps_alerts(status);
CREATE INDEX IF NOT EXISTS idx_gps_alerts_alert_time ON gps_alerts(alert_time);
CREATE INDEX IF NOT EXISTS idx_gps_alerts_type ON gps_alerts(type);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_gps_geofences_updated_at ON gps_geofences;
CREATE TRIGGER update_gps_geofences_updated_at
    BEFORE UPDATE ON gps_geofences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gps_alerts_updated_at ON gps_alerts;
CREATE TRIGGER update_gps_alerts_updated_at
    BEFORE UPDATE ON gps_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add column to trackers_gps if not exists (for geofence activation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trackers_gps' AND column_name = 'alerte_geofence_active'
    ) THEN
        ALTER TABLE trackers_gps ADD COLUMN alerte_geofence_active BOOLEAN DEFAULT false;
    END IF;
END $$;

COMMENT ON TABLE gps_geofences IS 'Electronic fences (geozones) for GPS tracking';
COMMENT ON TABLE gps_position_history IS 'Historical GPS positions for playback and statistics';
COMMENT ON TABLE gps_alerts IS 'GPS-related alerts (overspeed, geofence violations, etc.)';
