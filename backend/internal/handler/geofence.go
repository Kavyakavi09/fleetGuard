package handler

import (
	"encoding/json"
	"net/http"

	"github.com/fleetguard/backend/internal/model"
	"github.com/fleetguard/backend/internal/service"
	"github.com/fleetguard/backend/pkg/response"
)

type GeofenceHandler struct {
	service *service.GeofenceService
}

func NewGeofenceHandler(svc *service.GeofenceService) *GeofenceHandler {
	return &GeofenceHandler{service: svc}
}

func (h *GeofenceHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateGeofenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, r, http.StatusBadRequest, "invalid JSON body")
		return
	}
	res, err := h.service.Create(r.Context(), req)
	if err != nil {
		response.Error(w, r, http.StatusBadRequest, err.Error())
		return
	}
	response.JSON(w, r, http.StatusCreated, res)
}

func (h *GeofenceHandler) List(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	items, err := h.service.List(r.Context(), category)
	if err != nil {
		response.Error(w, r, http.StatusInternalServerError, "failed to list geofences")
		return
	}
	response.JSON(w, r, http.StatusOK, map[string]any{"geofences": items})
}
