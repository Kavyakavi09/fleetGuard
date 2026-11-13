import { cn } from "../utils/cn";

export function Button({ className, variant = "default", size = "md", ...props }) {
  const variants = {
    default:
      "bg-[var(--accent)] text-white shadow-[0_8px_24px_rgba(59,130,246,0.28)] hover:brightness-110",
    secondary:
      "bg-[var(--panel-2)] text-[var(--fg)] border border-[var(--border)] hover:bg-[var(--panel-3)]",
    success:
      "bg-[var(--success)] text-white shadow-[0_8px_24px_rgba(34,197,94,0.25)] hover:brightness-110",
    purple:
      "bg-[var(--accent-3)] text-white shadow-[0_8px_24px_rgba(168,85,247,0.28)] hover:brightness-110",
    danger:
      "bg-[var(--danger)] text-white shadow-[0_8px_24px_rgba(239,68,68,0.25)] hover:brightness-110",
    ghost: "bg-transparent text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--fg)]",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-sm",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "flex min-h-[84px] w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
        className
      )}
      {...props}
    />
  );
}

export function Panel({ className, children, padded = true, ...props }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--panel)]/90 shadow-[var(--shadow)] backdrop-blur-sm",
        padded && "p-4",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function PanelHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div>
        <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }) {
  const tones = {
    neutral: "bg-slate-500/15 text-slate-300 ring-slate-500/20",
    success: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
    danger: "bg-rose-500/15 text-rose-300 ring-rose-500/25",
    warn: "bg-amber-500/15 text-amber-300 ring-amber-500/25",
    info: "bg-blue-500/15 text-blue-300 ring-blue-500/25",
    purple: "bg-violet-500/15 text-violet-300 ring-violet-500/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        tones[tone] || tones.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

export function LoadingText({ label = "Loading…" }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/60 px-4 py-8 text-center">
      <p className="text-sm font-medium text-[var(--fg)]">{title}</p>
      {description && <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>}
    </div>
  );
}

export function FieldLabel({ children }) {
  return <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]">{children}</label>;
}

export function categoryLabel(category = "") {
  return category.replaceAll("_", " ");
}

export function categoryTone(category) {
  switch (category) {
    case "restricted_zone":
      return "danger";
    case "delivery_zone":
      return "info";
    case "toll_zone":
      return "purple";
    case "customer_area":
      return "success";
    default:
      return "neutral";
  }
}

export function eventTone(eventType) {
  return eventType === "entry" ? "danger" : "success";
}
