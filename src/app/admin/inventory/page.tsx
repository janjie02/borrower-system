import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getInventoryList } from "@/lib/actions/inventory";
import { Badge, EmptyState } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Inventory } from "@/types";

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status = params.status ?? "all";
  const page = Number(params.page) || 1;

  const result = await getInventoryList(search || undefined, status, page, 20);

  if ("error" in result && result.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        {result.error}
      </div>
    );
  }

  const items = (result.data ?? []) as Inventory[];
  const total = result.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Inventory</h1>
          <p className="text-sm text-[#6B7280]">{total} items total</p>
        </div>
        <Button asChild>
          <Link href="/admin/inventory/new">
            <Plus className="h-4 w-4" />
            Add Item
          </Link>
        </Button>
      </div>

      <form method="GET" className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by name, SKU, or barcode..."
            className="flex h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
          />
        </div>
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
        >
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="borrowed">Borrowed</option>
          <option value="damaged">Damaged</option>
          <option value="lost">Lost</option>
          <option value="archived">Archived</option>
        </select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No inventory found"
          description="Try adjusting your search or add a new item."
          action={
            <Button asChild>
              <Link href="/admin/inventory/new">Add Item</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">SKU</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Available</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/inventory/${item.id}`}
                        className="font-medium text-[#1565C0] hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#6B7280]">{item.sku}</td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {item.inventory_categories?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">{item.quantity_available}</td>
                    <td className="px-4 py-3">{item.quantity_total}</td>
                    <td className="px-4 py-3">
                      <Badge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/admin/inventory?search=${search}&status=${status}&page=${page - 1}`}
                  >
                    Previous
                  </Link>
                </Button>
              )}
              <span className="text-sm text-[#6B7280]">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/admin/inventory?search=${search}&status=${status}&page=${page + 1}`}
                  >
                    Next
                  </Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
