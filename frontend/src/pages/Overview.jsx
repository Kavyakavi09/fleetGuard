import { lazy, Suspense, useMemo } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import LiveAlerts from "../components/LiveAlerts";
import { Badge, Panel, PanelHeader, categoryLabel, categoryTone } from "../components/ui";
import { IconAlert, IconGeofence, IconLocate, IconPlus, IconVehicle } from "../components/icons";
import { cn } from "../utils/cn";

const FleetMap = lazy(() => import("../components/FleetMap"));

function StatCard({ label, value, hint, tone = "info" }) {
  const tones = {
    info: "from-blue-500/20 to-blue-500/5 text-blue-300",
    success: "from-emerald-500/20 to-emerald-500/5 text-emerald-300",
    danger: "from-rose-500/20 to-rose-500/5 text-rose-300",
    purple: "from-violet-500/20 to-violet-500/5 text-violet-300",
  };
  return (
    <div
      className={cn(
        "animate-fade-up rounded-2xl border border-[var(--border)] bg-gradient-to-br p-4 shadow-[var(--shadow)]",
        tones[tone]
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--fg)]">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs font-semibold">{hint}</p>}
    </div>
  );
}

function GeofenceDonut({ geofences }) {
  const counts = useMemo(() => {
    const base = {
      delivery_zone: 0,
      restricted_zone: 0,
      toll_zone: 0,
      customer_area: 0,
    };
    for (const g of geofences) {
      if (base[g.category] != null) base[g.category] += 1;
    }
    return base;
  }, [geofences]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const colors = {
    delivery_zone: "#3b82f6",
    restricted_zone: "#ef4444",
    toll_zone: "#a855f7",
    customer_area: "#22c55e",
  };
  const segments = Object.entries(counts);
  let offset = 0;
  const gradient = segments
    .map(([key, value]) => {
      const start = (offset / total) * 100;
      offset += value;
      const end = (offset / total) * 100;
      return `${colors[key]} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <Panel>
      <PanelHeader title="Geofence Overview" subtitle="Distribution by category" />
      <div className="flex items-center gap-5">
        <div
          className="relative h-28 w-28 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          <div className="absolute inset-3 flex items-center justify-center rounded-full bg-[var(--panel)]">
            <div className="text-center">
              <p className="font-[family-name:var(--font-display)] text-xl font-bold">
                {geofences.length}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">zones</p>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {segments.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: colors[key] }}
                />
                <span className="capitalize text-[var(--muted)]">{categoryLabel(key)}</span>
              </div>
              <span className="font-semibold text-[var(--fg)]">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export default function Overview() {
  const vehicles = useSelector((s) => s.vehicle.list);
  const geofences = useSelector((s) => s.geofence.list);
  const violations = useSelector((s) => s.violation.list);
  const liveAlerts = useSelector((s) => s.alert.live);
  const vehicleLocations = useSelector((s) => s.vehicle.locations);

  const todayEvents = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return violations.filter((v) => new Date(v.timestamp) >= start).length;
  }, [violations]);

  const statusRows = useMemo(() => {
    return vehicles.slice(0, 6).map((v) => {
      const loc = vehicleLocations[v.id];
      const inside = Boolean(loc?.geofences?.length);
      return {
        id: v.id,
        number: v.vehicle_number,
        zone: inside
          ? loc.geofences.map((g) => g.geofence_name).join(", ")
          : loc
            ? "Outside Zones"
            : "No location",
        category: loc?.geofences?.[0]?.category,
        inside,
        hasLocation: Boolean(loc),
      };
    });
  }, [vehicles, vehicleLocations]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Vehicles"
          value={vehicles.length}
          hint={vehicles.length ? "Fleet registered" : "Add your first vehicle"}
          tone="success"
        />
        <StatCard
          label="Geofences"
          value={geofences.length}
          hint="Active monitoring zones"
          tone="info"
        />
        <StatCard
          label="Active Alerts"
          value={liveAlerts.length}
          hint={liveAlerts.length ? "Realtime events queued" : "Stream quiet"}
          tone="danger"
        />
        <StatCard
          label="Today's Events"
          value={todayEvents}
          hint={`${violations.length} in history`}
          tone="purple"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
        <Panel padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                Live Fleet Map
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Geofence polygons and vehicle positions
              </p>
            </div>
          </div>
          <div className="map-shell h-[360px] w-full sm:h-[440px] xl:h-[520px]">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                  Loading map…
                </div>
              }
            >
              <FleetMap compact />
            </Suspense>
          </div>
        </Panel>

        <div className="space-y-4">
          <LiveAlerts featured />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Quick Actions" subtitle="Common operations" />
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/geofences"
              className="flex flex-col items-start gap-3 rounded-2xl bg-blue-500/15 p-4 transition hover:bg-blue-500/25"
            >
              <span className="rounded-xl bg-blue-500 p-2 text-white">
                <IconPlus className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">Create Geofence</span>
            </Link>
            <Link
              to="/vehicles"
              className="flex flex-col items-start gap-3 rounded-2xl bg-emerald-500/15 p-4 transition hover:bg-emerald-500/25"
            >
              <span className="rounded-xl bg-emerald-500 p-2 text-white">
                <IconVehicle className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">Add Vehicle</span>
            </Link>
            <Link
              to="/vehicles"
              className="flex flex-col items-start gap-3 rounded-2xl bg-violet-500/15 p-4 transition hover:bg-violet-500/25"
            >
              <span className="rounded-xl bg-violet-500 p-2 text-white">
                <IconLocate className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">Update Location</span>
            </Link>
            <Link
              to="/alerts"
              className="flex flex-col items-start gap-3 rounded-2xl bg-slate-500/15 p-4 transition hover:bg-slate-500/25"
            >
              <span className="rounded-xl bg-slate-600 p-2 text-white">
                <IconAlert className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">Configure Alerts</span>
            </Link>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Vehicle Status"
            subtitle="Current geofence presence"
            action={
              <Link to="/vehicles" className="text-xs font-semibold text-[var(--accent)]">
                View all
              </Link>
            }
          />
          <div className="space-y-2">
            {statusRows.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No vehicles registered yet.</p>
            )}
            {statusRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/70 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{row.number}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{row.zone}</p>
                </div>
                {row.hasLocation ? (
                  <Badge tone={row.inside ? categoryTone(row.category) || "success" : "neutral"}>
                    {row.inside ? "Inside" : "Outside"}
                  </Badge>
                ) : (
                  <Badge tone="neutral">Unknown</Badge>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <GeofenceDonut geofences={geofences} />
      </div>

      {geofences.length > 0 && (
        <Panel>
          <PanelHeader
            title="Active Zones"
            subtitle="Configured geofence inventory"
            action={
              <Link to="/geofences" className="text-xs font-semibold text-[var(--accent)]">
                Manage
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {geofences.slice(0, 4).map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/70 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <IconGeofence className="h-4 w-4 text-[var(--accent)]" />
                  <Badge tone={categoryTone(g.category)}>{categoryLabel(g.category)}</Badge>
                </div>
                <p className="truncate text-sm font-semibold">{g.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                  {g.description || "No description"}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
