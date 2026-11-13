package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/fleetguard/backend/internal/model"
	"github.com/fleetguard/backend/internal/repository"
	"github.com/fleetguard/backend/pkg/ids"
	"github.com/jackc/pgx/v5"
)

type TrackingService struct {
	repo     *repository.TrackingRepository
	vehicles *VehicleService
}

func NewTrackingService(repo *repository.TrackingRepository, vehicles *VehicleService) *TrackingService {
	return &TrackingService{repo: repo, vehicles: vehicles}
}

type transition struct {
	GeofenceID   string
	GeofenceName string
	Category     string
	EventType    string
}

func (s *TrackingService) UpdateLocation(ctx context.Context, req model.LocationUpdateRequest) (*model.LocationUpdateResponse, error) {
	if req.VehicleID == "" {
		return nil, fmt.Errorf("vehicle_id is required")
	}
	if req.Latitude < -90 || req.Latitude > 90 {
		return nil, fmt.Errorf("latitude must be between -90 and 90")
	}
	if req.Longitude < -180 || req.Longitude > 180 {
		return nil, fmt.Errorf("longitude must be between -180 and 180")
	}
	if req.Timestamp == "" {
		return nil, fmt.Errorf("timestamp is required")
	}
	at, err := time.Parse(time.RFC3339, req.Timestamp)
	if err != nil {
		return nil, fmt.Errorf("timestamp must be ISO 8601 (RFC3339)")
	}

	veh, err := s.vehicles.Get(ctx, req.VehicleID)
	if err != nil {
		return nil, err
	}
	if veh == nil {
		return nil, fmt.Errorf("vehicle not found")
	}

	tx, err := s.repo.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if err := s.repo.LockVehicle(ctx, tx, req.VehicleID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("vehicle not found")
		}
		return nil, err
	}

	lastAt, err := s.repo.LastLocationTime(ctx, tx, req.VehicleID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if lastAt != nil && at.Before(*lastAt) {
		return nil, fmt.Errorf("timestamp is older than the latest stored location")
	}

	if err := s.repo.InsertLocation(ctx, tx, req.VehicleID, req.Latitude, req.Longitude, at); err != nil {
		return nil, err
	}

	inside, err := s.repo.ContainingGeofences(ctx, tx, req.Latitude, req.Longitude)
	if err != nil {
		return nil, err
	}
	previous, err := s.repo.PreviousInside(ctx, tx, req.VehicleID)
	if err != nil {
		return nil, err
	}

	insideSet := map[string]repository.ContainingGeofence{}
	for _, g := range inside {
		insideSet[g.ID] = g
	}

	current := make([]model.GeofenceStatus, 0, len(inside))
	for _, g := range inside {
		current = append(current, model.GeofenceStatus{
			GeofenceID:   g.ID,
			GeofenceName: g.Name,
			Status:       "inside",
		})
		if err := s.repo.UpsertState(ctx, tx, req.VehicleID, g.ID, true); err != nil {
			return nil, err
		}
	}

	for geofenceID, wasInside := range previous {
		if !wasInside {
			continue
		}
		if _, stillInside := insideSet[geofenceID]; stillInside {
			continue
		}
		if err := s.repo.UpsertState(ctx, tx, req.VehicleID, geofenceID, false); err != nil {
			return nil, err
		}
	}

	transitions := detectTransitions(previous, insideSet)
	for i := range transitions {
		t := &transitions[i]
		if t.GeofenceName == "" || t.Category == "" {
			name, category, err := s.repo.GeofenceMeta(ctx, tx, t.GeofenceID)
			if err != nil {
				return nil, err
			}
			t.GeofenceName = name
			t.Category = category
		}
	}
	for _, t := range transitions {
		violationID := ids.New("viol_")
		if err := s.repo.InsertViolation(ctx, tx, violationID, req.VehicleID, t.GeofenceID, t.EventType, req.Latitude, req.Longitude, at); err != nil {
			return nil, err
		}

		matches, err := s.repo.AlertMatches(ctx, tx, t.GeofenceID, req.VehicleID, t.EventType)
		if err != nil {
			return nil, err
		}
		if !matches {
			continue
		}

		eventID := ids.New("evt_")
		payload := model.LiveEvent{
			EventID:   eventID,
			EventType: t.EventType,
			Timestamp: at.UTC().Format(time.RFC3339),
		}
		payload.Vehicle.VehicleID = veh.ID
		payload.Vehicle.VehicleNumber = veh.VehicleNumber
		payload.Vehicle.DriverName = veh.DriverName
		payload.Geofence.GeofenceID = t.GeofenceID
		payload.Geofence.GeofenceName = t.GeofenceName
		payload.Geofence.Category = t.Category
		payload.Location.Latitude = req.Latitude
		payload.Location.Longitude = req.Longitude

		if err := s.repo.InsertOutbox(ctx, tx, ids.New("outbox_"), eventID, payload); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &model.LocationUpdateResponse{
		VehicleID:        req.VehicleID,
		LocationUpdated:  true,
		CurrentGeofences: current,
	}, nil
}

func detectTransitions(previous map[string]bool, inside map[string]repository.ContainingGeofence) []transition {
	out := make([]transition, 0)

	for id, g := range inside {
		if previous[id] {
			continue
		}
		out = append(out, transition{
			GeofenceID:   id,
			GeofenceName: g.Name,
			Category:     g.Category,
			EventType:    "entry",
		})
	}

	for id, wasInside := range previous {
		if !wasInside {
			continue
		}
		if _, still := inside[id]; still {
			continue
		}
		out = append(out, transition{
			GeofenceID: id,
			EventType:  "exit",
		})
	}
	return out
}

func (s *TrackingService) Current(ctx context.Context, vehicleID string) (*model.CurrentLocationResponse, error) {
	veh, err := s.vehicles.Get(ctx, vehicleID)
	if err != nil {
		return nil, err
	}
	if veh == nil {
		return nil, fmt.Errorf("vehicle not found")
	}

	res := &model.CurrentLocationResponse{
		VehicleID:        veh.ID,
		VehicleNumber:    veh.VehicleNumber,
		CurrentGeofences: []model.GeofenceStatus{},
	}

	lat, lon, at, err := s.repo.CurrentLocation(ctx, vehicleID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return res, nil
		}
		return nil, err
	}
	res.CurrentLocation = &struct {
		Latitude  float64   `json:"latitude"`
		Longitude float64   `json:"longitude"`
		Timestamp time.Time `json:"timestamp"`
	}{Latitude: lat, Longitude: lon, Timestamp: at}

	geos, err := s.repo.CurrentGeofences(ctx, vehicleID)
	if err != nil {
		return nil, err
	}
	res.CurrentGeofences = geos
	return res, nil
}
