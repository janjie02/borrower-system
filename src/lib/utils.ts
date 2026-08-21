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
      color: "text-green-700",
      bgColor: "bg-green-100",
      gradient: "from-green-400 to-green-600",
    };
  }
  if (score >= 600) {
    return {
      label: "Good",
      color: "text-emerald-700",
      bgColor: "bg-emerald-100",
      gradient: "from-emerald-300 to-emerald-500",
    };
  }
  if (score >= 300) {
    return {
      label: "Fair",
      color: "text-amber-700",
      bgColor: "bg-amber-100",
      gradient: "from-amber-300 to-amber-500",
    };
  }
  return {
    label: "Poor",
    color: "text-red-700",
    bgColor: "bg-red-100",
    gradient: "from-red-400 to-red-600",
  };
}

export function getStatusBadgeColor(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-blue-100 text-blue-800 border-blue-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    active: "bg-green-100 text-green-800 border-green-200",
    returned: "bg-gray-100 text-gray-800 border-gray-200",
    cancelled: "bg-gray-100 text-gray-600 border-gray-200",
    overdue: "bg-red-100 text-red-800 border-red-200",
    available: "bg-green-100 text-green-800 border-green-200",
    borrowed: "bg-blue-100 text-blue-800 border-blue-200",
    damaged: "bg-orange-100 text-orange-800 border-orange-200",
    lost: "bg-red-100 text-red-800 border-red-200",
    archived: "bg-gray-100 text-gray-600 border-gray-200",
    good: "bg-green-100 text-green-800 border-green-200",
    minor_damage: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };
  return map[status] ?? "bg-gray-100 text-gray-800 border-gray-200";
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
