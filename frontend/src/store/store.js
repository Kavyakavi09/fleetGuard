import { configureStore } from "@reduxjs/toolkit";
import alertReducer from "./alertSlice";
import geofenceReducer from "./geofenceSlice";
import mapReducer from "./mapSlice";
import uiReducer from "./uiSlice";
import vehicleReducer from "./vehicleSlice";
import violationReducer from "./violationSlice";

const store = configureStore({
  reducer: {
    vehicle: vehicleReducer,
    geofence: geofenceReducer,
    alert: alertReducer,
    map: mapReducer,
    ui: uiReducer,
    violation: violationReducer,
  },
});

export default store;
