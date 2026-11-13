package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/fleetguard/backend/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type GeofenceRepository struct {
	db *pgxpool.Pool
}

func NewGeofenceRepository(db *pgxpool.Pool) *GeofenceRepository {
	return &GeofenceRepository{db: db}
}

func (r *GeofenceRepository) Create(ctx context.Context, id, name, description, category, wkt string) error {
	var valid bool
	var reason string
	if err := r.db.QueryRow(ctx, `
		SELECT ST_IsValid(g), ST_IsValidReason(g)
		FROM (SELECT ST_GeomFromText($1, 4326) AS g) AS t
	`, wkt).Scan(&valid, &reason); err != nil {
		return fmt.Errorf("parse polygon: %w", err)
	}
	if !valid {
		return fmt.Errorf("invalid polygon: %s", reason)
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO geofences (id, name, description, category, boundary, status)
		VALUES ($1, $2, $3, $4, ST_GeomFromText($5, 4326), 'active')
	`, id, name, description, category, wkt)
	return err
}

func (r *GeofenceRepository) List(ctx context.Context, category string) ([]model.Geofence, error) {
	query := `
		SELECT id, name, description, category, status, created_at,
		       ST_AsGeoJSON(boundary)::jsonb
		FROM geofences
	`
	args := []any{}
	if category != "" {
		query += ` WHERE category = $1`
		args = append(args, category)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.Geofence, 0)
	for rows.Next() {
		var g model.Geofence
		var geoJSON []byte
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &g.Category, &g.Status, &g.CreatedAt, &geoJSON); err != nil {
			return nil, err
		}
		coords, err := geoJSONToLatLon(geoJSON)
		if err != nil {
			return nil, err
		}
		g.Coordinates = coords
		out = append(out, g)
	}
	return out, rows.Err()
}

func (r *GeofenceRepository) Exists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM geofences WHERE id = $1)`, id).Scan(&exists)
	return exists, err
}

func (r *GeofenceRepository) GetName(ctx context.Context, id string) (string, error) {
	var name string
	err := r.db.QueryRow(ctx, `SELECT name FROM geofences WHERE id = $1`, id).Scan(&name)
	return name, err
}

type geoJSONPolygon struct {
	Coordinates [][][]float64 `json:"coordinates"`
}

func geoJSONToLatLon(raw []byte) ([][]float64, error) {
	var g geoJSONPolygon
	if err := json.Unmarshal(raw, &g); err != nil {
		return nil, fmt.Errorf("parse geojson: %w", err)
	}
	if len(g.Coordinates) == 0 {
		return nil, fmt.Errorf("empty polygon")
	}
	ring := g.Coordinates[0]
	out := make([][]float64, 0, len(ring))
	for _, pair := range ring {
		if len(pair) < 2 {
			continue
		}
		// GeoJSON is [lon, lat] → API [lat, lon]
		out = append(out, []float64{pair[1], pair[0]})
	}
	return out, nil
}
