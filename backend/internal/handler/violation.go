package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/fleetguard/backend/internal/model"
	"github.com/fleetguard/backend/internal/service"
	"github.com/fleetguard/backend/pkg/response"
)

type ViolationHandler struct {
	service *service.ViolationService
}

func NewViolationHandler(svc *service.ViolationService) *ViolationHandler {
	return &ViolationHandler{service: svc}
}

func (h *ViolationHandler) History(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := model.ViolationFilter{
		VehicleID:  q.Get("vehicle_id"),
		GeofenceID: q.Get("geofence_id"),
	}
	if v := q.Get("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			response.Error(w, r, http.StatusBadRequest, "limit must be a positive integer")
			return
		}
		filter.Limit = n
	}
	if v := q.Get("offset"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 {
			response.Error(w, r, http.StatusBadRequest, "offset must be a non-negative integer")
			return
		}
		filter.Offset = n
	}
	if v := q.Get("start_date"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			response.Error(w, r, http.StatusBadRequest, "start_date must be ISO 8601 (RFC3339)")
			return
		}
		filter.StartDate = &t
	}
	if v := q.Get("end_date"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			response.Error(w, r, http.StatusBadRequest, "end_date must be ISO 8601 (RFC3339)")
			return
		}
		filter.EndDate = &t
	}

	res, err := h.service.History(r.Context(), filter)
	if err != nil {
		response.Error(w, r, http.StatusInternalServerError, "failed to load violation history")
		return
	}
	response.JSON(w, r, http.StatusOK, res)
}
