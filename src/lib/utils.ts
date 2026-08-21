import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getCreditStatus(score: number): {
  label: string;
  color: string;
  bgColor: string;
  gradient: string;
} {
  if (score >= 800) {
    return {
      label: "Excellent",
      color: "text-emerald-300",
      bgColor: "bg-emerald-400/15",
      gradient: "from-emerald-400 to-emerald-600",
    };
  }
  if (score >= 600) {
    return {
      label: "Good",
      color: "text-emerald-300",
      bgColor: "bg-emerald-400/15",
      gradient: "from-emerald-300 to-emerald-500",
    };
  }
  if (score >= 300) {
    return {
      label: "Fair",
      color: "text-amber-300",
      bgColor: "bg-amber-400/15",
      gradient: "from-amber-300 to-amber-500",
    };
  }
  return {
    label: "Poor",
    color: "text-red-300",
    bgColor: "bg-red-400/15",
    gradient: "from-red-400 to-red-600",
  };
}

export function getStatusBadgeColor(status: string): string {
  const map: Record<string, string> = {
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
  return map[status] ?? "bg-white/8 text-slate-200 border-white/15";
}

export function capitalize(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { data: T[]; total: number; totalPages: number; page: number } {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    total,
    totalPages,
    page,
  };
}

export const APP_NAME = "Borrowing Management System";

export const BRAND = {
  primary: "#1565C0",
  primaryDark: "#0D47A1",
  primaryLight: "#E3F2FD",
  accent: "#FBC02D",
  accentLight: "#FFF8D6",
  white: "#FFFFFF",
  textDark: "#1F2937",
  textMuted: "#6B7280",
  border: "#E5E7EB",
} as const;
