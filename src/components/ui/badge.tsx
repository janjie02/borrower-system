import { cn, capitalize } from "@/lib/utils";

interface BadgeProps {
  status: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-[#FFF8D6] text-[#92400E] border-[#FBC02D]",
  approved: "bg-[#E3F2FD] text-[#1565C0] border-[#1565C0]",
  rejected: "bg-red-50 text-red-700 border-red-200",
  active: "bg-green-50 text-green-700 border-green-200",
  returned: "bg-gray-50 text-gray-600 border-gray-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  available: "bg-green-50 text-green-700 border-green-200",
  borrowed: "bg-[#E3F2FD] text-[#1565C0] border-[#1565C0]",
  damaged: "bg-orange-50 text-orange-700 border-orange-200",
  lost: "bg-red-50 text-red-700 border-red-200",
  archived: "bg-gray-50 text-gray-500 border-gray-200",
};

export function Badge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusColors[status] ?? "bg-gray-50 text-gray-600 border-gray-200",
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
        "rounded-xl border p-5",
        accent
          ? "border-[#FBC02D] bg-[#FFF8D6]"
          : "border-[#E5E7EB] bg-white"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#6B7280]">{label}</p>
        {icon && <span className="text-[#1565C0]">{icon}</span>}
      </div>
      <p className={cn("mt-2 text-3xl font-bold", accent ? "text-[#92400E]" : "text-[#1565C0]")}>
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
      <div className="mb-4 rounded-full bg-[#E3F2FD] p-4">
        <svg className="h-8 w-8 text-[#1565C0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[#1F2937]">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-[#6B7280]">{description}</p>}
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
          "animate-spin rounded-full border-2 border-[#E3F2FD] border-t-[#1565C0]",
          sizes[size]
        )}
      />
    </div>
  );
}
