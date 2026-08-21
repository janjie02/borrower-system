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
          <h1 className="text-2xl font-bold text-white">Browse Items</h1>
          <p className="text-sm text-muted">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {inventory.map((item) => {
          const qty = getCartQty(item.id);
          const inCart = qty > 0;
          const soldOut = item.quantity_available <= 0;

          return (
            <Card
              key={item.id}
              className="flex flex-col overflow-hidden transition-colors hover:border-white/20"
            >
              <div className="relative aspect-square bg-navy-950 flex items-center justify-center">
                {item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-10 w-10 text-accent/40" />
                )}
                {inCart && (
                  <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-[#0D2B66] shadow">
                    <Check className="h-3 w-3" />
                    {qty}
                  </span>
                )}
              </div>
              <CardContent className="flex flex-1 flex-col gap-2 p-2.5">
                <div className="flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-white">
                    {item.name}
                  </h3>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-accent">
                    {item.sku}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {soldOut ? "Unavailable" : `${item.quantity_available} available`}
                  </p>
                </div>

                {inCart ? (
                  <div className="flex items-center justify-between rounded-lg bg-white/5 p-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        qty <= 1 ? removeItem(item.id) : updateQuantity(item.id, qty - 1)
                      }
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-bold text-accent">{qty}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={qty >= item.quantity_available}
                      onClick={() => updateQuantity(item.id, qty + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleAdd(item)}
                    disabled={soldOut}
                    className="h-9 w-full"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
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
