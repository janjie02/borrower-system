"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireStaffOrAbove } from "@/lib/auth";
import { logActivity, ActivityActions } from "@/lib/services/activity-log";
import { sendInvitationEmail } from "@/lib/services/email";
import { generateToken } from "@/lib/utils";
import type { StaffRole } from "@/types";

export async function createBorrowerInvitation(email: string) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: settings } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "invitation_expiration_hours")
    .single();

  const hours = settings?.value ?? 72;
  const token = generateToken();
  const expiresAt = new Date(Date.now() + Number(hours) * 60 * 60 * 1000);

  const { error } = await supabase.from("registration_invitations").insert({
    token,
    invitation_type: "borrower",
    email,
    expires_at: expiresAt.toISOString(),
    created_by: admin.id,
  });

  if (error) return { error: "Failed to create invitation" };

  await sendInvitationEmail(email, token, "borrower", expiresAt);
  await logActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ActivityActions.INVITATION_CREATED,
    targetType: "invitation",
    targetId: email,
    metadata: { type: "borrower" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    success: true,
    link: `${appUrl}/register/borrower/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function createStaffInvitation(email: string, staffRole: StaffRole = "staff") {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: settings } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "invitation_expiration_hours")
    .single();

  const hours = settings?.value ?? 72;
  const token = generateToken();
  const expiresAt = new Date(Date.now() + Number(hours) * 60 * 60 * 1000);

  const { error } = await supabase.from("registration_invitations").insert({
    token,
    invitation_type: "staff",
    staff_role: staffRole,
    email,
    expires_at: expiresAt.toISOString(),
    created_by: admin.id,
  });

  if (error) return { error: "Failed to create invitation" };

  await sendInvitationEmail(email, token, "staff", expiresAt);
  await logActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ActivityActions.INVITATION_CREATED,
    targetType: "invitation",
    targetId: email,
    metadata: { type: "staff", role: staffRole },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    success: true,
    link: `${appUrl}/register/staff/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function validateInvitation(token: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("registration_invitations")
    .select("*")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) return { valid: false, error: "Invalid or expired invitation" };
  return { valid: true, invitation: data };
}

export async function registerBorrower(params: {
  token: string;
  email: string;
  password: string;
  fullName: string;
  accountType: "student" | "teacher";
  idCode: string;
  year?: string;
  section?: string;
}) {
  const validation = await validateInvitation(params.token);
  if (!validation.valid) return { error: validation.error };

  const invitation = validation.invitation!;
  if (invitation.email.toLowerCase() !== params.email.toLowerCase()) {
    return { error: "Email does not match invitation" };
  }

  const supabase = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      full_name: params.fullName,
      role: "borrower",
    },
  });

  if (authError) return { error: authError.message };

  await supabase.from("borrower_profiles").insert({
    id: authData.user.id,
    account_type: params.accountType,
    id_code: params.idCode,
    year: params.accountType === "student" ? params.year : null,
    section: params.accountType === "student" ? params.section : null,
    credit_score: 500,
  });

  await supabase
    .from("profiles")
    .update({ account_status: "active", full_name: params.fullName })
    .eq("id", authData.user.id);

  await supabase
    .from("registration_invitations")
    .update({ used_at: new Date().toISOString(), used_by: authData.user.id })
    .eq("token", params.token);

  await logActivity({
    actorId: authData.user.id,
    actorEmail: params.email,
    action: ActivityActions.REGISTRATION,
    targetType: "borrower",
    targetId: authData.user.id,
  });

  return { success: true };
}

export async function registerStaff(params: {
  token: string;
  email: string;
  password: string;
  fullName: string;
  department?: string;
}) {
  const validation = await validateInvitation(params.token);
  if (!validation.valid) return { error: validation.error };

  const invitation = validation.invitation!;
  if (invitation.email.toLowerCase() !== params.email.toLowerCase()) {
    return { error: "Email does not match invitation" };
  }

  const supabase = createAdminClient();
  const role = invitation.staff_role ?? "staff";

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.fullName, role },
  });

  if (authError) return { error: authError.message };

  await supabase.from("staff_profiles").insert({
    id: authData.user.id,
    department: params.department,
  });

  await supabase
    .from("profiles")
    .update({
      role,
      account_status: "active",
      full_name: params.fullName,
    })
    .eq("id", authData.user.id);

  await supabase
    .from("registration_invitations")
    .update({ used_at: new Date().toISOString(), used_by: authData.user.id })
    .eq("token", params.token);

  await logActivity({
    actorId: authData.user.id,
    actorEmail: params.email,
    action: ActivityActions.REGISTRATION,
    targetType: "staff",
    targetId: authData.user.id,
    metadata: { role },
  });

  return { success: true };
}

export async function validateSetupToken(token: string) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("setup_tokens")
      .select("expires_at, used_at")
      .eq("token", token)
      .single();

    if (error || !data) return { valid: false, error: "Token not found in database" };
    if (data.used_at) return { valid: false, error: "This token was already used" };
    if (new Date(data.expires_at) < new Date()) return { valid: false, error: "Token expired — generate a new one in Supabase" };
    return { valid: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { valid: false, error: `Cannot connect to Supabase: ${message}` };
  }
}

export async function setupInitialAdmin(params: {
  token: string;
  email: string;
  password: string;
  fullName: string;
}) {
  try {
    const supabase = createAdminClient();

    const { data: setupToken, error: tokenError } = await supabase
      .from("setup_tokens")
      .select("*")
      .eq("token", params.token)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (tokenError || !setupToken) {
      return { error: "Invalid or expired setup token" };
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: { full_name: params.fullName },
    });

    if (authError) {
      // If user already exists from a previous attempt, promote them to admin
      if (authError.message?.toLowerCase().includes("already")) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(
          (u) => u.email?.toLowerCase() === params.email.toLowerCase()
        );
        if (!existing) return { error: authError.message };

        const { error: profileError } = await supabase
          .from("profiles")
          .update({ role: "admin", account_status: "active", full_name: params.fullName })
          .eq("id", existing.id);

        if (profileError) {
          return { error: `Could not promote existing user: ${profileError.message}` };
        }

        await supabase.auth.admin.updateUserById(existing.id, { password: params.password });
        await supabase
          .from("setup_tokens")
          .update({ used_at: new Date().toISOString(), used_by: existing.id })
          .eq("token", params.token);

        return { success: true };
      }
      return { error: authError.message };
    }

    if (!authData?.user) {
      return { error: "Account creation failed. Please try again." };
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "admin", account_status: "active", full_name: params.fullName })
      .eq("id", authData.user.id);

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { error: `Failed to set admin role: ${profileError.message}. Run the SQL fix in Supabase SQL Editor.` };
    }

    await supabase
      .from("setup_tokens")
      .update({ used_at: new Date().toISOString(), used_by: authData.user.id })
      .eq("token", params.token);

    return { success: true };
  } catch (err) {
    console.error("[setupInitialAdmin]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Setup failed: ${message}` };
  }
}

export async function loginAction(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ last_login_at: new Date().toISOString(), account_status: "active" })
    .eq("id", data.user.id);

  await logActivity({
    actorId: data.user.id,
    actorEmail: email,
    action: ActivityActions.LOGIN,
  });

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  return { success: true, role: profile?.role };
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { success: true };
}

export async function changeStaffRole(staffId: string, newRole: StaffRole | "admin") {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", staffId);

  if (error) return { error: "Failed to update role" };

  await logActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ActivityActions.STAFF_ROLE_CHANGED,
    targetType: "staff",
    targetId: staffId,
    metadata: { newRole },
  });

  return { success: true };
}

export async function toggleAccountStatus(userId: string, disable: boolean) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ account_status: disable ? "disabled" : "active" })
    .eq("id", userId);

  if (error) return { error: "Failed to update account" };

  await logActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ActivityActions.ACCOUNT_DISABLED,
    targetType: "user",
    targetId: userId,
    metadata: { disabled: disable },
  });

  return { success: true };
}
