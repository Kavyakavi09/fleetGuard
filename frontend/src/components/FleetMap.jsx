import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
  CircleMarker,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { setDraftPolygon, setPendingLocation } from "../store/mapSlice";
import { getCoverageCentroid, getCoverageFitPoints } from "../utils/geo";
import { cn } from "../utils/cn";

const categoryColors = {
  delivery_zone: "#3b82f6",
  restricted_zone: "#ef4444",
  toll_zone: "#a855f7",
  customer_area: "#22c55e",
};

const FALLBACK_CENTER = [13.0827, 80.2707];
const FALLBACK_ZOOM = 13;

function fitMapToData(map, geofences, vehicleLocations) {
  const points = getCoverageFitPoints(geofences, vehicleLocations);
  if (points.length === 0) {
    const centroid = getCoverageCentroid(geofences, vehicleLocations);
    map.setView(centroid ? [centroid.lat, centroid.lng] : FALLBACK_CENTER, FALLBACK_ZOOM);
    return;
  }
  if (points.length === 1) {
    map.setView(points[0], 14);
    return;
  }
  map.fitBounds(points, { padding: [48, 48], maxZoom: 15 });
}

function vehicleIcon(selected) {
  const color = selected ? "#22c55e" : "#3b82f6";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:18px;height:18px;border-radius:999px;
      background:${color};border:2px solid #fff;
      box-shadow:0 0 0 4px ${color}33, 0 8px 18px rgba(0,0,0,.45);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function MapClickHandler({ enabled }) {
  const dispatch = useDispatch();
  useMapEvents({
    click(e) {
      if (!enabled) return;
      dispatch(setPendingLocation({ lat: e.latlng.lat, lng: e.latlng.lng }));
    },
  });
  return null;
}

function DrawHandler({ enabled }) {
  const dispatch = useDispatch();
  const draftPolygon = useSelector((s) => s.map.draftPolygon);
  useMapEvents({
    click(e) {
      if (!enabled) return;
      dispatch(setDraftPolygon([...(draftPolygon || []), [e.latlng.lat, e.latlng.lng]]));
    },
  });
  return null;
}

function AutoFitOnLoad({ geofences, vehicleLocations }) {
  const map = useMap();
  const fittedKeyRef = useRef("");

  const dataKey = useMemo(() => {
    const geoKey = (geofences || []).map((g) => g.id).join(",");
    const locKey = Object.keys(vehicleLocations || {}).sort().join(",");
    return `${geoKey}|${locKey}`;
  }, [geofences, vehicleLocations]);

  useEffect(() => {
    const hasData =
      (geofences && geofences.length > 0) || Object.keys(vehicleLocations || {}).length > 0;
    if (!hasData) return;
    if (fittedKeyRef.current === dataKey) return;
    fittedKeyRef.current = dataKey;
    // Wait a tick so the map has a real size before fitting.
    const id = setTimeout(() => fitMapToData(map, geofences, vehicleLocations), 50);
    return () => clearTimeout(id);
  }, [map, geofences, vehicleLocations, dataKey]);

  return null;
}

function MapViewControls({ geofences, vehicleLocations }) {
  const map = useMap();
  const dataRef = useRef({ geofences, vehicleLocations });
  dataRef.current = { geofences, vehicleLocations };

  useEffect(() => {
    const Control = L.Control.extend({
      onAdd() {
        const container = L.DomUtil.create("div", "leaflet-bar leaflet-control map-view-controls");

        const zoomIn = L.DomUtil.create("a", "map-ctrl-btn", container);
        zoomIn.href = "#";
        zoomIn.title = "Zoom in";
        zoomIn.setAttribute("role", "button");
        zoomIn.setAttribute("aria-label", "Zoom in");
        zoomIn.innerHTML = "+";

        const zoomOut = L.DomUtil.create("a", "map-ctrl-btn", container);
        zoomOut.href = "#";
        zoomOut.title = "Zoom out";
        zoomOut.setAttribute("role", "button");
        zoomOut.setAttribute("aria-label", "Zoom out");
        zoomOut.innerHTML = "−";

        const reset = L.DomUtil.create("a", "map-ctrl-btn", container);
        reset.href = "#";
        reset.title = "Fit geofences & vehicles";
        reset.setAttribute("role", "button");
        reset.setAttribute("aria-label", "Reset map view");
        reset.innerHTML = "↺";

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(zoomIn, "click", L.DomEvent.stop).on(zoomIn, "click", () => map.zoomIn());
        L.DomEvent.on(zoomOut, "click", L.DomEvent.stop).on(zoomOut, "click", () => map.zoomOut());
        L.DomEvent.on(reset, "click", L.DomEvent.stop).on(reset, "click", () => {
          const { geofences: g, vehicleLocations: v } = dataRef.current;
          fitMapToData(map, g, v);
        });

        return container;
      },
    });

    const control = new Control({ position: "topright" });
    map.addControl(control);
    return () => {
      map.removeControl(control);
    };
  }, [map]);

  return null;
}

export default function FleetMap({ compact = false }) {
  const geofences = useSelector((s) => s.geofence.list);
  const vehicles = useSelector((s) => s.vehicle.list);
  const vehicleLocations = useSelector((s) => s.vehicle.locations);
  const mapMode = useSelector((s) => s.map.mode);
  const draftPolygon = useSelector((s) => s.map.draftPolygon);
  const pendingLocation = useSelector((s) => s.map.pendingLocation);
  const selectedVehicleId = useSelector((s) => s.ui.selectedVehicleId);

  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <div
      className={cn(
        "map-shell h-full min-h-0 w-full overflow-hidden",
        compact ? "" : "min-h-[420px] rounded-2xl border border-[var(--border)]"
      )}
    >
      {mapMode !== "view" && (
        <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-xl border border-[var(--border)] bg-[var(--panel)]/90 px-3 py-2 text-xs font-medium text-[var(--fg)] shadow-[var(--shadow)] backdrop-blur">
          {mapMode === "draw-geofence"
            ? `Drawing geofence · ${draftPolygon?.length || 0} points`
            : "Click map to set vehicle location"}
        </div>
      )}

      <MapContainer
        center={FALLBACK_CENTER}
        zoom={FALLBACK_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoFitOnLoad geofences={geofences} vehicleLocations={vehicleLocations} />
        <MapViewControls geofences={geofences} vehicleLocations={vehicleLocations} />
        <MapClickHandler enabled={mapMode === "set-location"} />
        <DrawHandler enabled={mapMode === "draw-geofence"} />

        {geofences.map((g) => {
          // Polygons capture clicks by default — disable while picking/drawing
          // so users can place a vehicle inside a zone.
          const allowLayerClicks = mapMode === "view";
          return (
            <Polygon
              key={g.id}
              positions={g.coordinates.map((c) => [c[0], c[1]])}
              pathOptions={{
                color: categoryColors[g.category] || "#94a3b8",
                fillColor: categoryColors[g.category] || "#94a3b8",
                fillOpacity: mapMode === "set-location" ? 0.35 : 0.22,
                weight: 2.5,
                interactive: allowLayerClicks,
              }}
            >
              {allowLayerClicks && (
                <Tooltip direction="top" sticky>
                  <span className="rounded-md bg-slate-950/90 px-2 py-1 text-[11px] font-semibold text-white">
                    {g.name} · {g.category.replaceAll("_", " ")}
                  </span>
                </Tooltip>
              )}
              {allowLayerClicks && (
                <Popup>
                  <strong>{g.name}</strong>
                  <br />
                  {g.category.replaceAll("_", " ")}
                  {g.description ? (
                    <>
                      <br />
                      {g.description}
                    </>
                  ) : null}
                </Popup>
              )}
            </Polygon>
          );
        })}

        {draftPolygon?.length > 0 && (
          <Polygon
            positions={draftPolygon.map((c) => [c[0], c[1]])}
            pathOptions={{
              color: "#3b82f6",
              dashArray: "6 6",
              fillOpacity: 0.15,
              weight: 2,
              interactive: false,
            }}
          />
        )}

        {vehicles.map((v) => {
          const loc = vehicleLocations[v.id];
          if (!loc) return null;
          const selected = selectedVehicleId === v.id;
          const inside = loc.geofences?.length > 0;
          return (
            <Marker
              key={v.id}
              position={[loc.latitude, loc.longitude]}
              icon={vehicleIcon(selected || inside)}
            >
              <Popup>
                <strong>{v.vehicle_number}</strong>
                <br />
                {v.driver_name}
                <br />
                {inside
                  ? `Inside ${loc.geofences.map((g) => g.geofence_name).join(", ")}`
                  : "Outside zones"}
              </Popup>
            </Marker>
          );
        })}

        {pendingLocation && (
          <CircleMarker
            center={[pendingLocation.lat, pendingLocation.lng]}
            radius={10}
            pathOptions={{ color: "#a855f7", fillColor: "#a855f7", fillOpacity: 0.75 }}
          >
            <Popup>Pending location update</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}
