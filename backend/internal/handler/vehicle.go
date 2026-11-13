package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/fleetguard/backend/internal/model"
	"github.com/fleetguard/backend/internal/service"
	"github.com/fleetguard/backend/pkg/response"
)

type VehicleHandler struct {
	service *service.VehicleService
}

func NewVehicleHandler(svc *service.VehicleService) *VehicleHandler {
	return &VehicleHandler{service: svc}
}

func (h *VehicleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateVehicleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, http.StatusBadRequest, "invalid JSON body")
		return
	}
	res, err := h.service.Create(r.Context(), req)
	if err != nil {
		status := http.StatusBadRequest
		if strings.Contains(err.Error(), "already exists") {
			status = http.StatusConflict
		}
		response.Error(w, r, status, err.Error())
		return
	}
	response.JSON(w, r, http.StatusCreated, res)
}

func (h *VehicleHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.service.List(r.Context())
	if err != nil {
		response.Error(w, r, http.StatusInternalServerError, "failed to list vehicles")
		return
	}
	response.JSON(w, r, http.StatusOK, map[string]any{"vehicles": items})
}
