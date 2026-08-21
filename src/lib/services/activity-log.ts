import { createAdminClient } from "@/lib/supabase/admin";

export async function logActivity(params: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("activity_logs").insert({
      actor_id: params.actorId ?? null,
      actor_email: params.actorEmail ?? null,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (error) {
    console.error("[ActivityLog] Failed to log:", error);
  }
}

export const ActivityActions = {
  LOGIN: "login",
  LOGOUT: "logout",
  REGISTRATION: "registration",
  INVENTORY_ADDED: "inventory_added",
  INVENTORY_EDITED: "inventory_edited",
  INVENTORY_ARCHIVED: "inventory_archived",
  REQUEST_CREATED: "borrow_request_created",
  REQUEST_APPROVED: "borrow_request_approved",
  REQUEST_REJECTED: "borrow_request_rejected",
  ITEM_RETURNED: "item_returned",
  ITEM_DAMAGED: "item_marked_damaged",
  ITEM_LOST: "item_marked_lost",
  STAFF_ROLE_CHANGED: "staff_role_changed",
  ACCOUNT_DISABLED: "account_disabled",
  SETTINGS_CHANGED: "settings_changed",
  INVITATION_CREATED: "invitation_created",
} as const;
