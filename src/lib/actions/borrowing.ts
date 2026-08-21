"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireStaffOrAbove } from "@/lib/auth";
import { logActivity, ActivityActions } from "@/lib/services/activity-log";
import {
  sendBorrowRequestSubmittedEmail,
  sendBorrowRequestApprovedEmail,
  sendBorrowRequestRejectedEmail,
  sendReturnConfirmationEmail,
} from "@/lib/services/email";
import {
  calculateReturnTiming,
  calculateConditionPenalty,
  calculateNewCreditScore,
  DEFAULT_CREDIT_SETTINGS,
} from "@/lib/services/credit";
import sharp from "sharp";
import type { ReturnCondition } from "@/types";

async function uploadTransactionPhoto(blob: Buffer, requestNumber: string): Promise<string> {
  const supabase = createAdminClient();
  const compressed = await sharp(blob).resize(800, 800, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
  const fileName = `${requestNumber}-${Date.now()}.jpg`;
  await supabase.storage
    .from("transaction-photos")
    .upload(fileName, compressed, { contentType: "image/jpeg" });
  return fileName;
}

async function generateRequestNumber(): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase.rpc("generate_request_number");
  return data as string;
}

export async function submitBorrowRequest(params: {
  items: { inventoryId: string; quantity: number }[];
  photoBase64: string;
  notes?: string;
  isGuest?: boolean;
  guestInfo?: {
    fullName: string;
    accountType: "student" | "teacher";
    email: string;
    phone: string;
    idCode: string;
    year?: string;
    section?: string;
  };
}) {
  if (!params.items.length) return { error: "No items selected" };

  const supabase = createAdminClient();
  const requestNumber = await generateRequestNumber();
  const photoBuffer = Buffer.from(
    params.photoBase64.split(",")[1] ?? params.photoBase64,
    "base64"
  );
  const photoPath = await uploadTransactionPhoto(photoBuffer, requestNumber);

  for (const item of params.items) {
    const { data: inv } = await supabase
      .from("inventory")
      .select("quantity_available, name, status")
      .eq("id", item.inventoryId)
      .single();

    if (!inv || inv.status === "archived") {
      return { error: `Item is no longer available` };
    }
    if (inv.quantity_available < item.quantity) {
      return { error: `Insufficient quantity for ${inv.name}` };
    }
  }

  let borrowerId: string | null = null;
  let guestProfileId: string | null = null;

  if (params.isGuest && params.guestInfo) {
    const { data: guest, error: guestError } = await supabase
      .from("guest_profiles")
      .insert({
        full_name: params.guestInfo.fullName,
        account_type: params.guestInfo.accountType,
        email: params.guestInfo.email,
        phone: params.guestInfo.phone,
        id_code: params.guestInfo.idCode,
        year: params.guestInfo.accountType === "student" ? params.guestInfo.year : null,
        section: params.guestInfo.accountType === "student" ? params.guestInfo.section : null,
        photo_path: photoPath,
      })
      .select()
      .single();

    if (guestError) return { error: "Failed to create guest profile" };
    guestProfileId = guest.id;
  } else {
    const user = await requireAuth();
    if (user.role !== "borrower") return { error: "Only borrowers can submit requests" };
    borrowerId = user.id;
  }

  const { data: request, error: reqError } = await supabase
    .from("borrow_requests")
    .insert({
      request_number: requestNumber,
      borrower_id: borrowerId,
      guest_profile_id: guestProfileId,
      is_guest: !!params.isGuest,
      status: "pending",
      photo_path: photoPath,
      notes: params.notes,
    })
    .select()
    .single();

  if (reqError) return { error: "Unable to submit your request. Please try again." };

  const requestItems = params.items.map((item) => ({
    request_id: request.id,
    inventory_id: item.inventoryId,
    quantity: item.quantity,
    status: "pending" as const,
  }));

  await supabase.from("borrow_request_items").insert(requestItems);

  await supabase.from("request_status_history").insert({
    request_id: request.id,
    from_status: null,
    to_status: "pending",
    changed_by: borrowerId,
    notes: "Request submitted",
  });

  const email =
    params.isGuest && params.guestInfo
      ? params.guestInfo.email
      : (await supabase.from("profiles").select("email").eq("id", borrowerId!).single()).data?.email;

  if (email) await sendBorrowRequestSubmittedEmail(email, requestNumber);

  await logActivity({
    actorId: borrowerId,
    actorEmail: email,
    action: ActivityActions.REQUEST_CREATED,
    targetType: "borrow_request",
    targetId: requestNumber,
  });

  return { success: true, requestNumber };
}

export async function approveBorrowRequest(
  requestId: string,
  borrowDate: string,
  dueDate: string
) {
  const staff = await requireStaffOrAbove();
  const supabase = createAdminClient();

  const { data: request } = await supabase
    .from("borrow_requests")
    .select("*, borrow_request_items(*)")
    .eq("id", requestId)
    .single();

  if (!request) return { error: "Request not found" };
  if (request.status !== "pending") return { error: "Request is not pending" };

  for (const item of request.borrow_request_items ?? []) {
    const { data: inv } = await supabase
      .from("inventory")
      .select("quantity_available, name")
      .eq("id", item.inventory_id)
      .single();

    if (!inv || inv.quantity_available < item.quantity) {
      return { error: `Insufficient quantity for ${inv?.name ?? "item"}` };
    }
  }

  for (const item of request.borrow_request_items ?? []) {
    const { data: inv } = await supabase
      .from("inventory")
      .select("quantity_available, quantity_borrowed")
      .eq("id", item.inventory_id)
      .single();

    if (inv) {
      await supabase
        .from("inventory")
        .update({
          quantity_available: inv.quantity_available - item.quantity,
          quantity_borrowed: inv.quantity_borrowed + item.quantity,
        })
        .eq("id", item.inventory_id);
    }
  }

  await supabase
    .from("borrow_requests")
    .update({
      status: "approved",
      borrow_date: borrowDate,
      due_date: dueDate,
      approved_by: staff.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  await supabase
    .from("borrow_request_items")
    .update({ status: "approved" })
    .eq("request_id", requestId);

  await supabase.from("request_status_history").insert({
    request_id: requestId,
    from_status: "pending",
    to_status: "approved",
    changed_by: staff.id,
    notes: `Approved. Due: ${dueDate}`,
  });

  let email: string | undefined;
  if (request.borrower_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", request.borrower_id)
      .single();
    email = profile?.email;
  } else if (request.guest_profile_id) {
    const { data: guest } = await supabase
      .from("guest_profiles")
      .select("email")
      .eq("id", request.guest_profile_id)
      .single();
    email = guest?.email;
  }

  if (email) {
    await sendBorrowRequestApprovedEmail(email, request.request_number, dueDate);
  }

  await logActivity({
    actorId: staff.id,
    actorEmail: staff.email,
    action: ActivityActions.REQUEST_APPROVED,
    targetType: "borrow_request",
    targetId: request.request_number,
  });

  return { success: true };
}

export async function rejectBorrowRequest(requestId: string, reason?: string) {
  const staff = await requireStaffOrAbove();
  const supabase = createAdminClient();

  const { data: request } = await supabase
    .from("borrow_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request || request.status !== "pending") {
    return { error: "Request cannot be rejected" };
  }

  await supabase
    .from("borrow_requests")
    .update({
      status: "rejected",
      rejected_by: staff.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq("id", requestId);

  await supabase.from("request_status_history").insert({
    request_id: requestId,
    from_status: "pending",
    to_status: "rejected",
    changed_by: staff.id,
    notes: reason,
  });

  let email: string | undefined;
  if (request.borrower_id) {
    const { data: p } = await supabase.from("profiles").select("email").eq("id", request.borrower_id).single();
    email = p?.email;
  } else if (request.guest_profile_id) {
    const { data: g } = await supabase.from("guest_profiles").select("email").eq("id", request.guest_profile_id).single();
    email = g?.email;
  }

  if (email) await sendBorrowRequestRejectedEmail(email, request.request_number, reason);

  await logActivity({
    actorId: staff.id,
    actorEmail: staff.email,
    action: ActivityActions.REQUEST_REJECTED,
    targetType: "borrow_request",
    targetId: request.request_number,
  });

  return { success: true };
}

export async function activateBorrowRequest(requestId: string) {
  const staff = await requireStaffOrAbove();
  const supabase = createAdminClient();

  const { data: request } = await supabase
    .from("borrow_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request || request.status !== "approved") {
    return { error: "Request must be approved first" };
  }

  await supabase
    .from("borrow_requests")
    .update({ status: "active", activated_at: new Date().toISOString() })
    .eq("id", requestId);

  await supabase
    .from("borrow_request_items")
    .update({ status: "active" })
    .eq("request_id", requestId);

  await supabase.from("request_status_history").insert({
    request_id: requestId,
    from_status: "approved",
    to_status: "active",
    changed_by: staff.id,
    notes: "Items physically released",
  });

  return { success: true };
}

export async function processReturn(params: {
  requestId: string;
  requestItemId: string;
  condition: ReturnCondition;
  notes?: string;
  barcode?: string;
}) {
  const staff = await requireStaffOrAbove();
  const supabase = createAdminClient();

  const { data: requestItem } = await supabase
    .from("borrow_request_items")
    .select("*, borrow_requests(*), inventory(*)")
    .eq("id", params.requestItemId)
    .eq("request_id", params.requestId)
    .single();

  if (!requestItem) return { error: "Item not found" };
  if (!["active", "overdue", "approved"].includes(requestItem.borrow_requests.status)) {
    return { error: "Request is not in a returnable state" };
  }

  if (params.barcode && requestItem.inventory.barcode !== params.barcode) {
    const { data: itemByBarcode } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("barcode", params.barcode)
      .single();
    if (!itemByBarcode || itemByBarcode.inventory_id !== requestItem.inventory_id) {
      return { error: "Barcode does not match this item" };
    }
  }

  const request = requestItem.borrow_requests;
  const dueDate = new Date(request.due_date);
  const returnDate = new Date();

  const timingResult = calculateReturnTiming(dueDate, returnDate);
  const conditionResult = calculateConditionPenalty(params.condition);
  const totalCreditChange = timingResult.creditChange + conditionResult.creditChange;

  await supabase.from("returns").insert({
    request_id: params.requestId,
    request_item_id: params.requestItemId,
    inventory_id: requestItem.inventory_id,
    return_date: returnDate.toISOString(),
    condition: params.condition,
    notes: params.notes,
    return_timing: timingResult.timing,
    days_late: timingResult.daysLate,
    processed_by: staff.id,
    credit_change: totalCreditChange,
  });

  const inv = requestItem.inventory;
  const updates: Record<string, number> = {
    quantity_borrowed: Math.max(0, inv.quantity_borrowed - requestItem.quantity),
  };

  if (params.condition === "lost") {
    updates.quantity_lost = inv.quantity_lost + requestItem.quantity;
  } else if (params.condition === "damaged" || params.condition === "minor_damage") {
    updates.quantity_damaged = inv.quantity_damaged + requestItem.quantity;
  } else {
    updates.quantity_available = inv.quantity_available + requestItem.quantity;
  }

  await supabase.from("inventory").update(updates).eq("id", inv.id);

  await supabase
    .from("borrow_request_items")
    .update({ status: "returned" })
    .eq("id", params.requestItemId);

  const { data: remainingItems } = await supabase
    .from("borrow_request_items")
    .select("status")
    .eq("request_id", params.requestId)
    .neq("status", "returned");

  if (!remainingItems?.length) {
    await supabase
      .from("borrow_requests")
      .update({ status: "returned" })
      .eq("id", params.requestId);

    await supabase.from("request_status_history").insert({
      request_id: params.requestId,
      from_status: request.status,
      to_status: "returned",
      changed_by: staff.id,
      notes: "All items returned",
    });
  }

  if (request.borrower_id && !request.is_guest) {
    const { data: borrower } = await supabase
      .from("borrower_profiles")
      .select("credit_score")
      .eq("id", request.borrower_id)
      .single();

    if (borrower) {
      const { data: recentHistory } = await supabase
        .from("credit_history")
        .select("credit_change")
        .eq("borrower_id", request.borrower_id)
        .order("created_at", { ascending: false })
        .limit(10);

      const recentChanges = (recentHistory ?? []).map((h) => h.credit_change);
      const newScore = calculateNewCreditScore(
        borrower.credit_score,
        timingResult.creditChange,
        conditionResult.creditChange,
        recentChanges,
        DEFAULT_CREDIT_SETTINGS
      );

      await supabase
        .from("borrower_profiles")
        .update({ credit_score: newScore })
        .eq("id", request.borrower_id);

      const behavior = `${timingResult.behavior}. ${conditionResult.behavior}`;
      await supabase.from("credit_history").insert({
        borrower_id: request.borrower_id,
        transaction_type: "return",
        behavior,
        credit_change: totalCreditChange,
        new_score: newScore,
        reference_type: "return",
        reference_id: params.requestItemId,
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", request.borrower_id)
        .single();

      if (profile?.email) {
        await sendReturnConfirmationEmail(
          profile.email,
          request.request_number,
          requestItem.inventory.name,
          totalCreditChange
        );
      }
    }
  }

  const action =
    params.condition === "lost"
      ? ActivityActions.ITEM_LOST
      : params.condition !== "good"
      ? ActivityActions.ITEM_DAMAGED
      : ActivityActions.ITEM_RETURNED;

  await logActivity({
    actorId: staff.id,
    actorEmail: staff.email,
    action,
    targetType: "return",
    targetId: request.request_number,
    metadata: { condition: params.condition },
  });

  return { success: true, creditChange: totalCreditChange };
}

export async function getBorrowRequests(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireStaffOrAbove();
  const supabase = createAdminClient();
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;

  let query = supabase
    .from("borrow_requests")
    .select(
      `*, borrow_request_items(*, inventory(name, sku, barcode)),
       profiles!borrower_id(full_name, email, borrower_profiles(*)),
       guest_profiles(*)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.search) {
    query = query.or(`request_number.ilike.%${filters.search}%`);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) return { error: error.message };
  return { data, total: count ?? 0, page, pageSize };
}

export async function markOverdueRequests() {
  const supabase = createAdminClient();
  const { data } = await supabase.rpc("mark_overdue_requests");
  return { updated: data };
}
