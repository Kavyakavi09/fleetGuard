import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { geofenceApi } from "../services/api";

export const fetchGeofences = createAsyncThunk("geofence/fetchGeofences", async (category) => {
  const res = await geofenceApi.list(category || undefined);
  return res.geofences || [];
});

const geofenceSlice = createSlice({
  name: "geofence",
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGeofences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGeofences.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchGeofences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default geofenceSlice.reducer;
