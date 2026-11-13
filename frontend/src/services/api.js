import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3847";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.error || error.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);

export const wsUrl = () =>
  import.meta.env.VITE_WS_URL || "ws://localhost:3847/ws/alerts";

export const geofenceApi = {
  list: (category) =>
    api
      .get(category ? `/geofences?category=${encodeURIComponent(category)}` : "/geofences")
      .then((r) => r.data),
  create: (body) => api.post("/geofences", body).then((r) => r.data),
};

export const vehicleApi = {
  list: () => api.get("/vehicles").then((r) => r.data),
  create: (body) => api.post("/vehicles", body).then((r) => r.data),
};

export const trackingApi = {
  updateLocation: (body) => api.post("/vehicles/location", body).then((r) => r.data),
  getLocation: (id) => api.get(`/vehicles/location/${id}`).then((r) => r.data),
};

export const alertApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.geofence_id) q.set("geofence_id", params.geofence_id);
    if (params.vehicle_id) q.set("vehicle_id", params.vehicle_id);
    const qs = q.toString();
    return api.get(`/alerts${qs ? `?${qs}` : ""}`).then((r) => r.data);
  },
  configure: (body) => api.post("/alerts/configure", body).then((r) => r.data),
};

export const violationApi = {
  history: (params = {}) => {
    const q = new URLSearchParams();
    if (params.vehicle_id) q.set("vehicle_id", params.vehicle_id);
    if (params.geofence_id) q.set("geofence_id", params.geofence_id);
    if (params.start_date) q.set("start_date", params.start_date);
    if (params.end_date) q.set("end_date", params.end_date);
    if (params.limit) q.set("limit", String(params.limit));
    if (params.offset != null) q.set("offset", String(params.offset));
    const qs = q.toString();
    return api.get(`/violations/history${qs ? `?${qs}` : ""}`).then((r) => r.data);
  },
};

export default api;
