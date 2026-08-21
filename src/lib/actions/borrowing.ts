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

function formatItemLines(
  items: { quantity: number; inventory?: { name?: string } | null; inventory_id?: string }[],
  nameMap?: Map<string, string>
): string[] {
  return items.map((item) => {
    const name =
      item.inventory?.name ??
      (item.inventory_id ? nameMap?.get(item.inventory_id) : undefined) ??
      "Item";
    return `${name} × ${item.quantity}`;
  });
}

export async function getTransactionPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  await requireStaffOrAbove();
  const supabase = createAdminClient();
  const { data } = await supabase.storage
    .from("transaction-photos")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function lookupBorrowRequestByNumber(requestNumber: string) {
  const cleaned = requestNumber.trim().toUpperCase();
  if (!cleaned) return { error: "Enter a request number" };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("borrow_requests")
    .select(
      `request_number, status, borrow_date, due_date, is_guest, created_at, notes, rejection_reason,
       borrow_request_items(quantity, inventory(name, sku)),
       guest_profiles(full_name, email, phone, id_code, account_type, year, section),
       profiles!borrower_id(full_name, email)`
    )
    .ilike("request_number", cleaned)
    .maybeSingle();

  if (error) return { error: "Unable to look up that request" };
  if (!data) return { error: "No request found with that reference number" };

  const guestRaw = data.guest_profiles as unknown;
  const profileRaw = data.profiles as unknown;
  const guest = (Array.isArray(guestRaw) ? guestRaw[0] : guestRaw) as {
    full_name: string;
    email: string;
    phone: string;
    id_code: string;
    account_type: string;
    year?: string | null;
    section?: string | null;
  } | null;
  const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as {
    full_name: string;
    email: string;
  } | null;

  const rawItems = (data.borrow_request_items as unknown as {
    quantity: number;
    inventory: { name: string; sku: string } | { name: string; sku: string }[] | null;
  }[]) ?? [];

  return {
    data: {
      requestNumber: data.request_number as string,
      status: data.status as string,
      borrowDate: data.borrow_date as string | null,
      dueDate: data.due_date as string | null,
      isGuest: data.is_guest as boolean,
      createdAt: data.created_at as string,
      notes: data.notes as string | null,
      rejectionReason: data.rejection_reason as string | null,
      borrowerName: guest?.full_name ?? profile?.full_name ?? "Borrower",
      borrowerEmail: guest?.email ?? profile?.email ?? null,
      guestPhone: guest?.phone ?? null,
      guestIdCode: guest?.id_code ?? null,
      items: rawItems.map((item) => {
        const inv = Array.isArray(item.inventory) ? item.inventory[0] : item.inventory;
        return {
          name: inv?.name ?? "Item",
          sku: inv?.sku ?? "",
          quantity: item.quantity,
        };
      }),
    },
  };
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
    const guestEmail = params.guestInfo.email.trim().toLowerCase();
    if (!guestEmail.includes("@")) {
      return { error: "Please enter a valid email address" };
    }

    const { data: guest, error: guestError } = await supabase
      .from("guest_profiles")
      .insert({
        full_name: params.guestInfo.fullName.trim(),
        account_type: params.guestInfo.accountType,
        email: guestEmail,
        phone: params.guestInfo.phone.trim(),
        id_code: params.guestInfo.idCode.trim(),
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

  let email: string | undefined;
  if (params.isGuest && guestProfileId) {
    // Always use the email the guest entered (saved on their guest profile)
    const { data: guestRow } = await supabase
      .from("guest_profiles")
      .select("email")
      .eq("id", guestProfileId)
      .single();
    email = guestRow?.email?.trim().toLowerCase() || params.guestInfo?.email.trim().toLowerCase();
  } else if (borrowerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", borrowerId)
      .single();
    email = profile?.email?.trim().toLowerCase();
  }

  const { data: invRows } = await supabase
    .from("inventory")
    .select("id, name")
    .in(
      "id",
      params.items.map((i) => i.inventoryId)
    );
  const nameMap = new Map((invRows ?? []).map((r) => [r.id as string, r.name as string]));
  const itemLines = params.items.map(
    (i) => `${nameMap.get(i.inventoryId) ?? "Item"} × ${i.quantity}`
  );

  let emailSent = false;
  if (email) {
    emailSent = await sendBorrowRequestSubmittedEmail(email, requestNumber, itemLines);
  }

  await logActivity({
    actorId: borrowerId,
    actorEmail: email,
    action: ActivityActions.REQUEST_CREATED,
    targetType: "borrow_request",
    targetId: requestNumber,
    metadata: { emailSent, emailedTo: email ?? null },
  });

  return { success: true, requestNumber, emailSent, emailedTo: email ?? null };
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
    .select("*, borrow_request_items(*, inventory(name))")
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
    const itemLines = formatItemLines(request.borrow_request_items ?? []);
    await sendBorrowRequestApprovedEmail(email, request.request_number, dueDate, itemLines);
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
    .select("*, borrow_request_items(*, inventory(name))")
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

  if (email) {
    const itemLines = formatItemLines(request.borrow_request_items ?? []);
    await sendBorrowRequestRejectedEmail(email, request.request_number, reason, itemLines);
  }

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
