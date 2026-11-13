package repository

import (
	"context"
	"fmt"

	"github.com/fleetguard/backend/internal/model"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ViolationRepository struct {
	db *pgxpool.Pool
}

func NewViolationRepository(db *pgxpool.Pool) *ViolationRepository {
	return &ViolationRepository{db: db}
}

func (r *ViolationRepository) History(ctx context.Context, f model.ViolationFilter) ([]model.Violation, int, error) {
	where := ` WHERE 1=1`
	args := []any{}
	n := 1
	if f.VehicleID != "" {
		where += fmt.Sprintf(` AND v.vehicle_id = $%d`, n)
		args = append(args, f.VehicleID)
		n++
	}
	if f.GeofenceID != "" {
		where += fmt.Sprintf(` AND v.geofence_id = $%d`, n)
		args = append(args, f.GeofenceID)
		n++
	}
	if f.StartDate != nil {
		where += fmt.Sprintf(` AND v.event_time >= $%d`, n)
		args = append(args, *f.StartDate)
		n++
	}
	if f.EndDate != nil {
		where += fmt.Sprintf(` AND v.event_time <= $%d`, n)
		args = append(args, *f.EndDate)
		n++
	}

	countQuery := `SELECT COUNT(*) FROM violations v` + where
	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 500 {
		limit = 500
	}
	offset := f.Offset
	if offset < 0 {
		offset = 0
	}
	args = append(args, limit, offset)
	listQuery := `
		SELECT v.id, v.vehicle_id, veh.vehicle_number, v.geofence_id, g.name,
		       v.event_type, ST_Y(v.location::geometry), ST_X(v.location::geometry), v.event_time
		FROM violations v
		JOIN vehicles veh ON veh.id = v.vehicle_id
		JOIN geofences g ON g.id = v.geofence_id
	` + where + fmt.Sprintf(` ORDER BY v.event_time DESC LIMIT $%d OFFSET $%d`, n, n+1)

	rows, err := r.db.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := make([]model.Violation, 0)
	for rows.Next() {
		var item model.Violation
		if err := rows.Scan(
			&item.ID, &item.VehicleID, &item.VehicleNumber, &item.GeofenceID, &item.GeofenceName,
			&item.EventType, &item.Latitude, &item.Longitude, &item.Timestamp,
		); err != nil {
			return nil, 0, err
		}
		out = append(out, item)
	}
	return out, total, rows.Err()
}
