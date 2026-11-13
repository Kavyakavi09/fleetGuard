package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/fleetguard/backend/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ContainingGeofence struct {
	ID       string
	Name     string
	Category string
}

type TrackingRepository struct {
	db *pgxpool.Pool
}

func NewTrackingRepository(db *pgxpool.Pool) *TrackingRepository {
	return &TrackingRepository{db: db}
}

func (r *TrackingRepository) Begin(ctx context.Context) (pgx.Tx, error) {
	return r.db.Begin(ctx)
}

func (r *TrackingRepository) LockVehicle(ctx context.Context, tx pgx.Tx, vehicleID string) error {
	_, err := tx.Exec(ctx, `SELECT id FROM vehicles WHERE id = $1 FOR UPDATE`, vehicleID)
	return err
}

func (r *TrackingRepository) LastLocationTime(ctx context.Context, tx pgx.Tx, vehicleID string) (*time.Time, error) {
	var t *time.Time
	err := tx.QueryRow(ctx, `
		SELECT recorded_at FROM vehicle_locations
		WHERE vehicle_id = $1
		ORDER BY recorded_at DESC
		LIMIT 1
	`, vehicleID).Scan(&t)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return t, err
}

func (r *TrackingRepository) InsertLocation(ctx context.Context, tx pgx.Tx, vehicleID string, lat, lon float64, at time.Time) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO vehicle_locations (vehicle_id, location, recorded_at)
		VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)
	`, vehicleID, lon, lat, at)
	return err
}

func (r *TrackingRepository) ContainingGeofences(ctx context.Context, tx pgx.Tx, lat, lon float64) ([]ContainingGeofence, error) {
	rows, err := tx.Query(ctx, `
		SELECT id, name, category
		FROM geofences
		WHERE status = 'active'
		  AND ST_Covers(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
	`, lon, lat)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]ContainingGeofence, 0)
	for rows.Next() {
		var g ContainingGeofence
		if err := rows.Scan(&g.ID, &g.Name, &g.Category); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

func (r *TrackingRepository) PreviousInside(ctx context.Context, tx pgx.Tx, vehicleID string) (map[string]bool, error) {
	rows, err := tx.Query(ctx, `
		SELECT geofence_id, is_inside
		FROM vehicle_geofence_states
		WHERE vehicle_id = $1
		FOR UPDATE
	`, vehicleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := map[string]bool{}
	for rows.Next() {
		var id string
		var inside bool
		if err := rows.Scan(&id, &inside); err != nil {
			return nil, err
		}
		out[id] = inside
	}
	return out, rows.Err()
}

func (r *TrackingRepository) UpsertState(ctx context.Context, tx pgx.Tx, vehicleID, geofenceID string, inside bool) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO vehicle_geofence_states (vehicle_id, geofence_id, is_inside, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (vehicle_id, geofence_id)
		DO UPDATE SET is_inside = EXCLUDED.is_inside, updated_at = NOW()
	`, vehicleID, geofenceID, inside)
	return err
}

func (r *TrackingRepository) InsertViolation(ctx context.Context, tx pgx.Tx, id, vehicleID, geofenceID, eventType string, lat, lon float64, at time.Time) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO violations (id, vehicle_id, geofence_id, event_type, location, event_time)
		VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7)
	`, id, vehicleID, geofenceID, eventType, lon, lat, at)
	return err
}

func (r *TrackingRepository) AlertMatches(ctx context.Context, tx pgx.Tx, geofenceID, vehicleID, eventType string) (bool, error) {
	var exists bool
	err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM alert_rules
			WHERE status = 'active'
			  AND geofence_id = $1
			  AND (vehicle_id IS NULL OR vehicle_id = $2)
			  AND (event_type = $3 OR event_type = 'both')
		)
	`, geofenceID, vehicleID, eventType).Scan(&exists)
	return exists, err
}

func (r *TrackingRepository) InsertOutbox(ctx context.Context, tx pgx.Tx, id, eventID string, payload any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO notification_outbox (id, event_id, payload, status)
		VALUES ($1, $2, $3::jsonb, 'pending')
	`, id, eventID, string(raw))
	return err
}

func (r *TrackingRepository) CurrentLocation(ctx context.Context, vehicleID string) (lat, lon float64, at time.Time, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT ST_Y(location::geometry), ST_X(location::geometry), recorded_at
		FROM vehicle_locations
		WHERE vehicle_id = $1
		ORDER BY recorded_at DESC
		LIMIT 1
	`, vehicleID).Scan(&lat, &lon, &at)
	return
}

func (r *TrackingRepository) GeofenceMeta(ctx context.Context, tx pgx.Tx, id string) (name, category string, err error) {
	err = tx.QueryRow(ctx, `SELECT name, category FROM geofences WHERE id = $1`, id).Scan(&name, &category)
	return
}

func (r *TrackingRepository) CurrentGeofences(ctx context.Context, vehicleID string) ([]model.GeofenceStatus, error) {
	rows, err := r.db.Query(ctx, `
		SELECT g.id, g.name, g.category
		FROM vehicle_geofence_states s
		JOIN geofences g ON g.id = s.geofence_id
		WHERE s.vehicle_id = $1 AND s.is_inside = TRUE
	`, vehicleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.GeofenceStatus, 0)
	for rows.Next() {
		var g model.GeofenceStatus
		if err := rows.Scan(&g.GeofenceID, &g.GeofenceName, &g.Category); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}
