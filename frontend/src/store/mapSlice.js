import { createSlice } from "@reduxjs/toolkit";

const mapSlice = createSlice({
  name: "map",
  initialState: {
    mode: "view",
    draftPolygon: null,
    pendingLocation: null,
  },
  reducers: {
    setMapMode(state, action) {
      state.mode = action.payload;
      if (action.payload !== "draw-geofence") state.draftPolygon = null;
      if (action.payload !== "set-location") state.pendingLocation = null;
    },
    setDraftPolygon(state, action) {
      state.draftPolygon = action.payload;
    },
    setPendingLocation(state, action) {
      state.pendingLocation = action.payload;
    },
  },
});

export const { setMapMode, setDraftPolygon, setPendingLocation } = mapSlice.actions;
export default mapSlice.reducer;
