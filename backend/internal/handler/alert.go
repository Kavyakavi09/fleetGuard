package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/fleetguard/backend/internal/model"
	"github.com/fleetguard/backend/internal/service"
	"github.com/fleetguard/backend/pkg/response"
)

type AlertHandler struct {
	service *service.AlertService
}

func NewAlertHandler(svc *service.AlertService) *AlertHandler {
	return &AlertHandler{service: svc}
}

func (h *AlertHandler) Configure(w http.ResponseWriter, r *http.Request) {
	var req model.ConfigureAlertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, http.StatusBadRequest, "invalid JSON body")
		return
	}
	res, err := h.service.Configure(r.Context(), req)
	if err != nil {
		status := http.StatusBadRequest
		if strings.Contains(err.Error(), "not found") {
			status = http.StatusNotFound
		}
		response.Error(w, r, status, err.Error())
		return
	}
	response.JSON(w, r, http.StatusCreated, res)
}

func (h *AlertHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	items, err := h.service.List(r.Context(), q.Get("geofence_id"), q.Get("vehicle_id"))
	if err != nil {
		response.Error(w, r, http.StatusInternalServerError, "failed to list alerts")
		return
	}
	response.JSON(w, r, http.StatusOK, map[string]any{"alerts": items})
}
