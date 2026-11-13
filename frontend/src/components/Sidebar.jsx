import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { cn } from "../utils/cn";
import {
  IconAlert,
  IconClose,
  IconDashboard,
  IconGeofence,
  IconHistory,
  IconMap,
  IconVehicle,
} from "./icons";

const links = [
  { to: "/", label: "Dashboard", end: true, icon: IconDashboard },
  { to: "/map", label: "Live Map", icon: IconMap },
  { to: "/geofences", label: "Geofences", icon: IconGeofence },
  { to: "/vehicles", label: "Vehicles", icon: IconVehicle },
  { to: "/alerts", label: "Alerts", icon: IconAlert, badgeKey: "alerts" },
  { to: "/violations", label: "Violations", icon: IconHistory },
];

export default function Sidebar({ open, onClose }) {
  const liveCount = useSelector((s) => s.alert.live.length);
  const connection = useSelector((s) => s.alert.connection);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-[272px] flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-elevated)]/95 px-4 py-5 shadow-[var(--shadow)] backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-7 flex items-start justify-between gap-3 px-2">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--fg)]">
              FleetGuard
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              Live tracking
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--fg)] lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            const badge = link.badgeKey === "alerts" ? liveCount : 0;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={Boolean(link.end)}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-[var(--accent)] text-white shadow-[0_10px_28px_rgba(59,130,246,0.28)]"
                      : "text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--fg)]"
                  )
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" />
                <span className="flex-1">{link.label}</span>
                {badge > 0 && (
                  <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/70 px-3 py-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  connection === "connected"
                    ? "live-dot bg-emerald-400"
                    : connection === "connecting"
                      ? "bg-amber-400"
                      : "bg-slate-500"
                )}
              />
              <p className="text-xs font-semibold text-[var(--fg)]">
                {connection === "connected"
                  ? "Realtime connected"
                  : connection === "connecting"
                    ? "Connecting…"
                    : "Realtime offline"}
              </p>
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted)]">WebSocket alert stream</p>
          </div>

          <div className="flex items-center gap-3 rounded-xl px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-bold text-white">
              FG
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Fleet Ops</p>
              <p className="truncate text-[11px] text-[var(--muted)]">Control room</p>
            </div>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-[var(--border)] bg-[var(--bg-elevated)]/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        {links.slice(0, 5).map((link) => {
          const Icon = link.icon;
          const badge = link.badgeKey === "alerts" ? liveCount : 0;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={Boolean(link.end)}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium",
                  isActive ? "bg-[var(--panel-2)] text-[var(--fg)]" : "text-[var(--muted)]"
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span>{link.label.split(" ")[0]}</span>
              {badge > 0 && (
                <span className="absolute right-2 top-1 h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
