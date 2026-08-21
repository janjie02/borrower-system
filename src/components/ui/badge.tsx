import { cn, capitalize } from "@/lib/utils";

interface BadgeProps {
  status: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-400/15 text-amber-200 border-amber-300/30",
  approved: "bg-sky-400/15 text-sky-200 border-sky-300/30",
  rejected: "bg-red-400/15 text-red-200 border-red-300/30",
  active: "bg-emerald-400/15 text-emerald-200 border-emerald-300/30",
  returned: "bg-white/8 text-slate-200 border-white/15",
  cancelled: "bg-white/8 text-slate-300 border-white/15",
  overdue: "bg-red-400/15 text-red-200 border-red-300/30",
  available: "bg-emerald-400/15 text-emerald-200 border-emerald-300/30",
  borrowed: "bg-sky-400/15 text-sky-200 border-sky-300/30",
  damaged: "bg-orange-400/15 text-orange-200 border-orange-300/30",
  lost: "bg-red-400/15 text-red-200 border-red-300/30",
  archived: "bg-white/8 text-slate-300 border-white/15",
  good: "bg-emerald-400/15 text-emerald-200 border-emerald-300/30",
  minor_damage: "bg-amber-400/15 text-amber-200 border-amber-300/30",
};

export function Badge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusColors[status] ?? "bg-white/8 text-slate-200 border-white/15",
        className
      )}
    >
      {capitalize(status)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  accent = false,
  icon,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-lg shadow-black/10 transition-colors",
        accent
          ? "border-accent/40 bg-accent-soft"
          : "border-white/10 bg-surface hover:border-white/20"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && (
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              accent ? "bg-accent text-[#0D2B66]" : "bg-white/10 text-accent"
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className={cn("mt-3 text-3xl font-bold", accent ? "text-accent" : "text-white")}>
        {value}
      </p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-white/8 p-4 ring-1 ring-white/10">
        <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" };
  return (
    <div className="flex items-center justify-center p-8">
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-white/15 border-t-accent",
          sizes[size]
        )}
      />
    </div>
  );
}
