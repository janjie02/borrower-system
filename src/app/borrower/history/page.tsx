import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Badge, EmptyState } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { BorrowRequest, BorrowRequestItem } from "@/types";
import { ClipboardList, Package } from "lucide-react";

type RequestWithItems = BorrowRequest & {
  borrow_request_items: (BorrowRequestItem & {
    inventory: { name: string; sku: string } | null;
  })[];
};

export default async function BorrowerHistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("borrow_requests")
    .select(
      `
      *,
      borrow_request_items(
        id,
        quantity,
        status,
        inventory(name, sku)
      )
    `
    )
    .eq("borrower_id", user.id)
    .order("created_at", { ascending: false });

  const history = (requests ?? []) as RequestWithItems[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2937]">Borrowing History</h1>
        <p className="text-sm text-[#6B7280]">
          {history.length} request{history.length !== 1 ? "s" : ""} total
        </p>
      </div>

      {!history.length ? (
        <EmptyState
          title="No borrowing history yet"
          description="Your submitted borrow requests will appear here."
          action={
            <Button asChild size="lg">
              <Link href="/borrower/inventory">
                <Package className="h-5 w-5" />
                Browse Items
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {history.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono font-semibold text-[#1565C0]">
                      #{request.request_number}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Submitted {formatDate(request.created_at)}
                    </p>
                  </div>
                  <Badge status={request.status} />
                </div>

                {(request.borrow_date || request.due_date) && (
                  <div className="flex gap-4 text-xs text-[#6B7280]">
                    {request.borrow_date && (
                      <span>Borrowed: {formatDate(request.borrow_date)}</span>
                    )}
                    {request.due_date && (
                      <span
                        className={
                          request.status === "overdue"
                            ? "text-red-600 font-medium"
                            : ""
                        }
                      >
                        Due: {formatDate(request.due_date)}
                      </span>
                    )}
                  </div>
                )}

                {request.rejection_reason && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">
                    {request.rejection_reason}
                  </p>
                )}

                <div className="border-t border-[#E5E7EB] pt-3 space-y-1.5">
                  {request.borrow_request_items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-[#1F2937] flex items-center gap-2">
                        <ClipboardList className="h-3.5 w-3.5 text-[#6B7280]" />
                        {item.inventory?.name ?? "Unknown item"}
                      </span>
                      <span className="text-[#6B7280]">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
