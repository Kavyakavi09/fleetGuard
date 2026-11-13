package service

import (
	"testing"

	"github.com/fleetguard/backend/internal/model"
)

func TestValidateGeofenceCreate_OK(t *testing.T) {
	err := ValidateGeofenceCreate(model.CreateGeofenceRequest{
		Name:     "Zone",
		Category: "restricted_zone",
		Coordinates: [][]float64{
			{13.08, 80.27},
			{13.09, 80.27},
			{13.09, 80.28},
			{13.08, 80.28},
			{13.08, 80.27},
		},
	})
	if err != nil {
		t.Fatalf("expected ok, got %v", err)
	}
}

func TestValidateGeofenceCreate_NotClosed(t *testing.T) {
	err := ValidateGeofenceCreate(model.CreateGeofenceRequest{
		Name:     "Zone",
		Category: "delivery_zone",
		Coordinates: [][]float64{
			{13.08, 80.27},
			{13.09, 80.27},
			{13.09, 80.28},
			{13.08, 80.28},
		},
	})
	if err == nil {
		t.Fatal("expected closed polygon error")
	}
}

func TestToWKT_LonLatOrder(t *testing.T) {
	wkt := ToWKT([][]float64{{13.08, 80.27}, {13.09, 80.27}, {13.09, 80.28}, {13.08, 80.27}})
	want := "POLYGON((80.270000 13.080000,80.270000 13.090000,80.280000 13.090000,80.270000 13.080000))"
	if wkt != want {
		t.Fatalf("got %s want %s", wkt, want)
	}
}
