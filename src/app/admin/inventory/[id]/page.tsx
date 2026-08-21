import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Archive } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInventoryPhotoUrl, archiveInventory } from "@/lib/actions/inventory";
import { getCurrentUser } from "@/lib/auth";
import { BarcodePrintView } from "@/components/shared/barcode-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { Inventory, InventoryItem } from "@/types";

async function ArchiveButton({ id }: { id: string }) {
  async function handleArchive() {
    "use server";
    const result = await archiveInventory(id);
    if ("error" in result && result.error) return;
    revalidatePath(`/admin/inventory/${id}`);
    revalidatePath("/admin/inventory");
    redirect("/admin/inventory");
  }

  return (
    <form action={handleArchive}>
      <Button type="submit" variant="destructive" size="sm">
        <Archive className="h-4 w-4" />
        Archive
      </Button>
    </form>
  );
}

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = createAdminClient();

  const { data: inventory, error } = await supabase
    .from("inventory")
    .select("*, inventory_categories(name, slug)")
    .eq("id", id)
    .single();

  if (error || !inventory) {
    notFound();
  }

  const item = inventory as Inventory;
  const photoUrl = await getInventoryPhotoUrl(item.photo_path ?? null);

  let individualItems: InventoryItem[] = [];
  if (item.track_individual) {
    const { data: items } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("inventory_id", id)
      .order("sku");
    individualItems = (items ?? []) as InventoryItem[];
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/inventory">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{item.name}</h1>
              <Badge status={item.status} />
            </div>
            <p className="font-mono text-sm text-muted">{item.sku}</p>
          </div>
        </div>
        {isAdmin && item.status !== "archived" && <ArchiveButton id={id} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={item.name}
                className="h-48 w-full rounded-lg object-cover"
              />
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Category</dt>
                <dd className="font-medium">{item.inventory_categories?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Barcode</dt>
                <dd className="font-mono">{item.barcode}</dd>
              </div>
              <div>
                <dt className="text-muted">Total Quantity</dt>
                <dd className="font-medium">{item.quantity_total}</dd>
              </div>
              <div>
                <dt className="text-muted">Available</dt>
                <dd className="font-medium text-emerald-200">{item.quantity_available}</dd>
              </div>
              <div>
                <dt className="text-muted">Borrowed</dt>
                <dd className="font-medium text-accent">{item.quantity_borrowed}</dd>
              </div>
              <div>
                <dt className="text-muted">Damaged</dt>
                <dd className="font-medium text-amber-200">{item.quantity_damaged}</dd>
              </div>
              <div>
                <dt className="text-muted">Lost</dt>
                <dd className="font-medium text-red-200">{item.quantity_lost}</dd>
              </div>
              <div>
                <dt className="text-muted">Track Individual</dt>
                <dd className="font-medium">{item.track_individual ? "Yes" : "No"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Added</dt>
                <dd className="font-medium">{formatDate(item.created_at)}</dd>
              </div>
            </dl>
            {item.description && (
              <div>
                <p className="text-sm text-muted">Description</p>
                <p className="mt-1 text-sm text-white">{item.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <BarcodePrintView name={item.name} sku={item.sku} barcode={item.barcode} />

          {item.track_individual && individualItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Individual Units</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-2 text-left text-muted">SKU</th>
                        <th className="py-2 text-left text-muted">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {individualItems.map((unit) => (
                        <tr key={unit.id}>
                          <td className="py-2 font-mono text-xs">{unit.sku}</td>
                          <td className="py-2">
                            <Badge status={unit.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
