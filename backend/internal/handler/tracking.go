package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/fleetguard/backend/internal/model"
	"github.com/fleetguard/backend/internal/service"
	"github.com/fleetguard/backend/pkg/response"
)

type TrackingHandler struct {
	service *service.TrackingService
}

func NewTrackingHandler(svc *service.TrackingService) *TrackingHandler {
	return &TrackingHandler{service: svc}
}

func (h *TrackingHandler) UpdateLocation(w http.ResponseWriter, r *http.Request) {
	var req model.LocationUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, http.StatusBadRequest, "invalid JSON body")
		return
	}
	res, err := h.service.UpdateLocation(r.Context(), req)
	if err != nil {
		status := http.StatusBadRequest
		if strings.Contains(err.Error(), "not found") {
			status = http.StatusNotFound
		}
		response.Error(w, r, status, err.Error())
		return
	}
	response.JSON(w, r, http.StatusOK, res)
}

func (h *TrackingHandler) CurrentLocation(w http.ResponseWriter, r *http.Request) {
	vehicleID := r.PathValue("vehicle_id")
	res, err := h.service.Current(r.Context(), vehicleID)
	if err != nil {
		status := http.StatusBadRequest
		if strings.Contains(err.Error(), "not found") {
			status = http.StatusNotFound
		}
		response.Error(w, r, status, err.Error())
		return
	}
	response.JSON(w, r, http.StatusOK, res)
}
