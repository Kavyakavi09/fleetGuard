package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/fleetguard/backend/internal/model"
	"github.com/fleetguard/backend/internal/repository"
	"github.com/fleetguard/backend/pkg/ids"
)

type VehicleService struct {
	repo *repository.VehicleRepository
}

func NewVehicleService(repo *repository.VehicleRepository) *VehicleService {
	return &VehicleService{repo: repo}
}

func (s *VehicleService) Create(ctx context.Context, req model.CreateVehicleRequest) (*model.CreateVehicleResponse, error) {
	req.VehicleNumber = strings.TrimSpace(req.VehicleNumber)
	req.DriverName = strings.TrimSpace(req.DriverName)
	req.VehicleType = strings.TrimSpace(req.VehicleType)
	req.Phone = strings.TrimSpace(req.Phone)

	if req.VehicleNumber == "" || req.DriverName == "" || req.VehicleType == "" || req.Phone == "" {
		return nil, fmt.Errorf("vehicle_number, driver_name, vehicle_type, and phone are required")
	}

	v := model.Vehicle{
		ID:            ids.New("veh_"),
		VehicleNumber: req.VehicleNumber,
		DriverName:    req.DriverName,
		VehicleType:   req.VehicleType,
		Phone:         req.Phone,
		Status:        "active",
	}
	if err := s.repo.Create(ctx, v); err != nil {
		if repository.IsUniqueViolation(err) {
			return nil, fmt.Errorf("vehicle_number already exists")
		}
		return nil, err
	}
	return &model.CreateVehicleResponse{ID: v.ID, VehicleNumber: v.VehicleNumber, Status: v.Status}, nil
}

func (s *VehicleService) List(ctx context.Context) ([]model.Vehicle, error) {
	return s.repo.List(ctx)
}

func (s *VehicleService) Get(ctx context.Context, id string) (*model.Vehicle, error) {
	return s.repo.GetByID(ctx, id)
}
