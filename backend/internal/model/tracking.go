package model

import "time"

type LocationUpdateRequest struct {
	VehicleID string  `json:"vehicle_id"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Timestamp string  `json:"timestamp"`
}

type GeofenceStatus struct {
	GeofenceID   string `json:"geofence_id"`
	GeofenceName string `json:"geofence_name"`
	Status       string `json:"status,omitempty"`
	Category     string `json:"category,omitempty"`
}

type LocationUpdateResponse struct {
	VehicleID        string           `json:"vehicle_id"`
	LocationUpdated  bool             `json:"location_updated"`
	CurrentGeofences []GeofenceStatus `json:"current_geofences"`
}

type CurrentLocationResponse struct {
	VehicleID       string `json:"vehicle_id"`
	VehicleNumber   string `json:"vehicle_number"`
	CurrentLocation *struct {
		Latitude  float64   `json:"latitude"`
		Longitude float64   `json:"longitude"`
		Timestamp time.Time `json:"timestamp"`
	} `json:"current_location"`
	CurrentGeofences []GeofenceStatus `json:"current_geofences"`
}
