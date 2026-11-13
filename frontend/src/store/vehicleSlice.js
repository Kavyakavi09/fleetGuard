import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { trackingApi, vehicleApi } from "../services/api";

export const fetchVehicles = createAsyncThunk("vehicle/fetchVehicles", async () => {
  const res = await vehicleApi.list();
  return res.vehicles || [];
});

export const fetchVehicleLocation = createAsyncThunk(
  "vehicle/fetchVehicleLocation",
  async (vehicleId) => trackingApi.getLocation(vehicleId)
);

const vehicleSlice = createSlice({
  name: "vehicle",
  initialState: {
    list: [],
    locations: {},
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVehicles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchVehicleLocation.fulfilled, (state, action) => {
        if (!action.payload.current_location) return;
        state.locations[action.payload.vehicle_id] = {
          latitude: action.payload.current_location.latitude,
          longitude: action.payload.current_location.longitude,
          timestamp: action.payload.current_location.timestamp,
          geofences: action.payload.current_geofences || [],
        };
      });
  },
});

export default vehicleSlice.reducer;
