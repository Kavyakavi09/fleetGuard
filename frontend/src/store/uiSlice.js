import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    selectedVehicleId: null,
  },
  reducers: {
    setSelectedVehicleId(state, action) {
      state.selectedVehicleId = action.payload;
    },
  },
});

export const { setSelectedVehicleId } = uiSlice.actions;
export default uiSlice.reducer;
