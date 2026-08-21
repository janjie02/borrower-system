import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { getBorrowerDashboardStats } from "@/lib/actions/settings";
import { Badge, StatCard } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCreditStatus, formatDate, formatDateTime, capitalize } from "@/lib/utils";
import type { BorrowerProfile, Profile, CreditHistoryEntry, BorrowRequest } from "@/types";

type BorrowerRow = BorrowerProfile & { profiles: Profile };

export default async function BorrowerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: borrower, error } = await supabase
    .from("borrower_profiles")
    .select("*, profiles(*)")
    .eq("id", id)
    .single();

  if (error || !borrower) {
    notFound();
  }

  const profile = borrower as BorrowerRow;
  const credit = getCreditStatus(profile.credit_score);

  const [stats, creditHistoryRes, requestsRes] = await Promise.all([
    getBorrowerDashboardStats(id),
    supabase
      .from("credit_history")
      .select("*")
      .eq("borrower_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("borrow_requests")
      .select("id, request_number, status, borrow_date, due_date, created_at")
      .eq("borrower_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const creditHistory = (creditHistoryRes.data ?? []) as CreditHistoryEntry[];
  const recentRequests = (requestsRes.data ?? []) as BorrowRequest[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/borrowers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {profile.profiles?.full_name ?? "Borrower"}
          </h1>
          <p className="text-sm text-muted">{profile.profiles?.email}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Credit Score" value={profile.credit_score} accent={profile.credit_score < 300} />
        <StatCard label="Currently Borrowed" value={stats.currentlyBorrowed} />
        <StatCard label="Total Borrowings" value={stats.totalBorrowed} />
        <StatCard label="Overdue" value={stats.overdueCount} accent={stats.overdueCount > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">ID Code</dt>
                <dd className="font-mono font-medium">{profile.id_code}</dd>
              </div>
              <div>
                <dt className="text-muted">Account Type</dt>
                <dd className="capitalize font-medium">{profile.account_type}</dd>
              </div>
              {profile.account_type === "student" && (
                <>
                  <div>
                    <dt className="text-muted">Year</dt>
                    <dd className="font-medium">{profile.year ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Section</dt>
                    <dd className="font-medium">{profile.section ?? "—"}</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-muted">Phone</dt>
                <dd className="font-medium">{profile.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Status</dt>
                <dd>
                  <Badge status={profile.profiles?.account_status ?? "active"} />
                </dd>
              </div>
              <div>
                <dt className="text-muted">Credit Status</dt>
                <dd className={`font-semibold ${credit.color}`}>{credit.label}</dd>
              </div>
              <div>
                <dt className="text-muted">Member Since</dt>
                <dd className="font-medium">{formatDate(profile.created_at)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <p className="text-sm text-muted">No borrowing history yet</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {recentRequests.map((req) => (
                  <li key={req.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-mono text-accent">{req.request_number}</span>
                    <Badge status={req.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Credit History</CardTitle>
        </CardHeader>
        <CardContent>
          {creditHistory.length === 0 ? (
            <p className="text-sm text-muted">No credit transactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="py-2 text-left font-medium text-muted">Date</th>
                    <th className="py-2 text-left font-medium text-muted">Type</th>
                    <th className="py-2 text-left font-medium text-muted">Behavior</th>
                    <th className="py-2 text-right font-medium text-muted">Change</th>
                    <th className="py-2 text-right font-medium text-muted">New Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {creditHistory.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2 text-muted">{formatDateTime(entry.created_at)}</td>
                      <td className="py-2 capitalize">{capitalize(entry.transaction_type)}</td>
                      <td className="py-2 max-w-xs truncate">{entry.behavior}</td>
                      <td
                        className={`py-2 text-right font-semibold ${
                          entry.credit_change >= 0 ? "text-emerald-200" : "text-red-200"
                        }`}
                      >
                        {entry.credit_change > 0 ? "+" : ""}
                        {entry.credit_change}
                      </td>
                      <td className="py-2 text-right font-medium">{entry.new_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
