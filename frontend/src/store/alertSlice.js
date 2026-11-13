import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { alertApi } from "../services/api";

export const fetchAlertRules = createAsyncThunk("alert/fetchAlertRules", async () => {
  const res = await alertApi.list();
  return res.alerts || [];
});

const alertSlice = createSlice({
  name: "alert",
  initialState: {
    rules: [],
    live: [],
    connection: "disconnected",
    loading: false,
    error: null,
  },
  reducers: {
    setConnection(state, action) {
      state.connection = action.payload;
    },
    pushLiveAlert(state, action) {
      state.live.unshift(action.payload);
      if (state.live.length > 100) state.live = state.live.slice(0, 100);
    },
    clearLiveAlerts(state) {
      state.live = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlertRules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlertRules.fulfilled, (state, action) => {
        state.loading = false;
        state.rules = action.payload;
      })
      .addCase(fetchAlertRules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { setConnection, pushLiveAlert, clearLiveAlerts } = alertSlice.actions;
export default alertSlice.reducer;
