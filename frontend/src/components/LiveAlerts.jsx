import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Badge,
  EmptyState,
  Panel,
  PanelHeader,
  categoryLabel,
  categoryTone,
  eventTone,
} from "./ui";
import { cn } from "../utils/cn";

function formatTime(ts) {
  return new Date(ts).toLocaleString("en-IN", {
    timeZone: "Asia/Calcutta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "short",
  });
}

function AlertCard({ alert, featured }) {
  const entry = alert.event_type === "entry";
  return (
    <div
      className={cn(
        "animate-fade-up rounded-2xl border p-3.5",
        featured
          ? "border-rose-500/40 bg-gradient-to-br from-rose-500/20 via-rose-500/10 to-transparent"
          : "border-[var(--border)] bg-[var(--bg-elevated)]/70"
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone={eventTone(alert.event_type)}>{alert.event_type}</Badge>
        <Badge tone={categoryTone(alert.geofence?.category)}>
          {categoryLabel(alert.geofence?.category || "")}
        </Badge>
      </div>
      <p className="text-sm font-semibold text-[var(--fg)]">
        {alert.vehicle?.vehicle_number}{" "}
        {entry ? "entered" : "exited"} {alert.geofence?.geofence_name}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {formatTime(alert.timestamp)} IST
        {alert.location
          ? ` · ${Number(alert.location.latitude).toFixed(4)}, ${Number(
              alert.location.longitude
            ).toFixed(4)}`
          : ""}
      </p>
      {featured && (
        <Link
          to="/violations"
          className="mt-3 inline-flex text-xs font-semibold text-rose-300 hover:text-rose-200"
        >
          View details →
        </Link>
      )}
    </div>
  );
}

export default function LiveAlerts({ featured = false }) {
  const liveAlerts = useSelector((s) => s.alert.live);
  const connection = useSelector((s) => s.alert.connection);
  const latest = liveAlerts[0];
  const rest = featured ? liveAlerts.slice(1, 8) : liveAlerts.slice(0, 12);

  return (
    <Panel className="h-full">
      <PanelHeader
        title="Live Alerts"
        subtitle="Realtime entry / exit feed"
        action={
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
              connection === "connected"
                ? "bg-emerald-500/15 text-emerald-300"
                : connection === "connecting"
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-slate-500/15 text-slate-300"
            )}
          >
            {connection}
          </span>
        }
      />

      <div className="space-y-3">
        {liveAlerts.length === 0 && (
          <EmptyState
            title="No live alerts yet"
            description="Alerts appear instantly when a vehicle enters or exits a monitored geofence."
          />
        )}

        {featured && latest && <AlertCard alert={latest} featured />}

        <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
          {(featured ? rest : liveAlerts.slice(0, 12)).map((a) => (
            <div
              key={a.event_id}
              className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 px-3 py-2.5"
            >
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  a.event_type === "entry" ? "bg-rose-400" : "bg-emerald-400"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {a.vehicle?.vehicle_number}{" "}
                  <span className="text-[var(--muted)]">
                    {a.event_type === "entry" ? "entered" : "exited"}
                  </span>{" "}
                  {a.geofence?.geofence_name}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {categoryLabel(a.geofence?.category || "")} · {formatTime(a.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
