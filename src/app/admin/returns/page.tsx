"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ScanLine } from "lucide-react";
import { getBorrowRequests, processReturn } from "@/lib/actions/borrowing";
import { Badge, EmptyState, LoadingSpinner } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { BorrowRequest, ReturnCondition } from "@/types";

const CONDITIONS: { value: ReturnCondition; label: string }[] = [
  { value: "good", label: "Good condition" },
  { value: "minor_damage", label: "Minor damage" },
  { value: "damaged", label: "Damaged" },
  { value: "lost", label: "Lost" },
];

export default function AdminReturnsPage() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [barcodes, setBarcodes] = useState<Record<string, string>>({});
  const [conditions, setConditions] = useState<Record<string, ReturnCondition>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const [active, overdue, approved] = await Promise.all([
      getBorrowRequests({ status: "active", pageSize: 100 }),
      getBorrowRequests({ status: "overdue", pageSize: 100 }),
      getBorrowRequests({ status: "approved", pageSize: 100 }),
    ]);

    const all: BorrowRequest[] = [];
    for (const res of [active, overdue, approved]) {
      if (!("error" in res && res.error)) {
        all.push(...((res.data ?? []) as BorrowRequest[]));
      }
    }

    const seen = new Set<string>();
    setRequests(all.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const getBorrowerName = (req: BorrowRequest) => {
    if (req.is_guest && req.guest_profiles) return req.guest_profiles.full_name;
    return req.borrower_profiles?.profiles?.full_name ?? "Unknown";
  };

  const handleProcessReturn = async (
    requestId: string,
    requestItemId: string,
    inventoryBarcode: string
  ) => {
    const key = requestItemId;
    const condition = conditions[key] ?? "good";
    const barcode = barcodes[key]?.trim();
    const note = notes[key]?.trim();

    setProcessingId(requestItemId);
    const result = await processReturn({
      requestId,
      requestItemId,
      condition,
      notes: note || undefined,
      barcode: barcode || inventoryBarcode,
    });
    setProcessingId(null);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(
      `Return processed${result.creditChange != null ? ` (credit: ${result.creditChange > 0 ? "+" : ""}${result.creditChange})` : ""}`
    );
    loadRequests();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Process Returns</h1>
        <p className="text-sm text-muted">
          Scan or enter barcodes to process item returns
        </p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : requests.length === 0 ? (
        <EmptyState
          title="No items to return"
          description="There are no active or overdue borrow requests."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const returnableItems = (req.borrow_request_items ?? []).filter(
              (item) => item.status !== "returned"
            );
            if (returnableItems.length === 0) return null;

            return (
              <Card key={req.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {req.request_number}
                    <Badge status={req.status} />
                    <span className="text-sm font-normal text-muted">
                      {getBorrowerName(req)}
                    </span>
                  </CardTitle>
                  <p className="text-sm text-muted">
                    Due: {formatDate(req.due_date)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {returnableItems.map((item) => {
                    const key = item.id;
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-white">
                              {item.inventory?.name ?? "Item"}
                            </p>
                            <p className="font-mono text-xs text-muted">
                              {item.inventory?.sku} · {item.inventory?.barcode}
                            </p>
                          </div>
                          <span className="text-sm text-muted">Qty: {item.quantity}</span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="relative">
                            <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                            <input
                              placeholder="Scan or enter barcode..."
                              value={barcodes[key] ?? ""}
                              onChange={(e) =>
                                setBarcodes((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              className="flex h-10 w-full rounded-lg border border-white/10 bg-surface pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                          </div>
                          <select
                            value={conditions[key] ?? "good"}
                            onChange={(e) =>
                              setConditions((prev) => ({
                                ...prev,
                                [key]: e.target.value as ReturnCondition,
                              }))
                            }
                            className="h-10 rounded-lg border border-white/10 bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                          >
                            {CONDITIONS.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <Textarea
                          placeholder="Notes (optional)"
                          value={notes[key] ?? ""}
                          onChange={(e) =>
                            setNotes((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          rows={2}
                        />

                        <Button
                          size="sm"
                          onClick={() =>
                            handleProcessReturn(
                              req.id,
                              item.id,
                              item.inventory?.barcode ?? ""
                            )
                          }
                          disabled={processingId === item.id}
                        >
                          {processingId === item.id ? "Processing..." : "Process Return"}
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
