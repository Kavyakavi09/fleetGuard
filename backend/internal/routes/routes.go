package routes

import (
	"net/http"

	"github.com/fleetguard/backend/internal/handler"
	"github.com/fleetguard/backend/pkg/response"
	"github.com/fleetguard/backend/pkg/websocket"
)

// Deps wires HTTP handlers into the mux.
type Deps struct {
	Geofence  *handler.GeofenceHandler
	Vehicle   *handler.VehicleHandler
	Tracking  *handler.TrackingHandler
	Alert     *handler.AlertHandler
	Violation *handler.ViolationHandler
	Hub       *websocket.Hub
}

func NewMux(d Deps) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		response.JSON(w, r, http.StatusOK, map[string]any{"status": "ok"})
	})

	mux.HandleFunc("POST /geofences", d.Geofence.Create)
	mux.HandleFunc("GET /geofences", d.Geofence.List)

	mux.HandleFunc("POST /vehicles", d.Vehicle.Create)
	mux.HandleFunc("GET /vehicles", d.Vehicle.List)
	mux.HandleFunc("POST /vehicles/location", d.Tracking.UpdateLocation)
	mux.HandleFunc("GET /vehicles/location/{vehicle_id}", d.Tracking.CurrentLocation)

	mux.HandleFunc("POST /alerts/configure", d.Alert.Configure)
	mux.HandleFunc("GET /alerts", d.Alert.List)

	mux.HandleFunc("GET /violations/history", d.Violation.History)

	mux.HandleFunc("GET /ws/alerts", d.Hub.ServeWS)
	return mux
}
