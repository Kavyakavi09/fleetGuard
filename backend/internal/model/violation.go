package model

import "time"

type Violation struct {
	ID            string    `json:"id"`
	VehicleID     string    `json:"vehicle_id"`
	VehicleNumber string    `json:"vehicle_number"`
	GeofenceID    string    `json:"geofence_id"`
	GeofenceName  string    `json:"geofence_name"`
	EventType     string    `json:"event_type"`
	Latitude      float64   `json:"latitude"`
	Longitude     float64   `json:"longitude"`
	Timestamp     time.Time `json:"timestamp"`
}

type ViolationHistoryResponse struct {
	Violations []Violation `json:"violations"`
	TotalCount int         `json:"total_count"`
}

type ViolationFilter struct {
	VehicleID  string
	GeofenceID string
	StartDate  *time.Time
	EndDate    *time.Time
	Limit      int
	Offset     int
}
