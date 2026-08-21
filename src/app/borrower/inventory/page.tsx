"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublicInventory, getInventoryPhotoUrl } from "@/lib/actions/inventory";
import { useCart } from "@/components/shared/cart-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, LoadingSpinner } from "@/components/ui/badge";
import type { Inventory } from "@/types";
import { Package, Plus, Minus, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";

type InventoryWithPhoto = Inventory & { photoUrl: string | null };

export default function BorrowerInventoryPage() {
  const { items, addItem, updateQuantity, removeItem, totalItems } = useCart();
  const [inventory, setInventory] = useState<InventoryWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await getPublicInventory();
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const withPhotos = await Promise.all(
        (result.data ?? []).map(async (item) => ({
          ...item,
          photoUrl: await getInventoryPhotoUrl(item.photo_path ?? null),
        }))
      );
      setInventory(withPhotos);
      setLoading(false);
    }
    load();
  }, []);

  const getCartQty = (id: string) =>
    items.find((i) => i.inventoryId === id)?.quantity ?? 0;

  const handleAdd = (item: InventoryWithPhoto) => {
    addItem({
      inventoryId: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      photoPath: item.photo_path,
      maxQuantity: item.quantity_available,
      quantity: 1,
    });
    toast.success(`Added ${item.name}`);
  };

  if (loading) return <LoadingSpinner size="lg" />;

  if (error) {
    return (
      <EmptyState
        title="Unable to load inventory"
        description={error}
        action={
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        }
      />
    );
  }

  if (!inventory.length) {
    return (
      <EmptyState
        title="No items available"
        description="Check back later for available equipment."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Browse Items</h1>
          <p className="text-sm text-[#6B7280]">
            {inventory.length} item{inventory.length !== 1 ? "s" : ""} available
          </p>
        </div>
        {totalItems > 0 && (
          <Button asChild variant="secondary" size="lg">
            <Link href="/borrower/borrow">
              <ShoppingCart className="h-5 w-5" />
              {totalItems}
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {inventory.map((item) => {
          const qty = getCartQty(item.id);
          const inCart = qty > 0;

          return (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-[4/3] bg-[#E3F2FD] flex items-center justify-center">
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-12 w-12 text-[#1565C0]/40" />
                )}
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-[#1F2937] leading-tight">
                    {item.name}
                  </h3>
                  {item.inventory_categories?.name && (
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {item.inventory_categories.name}
                    </p>
                  )}
                  <p className="text-xs text-[#1565C0] font-mono mt-1">
                    {item.sku}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#6B7280]">
                    {item.quantity_available} available
                  </span>
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10"
                        onClick={() =>
                          qty <= 1
                            ? removeItem(item.id)
                            : updateQuantity(item.id, qty - 1)
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-6 text-center font-bold text-[#1565C0]">
                        {qty}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10"
                        disabled={qty >= item.quantity_available}
                        onClick={() => updateQuantity(item.id, qty + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      onClick={() => handleAdd(item)}
                      className="h-11 px-4"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  )}
                </div>

                {inCart && (
                  <p className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check className="h-3 w-3" />
                    In cart
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-20 px-4">
          <div className="mx-auto max-w-lg">
            <Button asChild size="lg" className="w-full shadow-lg">
              <Link href="/borrower/borrow">
                <ShoppingCart className="h-5 w-5" />
                Continue to Borrow ({totalItems} item
                {totalItems !== 1 ? "s" : ""})
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
