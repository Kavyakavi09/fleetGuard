package response

import (
	"encoding/json"
	"testing"

	"github.com/fleetguard/backend/internal/model"
)

func TestAppendTimeNS_PreservesStructOrder(t *testing.T) {
	raw := []byte(`{"vehicle_id":"veh_1","location_updated":true,"current_geofences":[]}`)
	out, err := appendTimeNS(raw, "123")
	if err != nil {
		t.Fatal(err)
	}
	want := `{"vehicle_id":"veh_1","location_updated":true,"current_geofences":[],"time_ns":"123"}`
	if string(out) != want {
		t.Fatalf("got %s want %s", out, want)
	}
}

func TestLocationUpdateResponseFieldOrder(t *testing.T) {
	res := model.LocationUpdateResponse{
		VehicleID:        "veh_456",
		LocationUpdated:  true,
		CurrentGeofences: []model.GeofenceStatus{},
	}
	raw, err := json.Marshal(res)
	if err != nil {
		t.Fatal(err)
	}
	out, err := appendTimeNS(raw, "2345678")
	if err != nil {
		t.Fatal(err)
	}
	want := `{"vehicle_id":"veh_456","location_updated":true,"current_geofences":[],"time_ns":"2345678"}`
	if string(out) != want {
		t.Fatalf("got %s want %s", out, want)
	}
}
