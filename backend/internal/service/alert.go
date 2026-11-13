package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"github.com/fleetguard/backend/internal/model"
	"github.com/fleetguard/backend/internal/repository"
	"github.com/fleetguard/backend/pkg/ids"
	"github.com/fleetguard/backend/pkg/websocket"
)

type AlertService struct {
	repo *repository.AlertRepository
}

func NewAlertService(repo *repository.AlertRepository) *AlertService {
	return &AlertService{repo: repo}
}

func (s *AlertService) Configure(ctx context.Context, req model.ConfigureAlertRequest) (*model.ConfigureAlertResponse, error) {
	req.GeofenceID = strings.TrimSpace(req.GeofenceID)
	req.EventType = strings.TrimSpace(req.EventType)
	if req.GeofenceID == "" {
		return nil, fmt.Errorf("geofence_id is required")
	}
	if req.EventType != "entry" && req.EventType != "exit" && req.EventType != "both" {
		return nil, fmt.Errorf("event_type must be one of: entry, exit, both")
	}

	ok, err := s.repo.GeofenceExists(ctx, req.GeofenceID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, fmt.Errorf("geofence not found")
	}

	var vehicleID *string
	if req.VehicleID != nil && strings.TrimSpace(*req.VehicleID) != "" {
		v := strings.TrimSpace(*req.VehicleID)
		exists, err := s.repo.VehicleExists(ctx, v)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, fmt.Errorf("vehicle not found")
		}
		vehicleID = &v
	}

	id := ids.New("alert_")
	if err := s.repo.Create(ctx, id, req.GeofenceID, vehicleID, req.EventType); err != nil {
		return nil, err
	}
	return &model.ConfigureAlertResponse{
		AlertID:    id,
		GeofenceID: req.GeofenceID,
		VehicleID:  vehicleID,
		EventType:  req.EventType,
		Status:     "active",
	}, nil
}

func (s *AlertService) List(ctx context.Context, geofenceID, vehicleID string) ([]model.AlertRule, error) {
	return s.repo.List(ctx, geofenceID, vehicleID)
}

type AlertWorker struct {
	hub *websocket.Hub
}

func NewAlertWorker(hub *websocket.Hub) *AlertWorker {
	return &AlertWorker{hub: hub}
}

func (w *AlertWorker) Handle(ctx context.Context, body []byte) error {
	var event model.LiveEvent
	if err := json.Unmarshal(body, &event); err != nil {
		slog.Error("invalid alert payload", "error", err)
		return nil // drop poison message
	}
	if err := w.hub.BroadcastJSON(event); err != nil {
		return err
	}
	slog.Info("alert broadcast", "event_id", event.EventID, "type", event.EventType)
	return nil
}
