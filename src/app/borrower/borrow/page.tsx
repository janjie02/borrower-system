"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/shared/cart-context";
import { CameraCapture } from "@/components/shared/camera-capture";
import { submitBorrowRequest } from "@/lib/actions/borrowing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, LoadingSpinner } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShoppingCart,
  Camera,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Minus,
  Plus,
  Trash2,
  Package,
} from "lucide-react";

type Step = "cart" | "camera" | "confirm" | "submitting" | "success";

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const STEPS: { key: Step; label: string }[] = [
  { key: "cart", label: "Cart" },
  { key: "camera", label: "Photo" },
  { key: "confirm", label: "Confirm" },
];

export default function BorrowerBorrowPage() {
  const { items, updateQuantity, removeItem, clearCart, totalItems } = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [requestNumber, setRequestNumber] = useState<string | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const handlePhotoCapture = (blob: Blob) => {
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
    setStep("confirm");
  };

  const handleSubmit = async () => {
    if (!photoBlob || !items.length) return;

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
      });

      if (result.error) {
        toast.error(result.error);
        setStep("confirm");
        return;
      }

      clearCart();
      setRequestNumber(result.requestNumber ?? null);
      setStep("success");
      toast.success("Borrow request submitted!");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setStep("confirm");
    }
  };

  if (!items.length && step !== "success") {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Browse available items and add them to your cart before submitting a borrow request."
        action={
          <Button asChild size="lg">
            <Link href="/borrower/inventory">
              <Package className="h-5 w-5" />
              Browse Items
            </Link>
          </Button>
        }
      />
    );
  }

  if (step === "success") {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="rounded-full bg-emerald-400/10 p-6">
          <CheckCircle className="h-12 w-12 text-emerald-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Request Submitted!</h1>
          {requestNumber && (
            <p className="mt-2 text-accent font-mono font-semibold">
              #{requestNumber}
            </p>
          )}
          <p className="mt-2 text-sm text-muted">
            You&apos;ll receive an email once your request is reviewed.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button asChild size="lg">
            <Link href="/borrower/history">View History</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/borrower/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (step === "submitting") {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <LoadingSpinner size="lg" />
        <p className="text-muted">Submitting your request...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Borrow Items</h1>
        <p className="text-sm text-muted">
          {totalItems} item{totalItems !== 1 ? "s" : ""} in cart
        </p>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i <= stepIndex
                  ? "bg-accent text-[#0D2B66]"
                  : "bg-white/10 text-muted"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs font-medium hidden sm:block ${
                i <= stepIndex ? "text-accent" : "text-muted"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {step === "cart" && (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.inventoryId}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs text-muted font-mono">{item.sku}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-300 shrink-0"
                    onClick={() => removeItem(item.inventoryId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
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
                    <span className="text-lg font-bold text-accent w-8 text-center">
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
                  <span className="text-xs text-muted">
                    max {item.maxQuantity}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-3">
            <Button asChild variant="outline" size="lg" className="flex-1">
              <Link href="/borrower/inventory">
                <ChevronLeft className="h-4 w-4" />
                Add More
              </Link>
            </Button>
            <Button size="lg" className="flex-1" onClick={() => setStep("camera")}>
              <Camera className="h-5 w-5" />
              Take Photo
            </Button>
          </div>
        </div>
      )}

      {step === "camera" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted mb-4 text-center">
                A live photo is required for identity verification before
                submitting your request.
              </p>
              <CameraCapture
                label="Capture Verification Photo"
                onCapture={handlePhotoCapture}
                onCancel={() => setStep("cart")}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          {photoPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="Verification photo"
              className="w-full max-w-sm mx-auto rounded-xl border-2 border-accent object-cover aspect-[4/3]"
            />
          )}

          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-accent" />
                Items ({totalItems})
              </h3>
              {items.map((item) => (
                <div
                  key={item.inventoryId}
                  className="flex justify-between text-sm border-b border-white/10 pb-2 last:border-0"
                >
                  <span className="text-white">{item.name}</span>
                  <span className="font-medium text-accent">×{item.quantity}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Textarea
            label="Notes (optional)"
            placeholder="Any special instructions or details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => setStep("camera")}
            >
              <ChevronLeft className="h-4 w-4" />
              Retake Photo
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
