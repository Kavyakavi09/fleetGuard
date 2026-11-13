package repository

import (
	"context"
	"errors"
	"strconv"

	"github.com/fleetguard/backend/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AlertRepository struct {
	db *pgxpool.Pool
}

func NewAlertRepository(db *pgxpool.Pool) *AlertRepository {
	return &AlertRepository{db: db}
}

func (r *AlertRepository) Create(ctx context.Context, id, geofenceID string, vehicleID *string, eventType string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO alert_rules (id, geofence_id, vehicle_id, event_type, status)
		VALUES ($1, $2, $3, $4, 'active')
	`, id, geofenceID, vehicleID, eventType)
	return err
}

func (r *AlertRepository) List(ctx context.Context, geofenceID, vehicleID string) ([]model.AlertRule, error) {
	query := `
		SELECT ar.id, ar.geofence_id, g.name, ar.vehicle_id, v.vehicle_number,
		       ar.event_type, ar.status, ar.created_at
		FROM alert_rules ar
		JOIN geofences g ON g.id = ar.geofence_id
		LEFT JOIN vehicles v ON v.id = ar.vehicle_id
		WHERE 1=1
	`
	args := []any{}
	argN := 1
	if geofenceID != "" {
		query += ` AND ar.geofence_id = $` + strconv.Itoa(argN)
		args = append(args, geofenceID)
		argN++
	}
	if vehicleID != "" {
		query += ` AND (ar.vehicle_id = $` + strconv.Itoa(argN) + ` OR ar.vehicle_id IS NULL)`
		args = append(args, vehicleID)
		argN++
	}
	query += ` ORDER BY ar.created_at DESC`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.AlertRule, 0)
	for rows.Next() {
		var rule model.AlertRule
		if err := rows.Scan(
			&rule.AlertID, &rule.GeofenceID, &rule.GeofenceName, &rule.VehicleID, &rule.VehicleNumber,
			&rule.EventType, &rule.Status, &rule.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, rule)
	}
	return out, rows.Err()
}

func (r *AlertRepository) MatchingRules(ctx context.Context, geofenceID, vehicleID, eventType string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
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

func (r *AlertRepository) GeofenceExists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM geofences WHERE id = $1)`, id).Scan(&exists)
	return exists, err
}

func (r *AlertRepository) VehicleExists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM vehicles WHERE id = $1)`, id).Scan(&exists)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return exists, err
}
