package model

import "time"

type ConfigureAlertRequest struct {
	GeofenceID string  `json:"geofence_id"`
	VehicleID  *string `json:"vehicle_id"`
	EventType  string  `json:"event_type"`
}

type AlertRule struct {
	AlertID       string    `json:"alert_id"`
	GeofenceID    string    `json:"geofence_id"`
	GeofenceName  string    `json:"geofence_name"`
	VehicleID     *string   `json:"vehicle_id"`
	VehicleNumber *string   `json:"vehicle_number"`
	EventType     string    `json:"event_type"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

type ConfigureAlertResponse struct {
	AlertID    string  `json:"alert_id"`
	GeofenceID string  `json:"geofence_id"`
	VehicleID  *string `json:"vehicle_id"`
	EventType  string  `json:"event_type"`
	Status     string  `json:"status"`
}

type LiveEvent struct {
	EventID   string `json:"event_id"`
	EventType string `json:"event_type"`
	Timestamp string `json:"timestamp"`
	Vehicle   struct {
		VehicleID     string `json:"vehicle_id"`
		VehicleNumber string `json:"vehicle_number"`
		DriverName    string `json:"driver_name"`
	} `json:"vehicle"`
	Geofence struct {
		GeofenceID   string `json:"geofence_id"`
		GeofenceName string `json:"geofence_name"`
		Category     string `json:"category"`
	} `json:"geofence"`
	Location struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	} `json:"location"`
}
