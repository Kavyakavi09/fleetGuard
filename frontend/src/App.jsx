import { useEffect, useState } from "react";
import { Provider, useDispatch } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import store from "./store/store";
import { fetchAlertRules } from "./store/alertSlice";
import { fetchGeofences } from "./store/geofenceSlice";
import { fetchVehicleLocation, fetchVehicles } from "./store/vehicleSlice";
import { fetchViolations } from "./store/violationSlice";
import { useAlertSocket } from "./hooks/useAlertSocket";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Overview from "./pages/Overview";
import MapPage from "./pages/MapPage";
import Geofences from "./pages/Geofences";
import Vehicles from "./pages/Vehicles";
import Alerts from "./pages/Alerts";
import Violations from "./pages/Violations";

const titles = {
  "/": "Dashboard",
  "/map": "Live Map",
  "/geofences": "Geofence Management",
  "/vehicles": "Vehicle Management",
  "/alerts": "Alert Configuration",
  "/violations": "Violation History",
};

function Shell() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useAlertSocket();

  useEffect(() => {
    dispatch(fetchGeofences());
    dispatch(fetchAlertRules());
    dispatch(fetchViolations({ limit: 50 }));
    dispatch(fetchVehicles())
      .unwrap()
      .then((vehicles) => {
        vehicles.forEach((v) => dispatch(fetchVehicleLocation(v.id)));
      })
      .catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell min-h-dvh">
      <Toaster
        theme="dark"
        richColors
        position="top-right"
        toastOptions={{
          style: {
            background: "#111827",
            border: "1px solid rgba(148,163,184,0.18)",
            color: "#e8eef9",
          },
        }}
      />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="min-h-dvh overflow-x-hidden p-3 sm:p-5 lg:ml-[272px] lg:p-6">
        <TopBar title={titles[pathname] || "FleetGuard"} onMenu={() => setMenuOpen(true)} />
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/geofences" element={<Geofences />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/violations" element={<Violations />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </Provider>
  );
}
