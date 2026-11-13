CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE vehicles (
    id TEXT PRIMARY KEY,
    vehicle_number VARCHAR(64) NOT NULL UNIQUE,
    driver_name VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(64) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE geofences (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(64) NOT NULL,
    boundary GEOMETRY(POLYGON, 4326) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT geofences_category_check CHECK (
        category IN ('delivery_zone', 'restricted_zone', 'toll_zone', 'customer_area')
    )
);

CREATE INDEX idx_geofences_boundary ON geofences USING GIST (boundary);
CREATE INDEX idx_geofences_category ON geofences (category);

CREATE TABLE vehicle_locations (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    location GEOMETRY(POINT, 4326) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicle_locations_location ON vehicle_locations USING GIST (location);
CREATE INDEX idx_vehicle_locations_vehicle_time ON vehicle_locations (vehicle_id, recorded_at DESC);

CREATE TABLE vehicle_geofence_states (
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    geofence_id TEXT NOT NULL REFERENCES geofences(id),
    is_inside BOOLEAN NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (vehicle_id, geofence_id)
);

CREATE TABLE alert_rules (
    id TEXT PRIMARY KEY,
    geofence_id TEXT NOT NULL REFERENCES geofences(id),
    vehicle_id TEXT NULL REFERENCES vehicles(id),
    event_type VARCHAR(16) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT alert_rules_event_type_check CHECK (event_type IN ('entry', 'exit', 'both'))
);

CREATE INDEX idx_alert_rules_geofence ON alert_rules (geofence_id);
CREATE INDEX idx_alert_rules_vehicle ON alert_rules (vehicle_id);

CREATE TABLE violations (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
    geofence_id TEXT NOT NULL REFERENCES geofences(id),
    event_type VARCHAR(16) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT violations_event_type_check CHECK (event_type IN ('entry', 'exit'))
);

CREATE INDEX idx_violations_vehicle ON violations (vehicle_id);
CREATE INDEX idx_violations_geofence ON violations (geofence_id);
CREATE INDEX idx_violations_event_time ON violations (event_time DESC);

CREATE TABLE notification_outbox (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_notification_outbox_pending ON notification_outbox (created_at)
    WHERE status = 'pending';
