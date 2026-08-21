"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { logActivity, ActivityActions } from "@/lib/services/activity-log";
import type { SystemSettings } from "@/types";

export async function getSettings(): Promise<SystemSettings> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("system_settings").select("key, value");

  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }

  return {
    organization_name: (settings.organization_name as string) ?? "Borrowing Management System",
    logo_url: (settings.logo_url as string) ?? "",
    default_borrowing_days: Number(settings.default_borrowing_days ?? 7),
    invitation_expiration_hours: Number(settings.invitation_expiration_hours ?? 72),
    photo_retention_days: (settings.photo_retention_days as SystemSettings["photo_retention_days"]) ?? "180",
    credit_settings: (settings.credit_settings as SystemSettings["credit_settings"]) ?? {},
    email_notifications: (settings.email_notifications as SystemSettings["email_notifications"]) ?? {},
    due_soon_days: Number(settings.due_soon_days ?? 1),
  } as SystemSettings;
}

export async function updateSettings(updates: Partial<SystemSettings>) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const mappings: Record<string, unknown> = {
    organization_name: updates.organization_name,
    logo_url: updates.logo_url,
    default_borrowing_days: updates.default_borrowing_days,
    invitation_expiration_hours: updates.invitation_expiration_hours,
    photo_retention_days: updates.photo_retention_days,
    credit_settings: updates.credit_settings,
    email_notifications: updates.email_notifications,
    due_soon_days: updates.due_soon_days,
  };

  for (const [key, value] of Object.entries(mappings)) {
    if (value !== undefined) {
      await supabase
        .from("system_settings")
        .upsert({ key, value, updated_by: admin.id, updated_at: new Date().toISOString() });
    }
  }

  await logActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ActivityActions.SETTINGS_CHANGED,
    metadata: updates as Record<string, unknown>,
  });

  return { success: true };
}

export async function getAdminDashboardStats(dateRange?: { from: string; to: string }) {
  const supabase = createAdminClient();

  const [
    inventoryRes,
    borrowersRes,
    staffRes,
    pendingRes,
    overdueRes,
    activeRes,
    totalBorrowingsRes,
  ] = await Promise.all([
    supabase.from("inventory").select("quantity_total, quantity_available, quantity_borrowed, quantity_damaged, quantity_lost, status").neq("status", "archived"),
    supabase.from("borrower_profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["staff", "assistant_admin", "admin"]),
    supabase.from("borrow_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("borrow_requests").select("id", { count: "exact", head: true }).eq("status", "overdue"),
    supabase.from("borrow_requests").select("id", { count: "exact", head: true }).in("status", ["active", "overdue"]),
    supabase.from("borrow_requests").select("id", { count: "exact", head: true }),
  ]);

  const inventory = inventoryRes.data ?? [];
  return {
    totalInventory: inventory.reduce((s, i) => s + i.quantity_total, 0),
    availableItems: inventory.reduce((s, i) => s + i.quantity_available, 0),
    currentlyBorrowed: inventory.reduce((s, i) => s + i.quantity_borrowed, 0),
    overdue: overdueRes.count ?? 0,
    totalBorrowers: borrowersRes.count ?? 0,
    totalStaff: staffRes.count ?? 0,
    pendingRequests: pendingRes.count ?? 0,
    totalBorrowings: totalBorrowingsRes.count ?? 0,
    inventoryBreakdown: {
      available: inventory.reduce((s, i) => s + i.quantity_available, 0),
      borrowed: inventory.reduce((s, i) => s + i.quantity_borrowed, 0),
      damaged: inventory.reduce((s, i) => s + i.quantity_damaged, 0),
      lost: inventory.reduce((s, i) => s + i.quantity_lost, 0),
    },
  };
}

export async function getBorrowerDashboardStats(borrowerId: string) {
  const supabase = createAdminClient();

  const [activeRes, historyRes, overdueRes, creditRes, mostBorrowedRes] = await Promise.all([
    supabase.from("borrow_requests").select("id", { count: "exact", head: true }).eq("borrower_id", borrowerId).in("status", ["active", "approved", "overdue"]),
    supabase.from("borrow_requests").select("id", { count: "exact", head: true }).eq("borrower_id", borrowerId),
    supabase.from("borrow_requests").select("id", { count: "exact", head: true }).eq("borrower_id", borrowerId).eq("status", "overdue"),
    supabase.from("borrower_profiles").select("credit_score").eq("id", borrowerId).single(),
    supabase
      .from("borrow_request_items")
      .select("inventory_id, quantity, inventory(name)")
      .in("request_id", (
        await supabase.from("borrow_requests").select("id").eq("borrower_id", borrowerId)
      ).data?.map((r) => r.id) ?? []),
  ]);

  const items = mostBorrowedRes.data ?? [];
  const itemCounts: Record<string, { name: string; count: number }> = {};
  for (const item of items) {
    const inv = item.inventory as unknown as { name: string } | null;
    if (!inv) continue;
    if (!itemCounts[item.inventory_id]) itemCounts[item.inventory_id] = { name: inv.name, count: 0 };
    itemCounts[item.inventory_id].count += item.quantity;
  }
  const mostBorrowed = Object.values(itemCounts).sort((a, b) => b.count - a.count)[0];

  const creditScore = creditRes.data?.credit_score ?? 500;

  return {
    currentlyBorrowed: activeRes.count ?? 0,
    totalBorrowed: historyRes.count ?? 0,
    itemsDue: activeRes.count ?? 0,
    overdueCount: overdueRes.count ?? 0,
    mostBorrowedItem: mostBorrowed?.name ?? "—",
    mostBorrowedCount: mostBorrowed?.count ?? 0,
    creditScore,
  };
}

export async function getChartData(type: string, days = 30) {
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  if (type === "borrowing_activity") {
    const { data } = await supabase
      .from("borrow_requests")
      .select("created_at, status")
      .gte("created_at", since.toISOString())
      .order("created_at");
    const byDate: Record<string, number> = {};
    for (const r of data ?? []) {
      const date = r.created_at.split("T")[0];
      byDate[date] = (byDate[date] ?? 0) + 1;
    }
    return Object.entries(byDate).map(([date, count]) => ({ date, count }));
  }

  if (type === "most_borrowed") {
    const { data } = await supabase
      .from("borrow_request_items")
      .select("quantity, inventory(name)")
      .gte("created_at", since.toISOString());
    const counts: Record<string, number> = {};
    for (const item of data ?? []) {
      const name = (item.inventory as unknown as { name: string } | null)?.name ?? "Unknown";
      counts[name] = (counts[name] ?? 0) + item.quantity;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  if (type === "return_performance") {
    const { data } = await supabase
      .from("returns")
      .select("return_timing")
      .gte("created_at", since.toISOString());
    const counts: Record<string, number> = {};
    for (const r of data ?? []) {
      const key = r.return_timing ?? "on_time";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts).map(([timing, count]) => ({ timing, count }));
  }

  if (type === "credit_distribution") {
    const { data } = await supabase.from("borrower_profiles").select("credit_score");
    const tiers = { green: 0, light_green: 0, orange: 0, red: 0 };
    for (const b of data ?? []) {
      if (b.credit_score >= 800) tiers.green++;
      else if (b.credit_score >= 600) tiers.light_green++;
      else if (b.credit_score >= 300) tiers.orange++;
      else tiers.red++;
    }
    return Object.entries(tiers).map(([tier, count]) => ({ tier, count }));
  }

  return [];
}

export async function getActivityLogs(search?: string, page = 1, pageSize = 50) {
  await requireAdmin();
  const supabase = createAdminClient();

  let query = supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`action.ilike.%${search}%,actor_email.ilike.%${search}%,target_id.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) return { error: error.message };
  return { data, total: count ?? 0, page, pageSize };
}

export async function exportReport(type: string): Promise<string> {
  await requireAdmin();
  const supabase = createAdminClient();

  let rows: string[][] = [];
  let headers: string[] = [];

  if (type === "borrowing_history") {
    headers = ["Request #", "Status", "Borrow Date", "Due Date", "Created"];
    const { data } = await supabase
      .from("borrow_requests")
      .select("request_number, status, borrow_date, due_date, created_at")
      .order("created_at", { ascending: false });
    rows = (data ?? []).map((r) => [
      r.request_number, r.status, r.borrow_date ?? "", r.due_date ?? "", r.created_at,
    ]);
  } else if (type === "inventory") {
    headers = ["Name", "SKU", "Barcode", "Total", "Available", "Borrowed", "Status"];
    const { data } = await supabase.from("inventory").select("*").neq("status", "archived");
    rows = (data ?? []).map((i) => [
      i.name, i.sku, i.barcode, String(i.quantity_total), String(i.quantity_available),
      String(i.quantity_borrowed), i.status,
    ]);
  } else if (type === "overdue") {
    headers = ["Request #", "Due Date", "Status"];
    const { data } = await supabase
      .from("borrow_requests")
      .select("request_number, due_date, status")
      .eq("status", "overdue");
    rows = (data ?? []).map((r) => [r.request_number, r.due_date ?? "", r.status]);
  }

  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
  return csv;
}
