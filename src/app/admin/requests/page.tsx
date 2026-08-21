"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  getBorrowRequests,
  approveBorrowRequest,
  rejectBorrowRequest,
  activateBorrowRequest,
} from "@/lib/actions/borrowing";
import { getSettings } from "@/lib/actions/settings";
import { Badge, EmptyState, LoadingSpinner } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { BorrowRequest, RequestStatus } from "@/types";

const TABS: { label: string; status: RequestStatus | "all" }[] = [
  { label: "All", status: "all" },
  { label: "Pending", status: "pending" },
  { label: "Approved", status: "approved" },
  { label: "Active", status: "active" },
  { label: "Overdue", status: "overdue" },
  { label: "Returned", status: "returned" },
  { label: "Rejected", status: "rejected" },
];

export default function AdminRequestsPage() {
  const [activeTab, setActiveTab] = useState<RequestStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [defaultDays, setDefaultDays] = useState(7);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then((s) => setDefaultDays(s.default_borrowing_days));
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const result = await getBorrowRequests({
      status: activeTab,
      search: search || undefined,
      pageSize: 50,
    });
    if ("error" in result && result.error) {
      toast.error(result.error);
      setRequests([]);
    } else {
      setRequests((result.data ?? []) as BorrowRequest[]);
    }
    setLoading(false);
  }, [activeTab, search]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const getBorrowerName = (req: BorrowRequest) => {
    if (req.is_guest && req.guest_profiles) return req.guest_profiles.full_name;
    return req.borrower_profiles?.profiles?.full_name ?? "Unknown";
  };

  const handleApprove = async (requestId: string) => {
    setActionId(requestId);
    const borrowDate = format(new Date(), "yyyy-MM-dd");
    const dueDate = format(
      new Date(Date.now() + defaultDays * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd"
    );
    const result = await approveBorrowRequest(requestId, borrowDate, dueDate);
    setActionId(null);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Request approved");
      loadRequests();
    }
  };

  const handleReject = async (requestId: string) => {
    setActionId(requestId);
    const result = await rejectBorrowRequest(requestId, rejectReason || undefined);
    setActionId(null);
    setRejectingId(null);
    setRejectReason("");
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Request rejected");
      loadRequests();
    }
  };

  const handleActivate = async (requestId: string) => {
    setActionId(requestId);
    const result = await activateBorrowRequest(requestId);
    setActionId(null);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Request activated — items released");
      loadRequests();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2937]">Borrow Requests</h1>
        <p className="text-sm text-[#6B7280]">Review and manage borrowing requests</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#E5E7EB] pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.status}
            onClick={() => setActiveTab(tab.status)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.status
                ? "bg-[#1565C0] text-white"
                : "text-[#6B7280] hover:bg-[#E3F2FD] hover:text-[#1565C0]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          loadRequests();
        }}
        className="flex gap-3"
      >
        <Input
          placeholder="Search by request number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {loading ? (
        <LoadingSpinner />
      ) : requests.length === 0 ? (
        <EmptyState title="No requests found" description="No borrow requests match this filter." />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {req.request_number}
                    <Badge status={req.status} />
                    {req.is_guest && (
                      <span className="rounded-full bg-[#FFF8D6] px-2 py-0.5 text-xs font-medium text-[#92400E]">
                        Guest
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-[#6B7280]">
                    {getBorrowerName(req)} · {formatDateTime(req.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {req.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(req.id)}
                        disabled={actionId === req.id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRejectingId(rejectingId === req.id ? null : req.id)}
                        disabled={actionId === req.id}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {req.status === "approved" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleActivate(req.id)}
                      disabled={actionId === req.id}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {req.borrow_date && (
                  <p className="text-sm text-[#6B7280]">
                    Borrow: {formatDate(req.borrow_date)} · Due: {formatDate(req.due_date)}
                  </p>
                )}
                {req.rejection_reason && (
                  <p className="text-sm text-red-600">Reason: {req.rejection_reason}</p>
                )}
                {req.notes && <p className="text-sm text-[#6B7280]">Notes: {req.notes}</p>}
                <ul className="divide-y divide-[#E5E7EB] rounded-lg border border-[#E5E7EB]">
                  {(req.borrow_request_items ?? []).map((item) => (
                    <li key={item.id} className="flex justify-between px-4 py-2 text-sm">
                      <span>{item.inventory?.name ?? "Item"}</span>
                      <span className="text-[#6B7280]">Qty: {item.quantity}</span>
                    </li>
                  ))}
                </ul>
                {rejectingId === req.id && (
                  <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4">
                    <Textarea
                      label="Rejection reason (optional)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(req.id)}
                        disabled={actionId === req.id}
                      >
                        Confirm Reject
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
