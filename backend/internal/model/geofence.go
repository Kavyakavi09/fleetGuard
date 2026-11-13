package model

import "time"

var AllowedGeofenceCategories = map[string]struct{}{
	"delivery_zone":   {},
	"restricted_zone": {},
	"toll_zone":       {},
	"customer_area":   {},
}

type CreateGeofenceRequest struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Coordinates [][]float64 `json:"coordinates"`
	Category    string      `json:"category"`
}

type Geofence struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Coordinates [][]float64 `json:"coordinates"`
	Category    string      `json:"category"`
	Status      string      `json:"status,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
}

type CreateGeofenceResponse struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
}
