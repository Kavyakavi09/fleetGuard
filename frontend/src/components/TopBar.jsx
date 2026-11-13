import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { IconBell, IconExpand, IconMenu } from "./icons";
import { cn } from "../utils/cn";

export default function TopBar({ title, onMenu }) {
  const connection = useSelector((s) => s.alert.connection);
  const liveCount = useSelector((s) => s.alert.live.length);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <header className="sticky top-0 z-30 mb-5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)]/80 px-3 py-3 shadow-[var(--shadow)] backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-2 text-[var(--fg)] lg:hidden"
          aria-label="Open menu"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </p>
          <p className="hidden text-xs text-[var(--muted)] sm:block">Fleet operations</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 md:flex">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              connection === "connected" ? "live-dot bg-emerald-400" : "bg-slate-500"
            )}
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--fg)]">
            {connection === "connected" ? "Live" : "Offline"}
          </span>
          <span className="text-[11px] text-[var(--muted)]">
            {now.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZone: "Asia/Calcutta",
            })}
          </span>
        </div>

        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel-2)] text-[var(--fg)] hover:bg-[var(--panel-3)]"
          aria-label="Notifications"
          title="Notifications"
        >
          <IconBell className="h-[20px] w-[20px]" />
          {liveCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--panel)]">
              {liveCount > 9 ? "9+" : liveCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="hidden rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-2 text-[var(--muted)] hover:text-[var(--fg)] sm:inline-flex"
          aria-label="Toggle fullscreen"
        >
          <IconExpand className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
