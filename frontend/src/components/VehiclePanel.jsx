import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { trackingApi, vehicleApi } from "../services/api";
import { fetchVehicleLocation, fetchVehicles } from "../store/vehicleSlice";
import { setMapMode, setPendingLocation } from "../store/mapSlice";
import { setSelectedVehicleId } from "../store/uiSlice";
import { cn } from "../utils/cn";
import {
  Badge,
  Button,
  EmptyState,
  FieldLabel,
  Input,
  LoadingText,
  Panel,
  PanelHeader,
  Select,
} from "./ui";

function zoneCentroid(geofence) {
  const coords = geofence?.coordinates || [];
  if (coords.length === 0) return null;
  const ring =
    coords.length > 1 &&
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1]
      ? coords.slice(0, -1)
      : coords;
  const sum = ring.reduce(
    (acc, c) => {
      acc.lat += c[0];
      acc.lng += c[1];
      return acc;
    },
    { lat: 0, lng: 0 }
  );
  return { lat: sum.lat / ring.length, lng: sum.lng / ring.length };
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-[var(--accent)] text-white shadow-[0_8px_20px_rgba(59,130,246,0.25)]"
          : "text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--fg)]"
      )}
    >
      {children}
    </button>
  );
}

export default function VehiclePanel() {
  const dispatch = useDispatch();
  const vehicles = useSelector((s) => s.vehicle.list);
  const geofences = useSelector((s) => s.geofence.list);
  const loading = useSelector((s) => s.vehicle.loading);
  const vehicleLocations = useSelector((s) => s.vehicle.locations);
  const selectedVehicleId = useSelector((s) => s.ui.selectedVehicleId);
  const pendingLocation = useSelector((s) => s.map.pendingLocation);
  const mapMode = useSelector((s) => s.map.mode);

  const [tab, setTab] = useState("fleet");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleType, setVehicleType] = useState("truck");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [placeZoneId, setPlaceZoneId] = useState("");
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );
  const selectedLoc = selectedVehicleId ? vehicleLocations[selectedVehicleId] : null;

  const placeInsideZone = (geofenceId) => {
    setPlaceZoneId(geofenceId);
    if (!geofenceId) return;
    const zone = geofences.find((g) => g.id === geofenceId);
    const center = zoneCentroid(zone);
    if (!center) {
      toast.error("Zone has no coordinates");
      return;
    }
    dispatch(setPendingLocation(center));
    dispatch(setMapMode("set-location"));
    toast.message(`Pinned inside ${zone.name}`);
  };

  const register = async () => {
    if (!vehicleNumber.trim() || !driverName.trim() || !phone.trim()) {
      toast.error("Vehicle number, driver, and phone are required");
      return;
    }
    setSaving(true);
    try {
      const res = await vehicleApi.create({
        vehicle_number: vehicleNumber.trim(),
        driver_name: driverName.trim(),
        vehicle_type: vehicleType,
        phone: phone.trim(),
      });
      toast.success(`Registered ${res.vehicle_number}`);
      setVehicleNumber("");
      setDriverName("");
      setPhone("");
      dispatch(setSelectedVehicleId(res.id));
      dispatch(fetchVehicles());
      setTab("fleet");
    } catch (e) {
      toast.error(e.message || "Register failed");
    } finally {
      setSaving(false);
    }
  };

  const pushLocation = async () => {
    if (!selectedVehicleId) {
      toast.error("Select a vehicle from the list first");
      setTab("fleet");
      return;
    }

    let latitude = pendingLocation?.lat;
    let longitude = pendingLocation?.lng;

    if (latitude == null || longitude == null) {
      const parsedLat = Number(lat);
      const parsedLng = Number(lng);
      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        toast.error("Click the map or enter valid coordinates");
        return;
      }
      latitude = parsedLat;
      longitude = parsedLng;
    }

    setUpdating(true);
    try {
      const res = await trackingApi.updateLocation({
        vehicle_id: selectedVehicleId,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });
      toast.success(
        res.current_geofences?.length
          ? `Inside ${res.current_geofences.map((g) => g.geofence_name).join(", ")}`
          : "Location updated · outside all zones"
      );
      dispatch(fetchVehicleLocation(selectedVehicleId));
      dispatch(setPendingLocation(null));
      dispatch(setMapMode("view"));
      setLat("");
      setLng("");
      setPlaceZoneId("");
    } catch (e) {
      toast.error(e.message || "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Panel className="flex max-h-[calc(100vh-9rem)] flex-col overflow-hidden">
      <PanelHeader
        title="Vehicles"
        subtitle={`${vehicles.length} registered`}
        className="mb-3 shrink-0"
      />

      <div className="mb-3 flex shrink-0 gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/70 p-1">
        <TabButton active={tab === "fleet"} onClick={() => setTab("fleet")}>
          Fleet
        </TabButton>
        <TabButton active={tab === "locate"} onClick={() => setTab("locate")}>
          Locate
        </TabButton>
        <TabButton active={tab === "add"} onClick={() => setTab("add")}>
          Add
        </TabButton>
      </div>

      {tab === "fleet" && (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {selectedVehicle && (
            <div className="shrink-0 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{selectedVehicle.vehicle_number}</p>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {selectedVehicle.driver_name}
                    {selectedLoc
                      ? ` · ${selectedLoc.latitude.toFixed(4)}, ${selectedLoc.longitude.toFixed(4)}`
                      : " · No GPS yet"}
                  </p>
                </div>
                <Button size="sm" variant="purple" onClick={() => setTab("locate")}>
                  Update location
                </Button>
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {loading && <LoadingText />}
            {!loading && vehicles.length === 0 && (
              <EmptyState
                title="No vehicles yet"
                description="Switch to Add to register your first vehicle."
              />
            )}
            {!loading &&
              vehicles.map((v) => {
                const loc = vehicleLocations[v.id];
                const selected = selectedVehicleId === v.id;
                const inside = Boolean(loc?.geofences?.length);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      dispatch(setSelectedVehicleId(v.id));
                      dispatch(fetchVehicleLocation(v.id));
                    }}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2.5 text-left transition",
                      selected
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-[var(--border)] bg-[var(--bg-elevated)]/60 hover:bg-[var(--panel-2)]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{v.vehicle_number}</p>
                        <p className="truncate text-xs text-[var(--muted)]">
                          {v.driver_name} · {v.vehicle_type}
                        </p>
                      </div>
                      {loc ? (
                        <Badge tone={inside ? "success" : "neutral"}>
                          {inside ? "Inside" : "Outside"}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">No GPS</Badge>
                      )}
                    </div>
                    {loc && (
                      <p className="mt-1.5 truncate text-xs text-[var(--muted)]">
                        {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        {inside
                          ? ` · ${loc.geofences.map((g) => g.geofence_name).join(", ")}`
                          : " · outside zones"}
                      </p>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {tab === "locate" && (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {!selectedVehicle ? (
            <EmptyState
              title="Select a vehicle first"
              description="Go to Fleet, pick a vehicle, then update its location."
            />
          ) : (
            <>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/70 px-3 py-2.5">
                <p className="text-sm font-semibold">{selectedVehicle.vehicle_number}</p>
                <p className="text-xs text-[var(--muted)]">
                  {selectedVehicle.driver_name} · {selectedVehicle.vehicle_type}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel>Latitude</FieldLabel>
                  <Input
                    value={pendingLocation ? pendingLocation.lat.toFixed(6) : lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="13.0827"
                    disabled={Boolean(pendingLocation)}
                  />
                </div>
                <div>
                  <FieldLabel>Longitude</FieldLabel>
                  <Input
                    value={pendingLocation ? pendingLocation.lng.toFixed(6) : lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="80.2707"
                    disabled={Boolean(pendingLocation)}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Place inside a zone</FieldLabel>
                <Select value={placeZoneId} onChange={(e) => placeInsideZone(e.target.value)}>
                  <option value="">Select geofence…</option>
                  {geofences.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={mapMode === "set-location" ? "purple" : "secondary"}
                  onClick={() => dispatch(setMapMode("set-location"))}
                >
                  Pick on map
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    dispatch(setPendingLocation(null));
                    setLat("");
                    setLng("");
                    setPlaceZoneId("");
                  }}
                >
                  Clear pin
                </Button>
              </div>

              <Button onClick={pushLocation} disabled={updating} variant="purple" className="w-full">
                {updating ? "Updating…" : "Send location"}
              </Button>
            </>
          )}

          {!selectedVehicle && (
            <Button variant="secondary" className="w-full" onClick={() => setTab("fleet")}>
              Back to fleet
            </Button>
          )}
        </div>
      )}

      {tab === "add" && (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <div>
            <FieldLabel>Vehicle number</FieldLabel>
            <Input
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="KA-01-AB-1234"
            />
          </div>
          <div>
            <FieldLabel>Driver name</FieldLabel>
            <Input
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Driver name"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                <option value="truck">Truck</option>
                <option value="van">Van</option>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
              </Select>
            </div>
            <div>
              <FieldLabel>Phone</FieldLabel>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91…"
              />
            </div>
          </div>
          <Button onClick={register} disabled={saving} variant="success" className="w-full">
            {saving ? "Registering…" : "Register vehicle"}
          </Button>
        </div>
      )}
    </Panel>
  );
}
