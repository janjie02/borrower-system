"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireStaffOrAbove } from "@/lib/auth";
import { logActivity, ActivityActions } from "@/lib/services/activity-log";
import sharp from "sharp";

async function generateSku(prefix: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase.rpc("generate_sku", { prefix: prefix.toUpperCase() });
  return data as string;
}

function generateBarcode(sku: string): string {
  return sku.replace(/-/g, "");
}

export async function createInventory(params: {
  name: string;
  categoryId?: string;
  description?: string;
  skuPrefix: string;
  quantity: number;
  trackIndividual?: boolean;
  specifications?: Record<string, unknown>;
  photoBase64?: string;
}) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  if (!/^[A-Za-z0-9]{1,5}$/.test(params.skuPrefix)) {
    return { error: "SKU prefix must be 1-5 alphanumeric characters" };
  }

  const sku = await generateSku(params.skuPrefix);
  const barcode = generateBarcode(sku);

  let photoPath: string | null = null;
  if (params.photoBase64) {
    const buffer = Buffer.from(params.photoBase64.split(",")[1] ?? params.photoBase64, "base64");
    const compressed = await sharp(buffer).resize(800, 800, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
    const fileName = `${sku}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("inventory-photos")
      .upload(fileName, compressed, { contentType: "image/jpeg", upsert: true });
    if (!uploadError) photoPath = fileName;
  }

  const { data, error } = await supabase
    .from("inventory")
    .insert({
      name: params.name,
      category_id: params.categoryId || null,
      description: params.description,
      sku_prefix: params.skuPrefix.toUpperCase(),
      sku,
      barcode,
      quantity_total: params.quantity,
      quantity_available: params.quantity,
      quantity_borrowed: 0,
      quantity_damaged: 0,
      quantity_lost: 0,
      status: "available",
      track_individual: params.trackIndividual ?? false,
      specifications: params.specifications ?? {},
      photo_path: photoPath,
      created_by: admin.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  if (params.trackIndividual && params.quantity > 0) {
    const items = [];
    for (let i = 1; i <= params.quantity; i++) {
      const itemSku = `${sku}-${String(i).padStart(3, "0")}`;
      items.push({
        inventory_id: data.id,
        sku: itemSku,
        barcode: generateBarcode(itemSku),
        status: "available",
        condition: "good",
      });
    }
    await supabase.from("inventory_items").insert(items);
  }

  await logActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ActivityActions.INVENTORY_ADDED,
    targetType: "inventory",
    targetId: data.id,
    metadata: { name: params.name, sku },
  });

  return { success: true, inventory: data };
}

export async function updateInventory(
  id: string,
  params: {
    name?: string;
    categoryId?: string;
    description?: string;
    specifications?: Record<string, unknown>;
    photoBase64?: string;
  }
) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.name) updates.name = params.name;
  if (params.categoryId !== undefined) updates.category_id = params.categoryId || null;
  if (params.description !== undefined) updates.description = params.description;
  if (params.specifications) updates.specifications = params.specifications;

  if (params.photoBase64) {
    const { data: existing } = await supabase.from("inventory").select("sku").eq("id", id).single();
    const buffer = Buffer.from(params.photoBase64.split(",")[1] ?? params.photoBase64, "base64");
    const compressed = await sharp(buffer).resize(800, 800, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
    const fileName = `${existing?.sku ?? id}.jpg`;
    await supabase.storage.from("inventory-photos").upload(fileName, compressed, { contentType: "image/jpeg", upsert: true });
    updates.photo_path = fileName;
  }

  const { error } = await supabase.from("inventory").update(updates).eq("id", id);
  if (error) return { error: error.message };

  await logActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ActivityActions.INVENTORY_EDITED,
    targetType: "inventory",
    targetId: id,
  });

  return { success: true };
}

export async function archiveInventory(id: string) {
  const admin = await requireAdmin();
  const supabase = createAdminClient();

  const { data: item } = await supabase
    .from("inventory")
    .select("quantity_borrowed")
    .eq("id", id)
    .single();

  if (item && item.quantity_borrowed > 0) {
    return { error: "Cannot archive inventory with active borrowings" };
  }

  const { error } = await supabase
    .from("inventory")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  await logActivity({
    actorId: admin.id,
    actorEmail: admin.email,
    action: ActivityActions.INVENTORY_ARCHIVED,
    targetType: "inventory",
    targetId: id,
  });

  return { success: true };
}

export async function getInventoryList(search?: string, status?: string, page = 1, pageSize = 20) {
  await requireStaffOrAbove();
  const supabase = createAdminClient();

  let query = supabase
    .from("inventory")
    .select("*, inventory_categories(name, slug)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
  }
  if (status && status !== "all") {
    query = query.eq("status", status);
  } else if (!status) {
    query = query.neq("status", "archived");
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) return { error: error.message };

  return { data, total: count ?? 0, page, pageSize };
}

export async function getPublicInventory() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inventory")
    .select("*, inventory_categories(name, slug)")
    .neq("status", "archived")
    .gt("quantity_available", 0)
    .order("name");

  if (error) return { error: error.message };
  return { data };
}

export async function getInventoryPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = createAdminClient();
  const { data } = supabase.storage.from("inventory-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function getSignedPhotoUrl(bucket: string, path: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}
