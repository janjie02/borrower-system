"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublicInventory, getInventoryPhotoUrl } from "@/lib/actions/inventory";
import { submitBorrowRequest } from "@/lib/actions/borrowing";
import { CartProvider, useCart } from "@/components/shared/cart-context";
import { CameraCapture } from "@/components/shared/camera-capture";
import { PublicHeader } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, LoadingSpinner } from "@/components/ui/badge";
import type { Inventory } from "@/types";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Minus,
  ShoppingCart,
  Camera,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Trash2,
  User,
} from "lucide-react";

type InventoryWithPhoto = Inventory & { photoUrl: string | null };
type Step = "items" | "cart" | "camera" | "info" | "confirm" | "submitting" | "success";

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const STEPS: { key: Step; label: string }[] = [
  { key: "items", label: "Items" },
  { key: "cart", label: "Cart" },
  { key: "camera", label: "Photo" },
  { key: "info", label: "Details" },
  { key: "confirm", label: "Submit" },
];

function GuestBorrowFlow() {
  const { items, addItem, updateQuantity, removeItem, clearCart, totalItems } =
    useCart();
  const [step, setStep] = useState<Step>("items");
  const [inventory, setInventory] = useState<InventoryWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [requestNumber, setRequestNumber] = useState<string | null>(null);

  const [guestInfo, setGuestInfo] = useState({
    fullName: "",
    accountType: "student" as "student" | "teacher",
    email: "",
    phone: "",
    idCode: "",
    year: "",
    section: "",
  });

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  useEffect(() => {
    async function load() {
      const result = await getPublicInventory();
      if (result.error) {
        toast.error(result.error);
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

  const handlePhotoCapture = (blob: Blob) => {
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
    setStep("info");
  };

  const validateGuestInfo = () => {
    if (!guestInfo.fullName.trim()) {
      toast.error("Full name is required");
      return false;
    }
    if (!guestInfo.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    if (!guestInfo.phone.trim()) {
      toast.error("Phone number is required");
      return false;
    }
    if (!guestInfo.idCode.trim()) {
      toast.error("ID code is required");
      return false;
    }
    if (guestInfo.accountType === "student" && !guestInfo.year.trim()) {
      toast.error("Year is required for students");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!photoBlob || !items.length || !validateGuestInfo()) return;

    setStep("submitting");
    try {
      const photoBase64 = await blobToBase64(photoBlob);
      const result = await submitBorrowRequest({
        items: items.map((i) => ({
          inventoryId: i.inventoryId,
          quantity: i.quantity,
        })),
        photoBase64,
        notes: notes.trim() || undefined,
        isGuest: true,
        guestInfo: {
          fullName: guestInfo.fullName.trim(),
          accountType: guestInfo.accountType,
          email: guestInfo.email.trim(),
          phone: guestInfo.phone.trim(),
          idCode: guestInfo.idCode.trim(),
          year:
            guestInfo.accountType === "student"
              ? guestInfo.year.trim()
              : undefined,
          section:
            guestInfo.accountType === "student"
              ? guestInfo.section.trim() || undefined
              : undefined,
        },
      });

      if (result.error) {
        toast.error(result.error);
        setStep("confirm");
        return;
      }

      clearCart();
      setRequestNumber(result.requestNumber ?? null);
      setStep("success");
      toast.success("Guest borrow request submitted!");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setStep("confirm");
    }
  };

  if (step === "success") {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="rounded-full bg-green-100 p-6">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Request Submitted!</h1>
          {requestNumber && (
            <p className="mt-2 text-[#1565C0] font-mono font-semibold">
              #{requestNumber}
            </p>
          )}
          <p className="mt-2 text-sm text-[#6B7280] max-w-sm">
            Check your email for confirmation. A staff member will review your
            request shortly.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  if (step === "submitting") {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <LoadingSpinner size="lg" />
        <p className="text-[#6B7280]">Submitting your request...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2937]">Guest Borrowing</h1>
        <p className="text-sm text-[#6B7280]">
          Borrow items without an account
        </p>
      </div>

      {step !== "items" && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.filter((s) => s.key !== "items").map((s, i) => {
            const idx = STEPS.findIndex((x) => x.key === s.key);
            const active = idx <= stepIndex;
            return (
              <div key={s.key} className="flex items-center gap-1 shrink-0">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    active ? "bg-[#1565C0] text-white" : "bg-[#E5E7EB] text-[#6B7280]"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-xs font-medium mr-1 ${
                    active ? "text-[#1565C0]" : "text-[#6B7280]"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 2 && (
                  <ChevronRight className="h-3 w-3 text-[#E5E7EB]" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {step === "items" && (
        <div className="space-y-4">
          {loading ? (
            <LoadingSpinner size="lg" />
          ) : !inventory.length ? (
            <EmptyState
              title="No items available"
              description="There are no items available to borrow right now."
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inventory.map((item) => {
                  const qty = getCartQty(item.id);
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
                          <Package className="h-10 w-10 text-[#1565C0]/40" />
                        )}
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-[#1F2937]">
                            {item.name}
                          </h3>
                          <p className="text-xs text-[#6B7280]">
                            {item.quantity_available} available
                          </p>
                        </div>
                        {qty > 0 ? (
                          <div className="flex items-center justify-center gap-3">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-11 w-11"
                              onClick={() =>
                                qty <= 1
                                  ? removeItem(item.id)
                                  : updateQuantity(item.id, qty - 1)
                              }
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-bold text-[#1565C0]">{qty}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-11 w-11"
                              disabled={qty >= item.quantity_available}
                              onClick={() => updateQuantity(item.id, qty + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="lg"
                            className="w-full"
                            onClick={() => {
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
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            Add to Cart
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {totalItems > 0 && (
                <div className="sticky bottom-4">
                  <Button
                    size="lg"
                    className="w-full shadow-lg"
                    onClick={() => setStep("cart")}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Review Cart ({totalItems})
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === "cart" && (
        <div className="space-y-4">
          {!items.length ? (
            <EmptyState
              title="Cart is empty"
              action={
                <Button size="lg" onClick={() => setStep("items")}>
                  Select Items
                </Button>
              }
            />
          ) : (
            <>
              {items.map((item) => (
                <Card key={item.inventoryId}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-xs text-[#6B7280] font-mono">
                          {item.sku}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => removeItem(item.inventoryId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-11 w-11"
                        onClick={() =>
                          item.quantity <= 1
                            ? removeItem(item.inventoryId)
                            : updateQuantity(item.inventoryId, item.quantity - 1)
                        }
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-bold text-[#1565C0]">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-11 w-11"
                        disabled={item.quantity >= item.maxQuantity}
                        onClick={() =>
                          updateQuantity(item.inventoryId, item.quantity + 1)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep("items")}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Add More
                </Button>
                <Button size="lg" className="flex-1" onClick={() => setStep("camera")}>
                  <Camera className="h-5 w-5" />
                  Take Photo
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {step === "camera" && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[#6B7280] mb-4 text-center">
              Take a live photo for identity verification.
            </p>
            <CameraCapture
              label="Capture Verification Photo"
              onCapture={handlePhotoCapture}
              onCancel={() => setStep("cart")}
            />
          </CardContent>
        </Card>
      )}

      {step === "info" && (
        <div className="space-y-4">
          {photoPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="Verification photo"
              className="w-full max-w-xs mx-auto rounded-xl border-2 border-[#1565C0] object-cover aspect-[4/3]"
            />
          )}

          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-[#1565C0]" />
                Your Information
              </h3>

              <Input
                label="Full Name"
                value={guestInfo.fullName}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, fullName: e.target.value })
                }
                placeholder="Enter your full name"
                required
              />
              <Input
                label="Email"
                type="email"
                value={guestInfo.email}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, email: e.target.value })
                }
                placeholder="your@email.com"
                required
              />
              <Input
                label="Phone"
                type="tel"
                value={guestInfo.phone}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, phone: e.target.value })
                }
                placeholder="Your phone number"
                required
              />
              <Input
                label="ID Code"
                value={guestInfo.idCode}
                onChange={(e) =>
                  setGuestInfo({ ...guestInfo, idCode: e.target.value })
                }
                placeholder="Student/Employee ID"
                required
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1F2937]">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["student", "teacher"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setGuestInfo({ ...guestInfo, accountType: type })
                      }
                      className={`h-12 rounded-lg border-2 text-sm font-semibold capitalize transition-colors cursor-pointer ${
                        guestInfo.accountType === type
                          ? "border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]"
                          : "border-[#E5E7EB] text-[#6B7280] hover:border-[#1565C0]/50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {guestInfo.accountType === "student" && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Year"
                    value={guestInfo.year}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, year: e.target.value })
                    }
                    placeholder="e.g. 2024"
                    required
                  />
                  <Input
                    label="Section"
                    value={guestInfo.section}
                    onChange={(e) =>
                      setGuestInfo({ ...guestInfo, section: e.target.value })
                    }
                    placeholder="e.g. A"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setStep("camera")}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={() => {
                if (validateGuestInfo()) setStep("confirm");
              }}
            >
              Review
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          {photoPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="Verification photo"
              className="w-full max-w-xs mx-auto rounded-xl border-2 border-[#1565C0] object-cover aspect-[4/3]"
            />
          )}

          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-[#1F2937]">Guest Details</h3>
              <p className="text-sm">
                <span className="text-[#6B7280]">Name:</span>{" "}
                {guestInfo.fullName}
              </p>
              <p className="text-sm">
                <span className="text-[#6B7280]">Email:</span> {guestInfo.email}
              </p>
              <p className="text-sm">
                <span className="text-[#6B7280]">Phone:</span> {guestInfo.phone}
              </p>
              <p className="text-sm capitalize">
                <span className="text-[#6B7280]">Type:</span>{" "}
                {guestInfo.accountType}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-[#1565C0]" />
                Items ({totalItems})
              </h3>
              {items.map((item) => (
                <div
                  key={item.inventoryId}
                  className="flex justify-between text-sm"
                >
                  <span>{item.name}</span>
                  <span className="font-medium text-[#1565C0]">
                    ×{item.quantity}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Textarea
            label="Notes (optional)"
            placeholder="Any special instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setStep("info")}
            >
              <ChevronLeft className="h-4 w-4" />
              Edit
            </Button>
            <Button size="lg" className="flex-1" onClick={handleSubmit}>
              Submit Request
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuestBorrowPage() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#F9FAFB]">
        <PublicHeader />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <GuestBorrowFlow />
        </main>
      </div>
    </CartProvider>
  );
}
