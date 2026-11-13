import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { violationApi } from "../services/api";

export const fetchViolations = createAsyncThunk("violation/fetchViolations", async (params) => {
  return violationApi.history(params || { limit: 50 });
});

const violationSlice = createSlice({
  name: "violation",
  initialState: {
    list: [],
    total: 0,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchViolations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchViolations.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.violations || [];
        state.total = action.payload.total_count || 0;
      })
      .addCase(fetchViolations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export default violationSlice.reducer;
