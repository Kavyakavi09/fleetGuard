package service

import (
	"context"

	"github.com/fleetguard/backend/internal/model"
	"github.com/fleetguard/backend/internal/repository"
)

type ViolationService struct {
	repo *repository.ViolationRepository
}

func NewViolationService(repo *repository.ViolationRepository) *ViolationService {
	return &ViolationService{repo: repo}
}

func (s *ViolationService) History(ctx context.Context, filter model.ViolationFilter) (*model.ViolationHistoryResponse, error) {
	items, total, err := s.repo.History(ctx, filter)
	if err != nil {
		return nil, err
	}
	return &model.ViolationHistoryResponse{Violations: items, TotalCount: total}, nil
}
