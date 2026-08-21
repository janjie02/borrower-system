"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { createInventory } from "@/lib/actions/inventory";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/badge";
import type { InventoryCategory } from "@/types";

export default function NewInventoryPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [skuPrefix, setSkuPrefix] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [trackIndividual, setTrackIndividual] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | undefined>();

  useEffect(() => {
    async function loadCategories() {
      try {
        const supabase = createClient();
        const { data } = await supabase.from("inventory_categories").select("*").order("name");
        setCategories(data ?? []);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !skuPrefix.trim()) {
      toast.error("Name and SKU prefix are required");
      return;
    }

    setLoading(true);
    const result = await createInventory({
      name: name.trim(),
      categoryId: categoryId || undefined,
      description: description.trim() || undefined,
      skuPrefix: skuPrefix.trim(),
      quantity,
      trackIndividual,
      photoBase64,
    });
    setLoading(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Inventory item created");
    if (result.inventory?.id) {
      router.push(`/admin/inventory/${result.inventory.id}`);
    } else {
      router.push("/admin/inventory");
    }
  };

  if (loadingCategories) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/inventory">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Add Inventory Item</h1>
          <p className="text-sm text-[#6B7280]">Create a new item in the catalog</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-[#E5E7EB] bg-white p-6">
        <Input
          label="Item Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Scientific Calculator"
          required
        />

        <div className="space-y-1.5">
          <label htmlFor="category" className="text-sm font-medium text-[#1F2937]">
            Category
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={3}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="SKU Prefix"
            value={skuPrefix}
            onChange={(e) => setSkuPrefix(e.target.value.toUpperCase())}
            placeholder="e.g. CALC"
            maxLength={5}
            required
          />
          <Input
            label="Quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[#1F2937]">
          <input
            type="checkbox"
            checked={trackIndividual}
            onChange={(e) => setTrackIndividual(e.target.checked)}
            className="h-4 w-4 rounded border-[#E5E7EB] text-[#1565C0] focus:ring-[#1565C0]"
          />
          Track individual units (each unit gets its own barcode)
        </label>

        <div className="space-y-1.5">
          <label htmlFor="photo" className="text-sm font-medium text-[#1F2937]">
            Photo (optional)
          </label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="block w-full text-sm text-[#6B7280] file:mr-4 file:rounded-lg file:border-0 file:bg-[#E3F2FD] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[#1565C0]"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Creating..." : "Create Item"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/inventory">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
