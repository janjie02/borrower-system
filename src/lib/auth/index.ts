import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, UserRole } from "@/types";
import { getDashboardPath, hasPermission } from "@/types";

export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}

export async function requireAuth(): Promise<Profile> {
  const profile = await getCurrentUser();
  if (!profile) throw new Error("Unauthorized");
  if (profile.account_status === "disabled") throw new Error("Account disabled");
  return profile;
}

export async function requireRole(roles: UserRole[]): Promise<Profile> {
  const profile = await requireAuth();
  if (!roles.includes(profile.role)) throw new Error("Forbidden");
  return profile;
}

export async function requirePermission(permission: string): Promise<Profile> {
  const profile = await requireAuth();
  if (!hasPermission(profile.role, permission)) throw new Error("Forbidden");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  return requireRole(["admin"]);
}

export async function requireStaffOrAbove(): Promise<Profile> {
  return requireRole(["staff", "assistant_admin", "admin"]);
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return ["admin", "assistant_admin", "staff"].includes(role);
  }
  if (pathname.startsWith("/borrower")) {
    return role === "borrower";
  }
  return true;
}

export async function updateLastLogin(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", userId);
}

export { getDashboardPath };
