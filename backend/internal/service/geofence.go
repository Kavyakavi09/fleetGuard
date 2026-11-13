package service

import (
	"context"
	"fmt"
	"math"
	"strings"

	"github.com/fleetguard/backend/internal/model"
	"github.com/fleetguard/backend/internal/repository"
	"github.com/fleetguard/backend/pkg/ids"
)

type GeofenceService struct {
	repo *repository.GeofenceRepository
}

func NewGeofenceService(repo *repository.GeofenceRepository) *GeofenceService {
	return &GeofenceService{repo: repo}
}

func (s *GeofenceService) Create(ctx context.Context, req model.CreateGeofenceRequest) (*model.CreateGeofenceResponse, error) {
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	if err := ValidateGeofenceCreate(req); err != nil {
		return nil, err
	}
	id := ids.New("geo_")
	if err := s.repo.Create(ctx, id, req.Name, req.Description, req.Category, ToWKT(req.Coordinates)); err != nil {
		return nil, err
	}
	return &model.CreateGeofenceResponse{ID: id, Name: req.Name, Status: "active"}, nil
}

func (s *GeofenceService) List(ctx context.Context, category string) ([]model.Geofence, error) {
	return s.repo.List(ctx, category)
}

func ValidateGeofenceCreate(req model.CreateGeofenceRequest) error {
	if strings.TrimSpace(req.Name) == "" {
		return fmt.Errorf("name is required")
	}
	if _, ok := model.AllowedGeofenceCategories[req.Category]; !ok {
		return fmt.Errorf("category must be one of: delivery_zone, restricted_zone, toll_zone, customer_area")
	}
	if len(req.Coordinates) < 4 {
		return fmt.Errorf("coordinates must include at least 4 points (3 unique + closing point)")
	}

	first := req.Coordinates[0]
	last := req.Coordinates[len(req.Coordinates)-1]
	if len(first) != 2 || len(last) != 2 {
		return fmt.Errorf("each coordinate must be [latitude, longitude]")
	}
	if !almostEqual(first[0], last[0]) || !almostEqual(first[1], last[1]) {
		return fmt.Errorf("first and last coordinates must be identical (closed polygon)")
	}

	unique := map[[2]string]struct{}{}
	for i, pair := range req.Coordinates {
		if len(pair) != 2 {
			return fmt.Errorf("coordinate at index %d must be [latitude, longitude]", i)
		}
		lat, lon := pair[0], pair[1]
		if lat < -90 || lat > 90 {
			return fmt.Errorf("latitude at index %d must be between -90 and 90", i)
		}
		if lon < -180 || lon > 180 {
			return fmt.Errorf("longitude at index %d must be between -180 and 180", i)
		}
		key := [2]string{fmt.Sprintf("%.8f", lat), fmt.Sprintf("%.8f", lon)}
		unique[key] = struct{}{}
	}
	if len(unique) < 3 {
		return fmt.Errorf("polygon must have at least 3 unique vertices")
	}
	return nil
}

func almostEqual(a, b float64) bool {
	return math.Abs(a-b) < 1e-9
}

// ToWKT converts API [lat, lon] pairs into a PostGIS WKT polygon using lon lat order.
func ToWKT(coords [][]float64) string {
	parts := make([]string, 0, len(coords))
	for _, c := range coords {
		parts = append(parts, fmt.Sprintf("%f %f", c[1], c[0]))
	}
	return fmt.Sprintf("POLYGON((%s))", strings.Join(parts, ","))
}
