import Link from "next/link";
import { Search } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { Badge, EmptyState } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCreditStatus, formatDate } from "@/lib/utils";
import type { BorrowerProfile, Profile } from "@/types";

type BorrowerRow = BorrowerProfile & { profiles: Profile };

export default async function AdminBorrowersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    type?: string;
    status?: string;
    page?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const search = params.search ?? "";
  const accountType = params.type ?? "all";
  const accountStatus = params.status ?? "all";
  const page = Number(params.page) || 1;
  const pageSize = 20;

  const supabase = createAdminClient();
  let query = supabase
    .from("borrower_profiles")
    .select("*, profiles!inner(*)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `id_code.ilike.%${search}%,profiles.full_name.ilike.%${search}%,profiles.email.ilike.%${search}%`
    );
  }
  if (accountType !== "all") {
    query = query.eq("account_type", accountType);
  }
  if (accountStatus !== "all") {
    query = query.eq("profiles.account_status", accountStatus);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        Failed to load borrowers
      </div>
    );
  }

  const borrowers = (data ?? []) as BorrowerRow[];
  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2937]">Borrowers</h1>
        <p className="text-sm text-[#6B7280]">{total} registered borrowers</p>
      </div>

      <form method="GET" className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by name, email, or ID code..."
            className="flex h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
          />
        </div>
        <select
          name="type"
          defaultValue={accountType}
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm"
        >
          <option value="all">All Types</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        <select
          name="status"
          defaultValue={accountStatus}
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="disabled">Disabled</option>
          <option value="pending_verification">Pending</option>
        </select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {borrowers.length === 0 ? (
        <EmptyState title="No borrowers found" description="Try adjusting your filters." />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">ID Code</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Credit</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {borrowers.map((borrower) => {
                  const credit = getCreditStatus(borrower.credit_score);
                  return (
                    <tr key={borrower.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/borrowers/${borrower.id}`}
                          className="font-medium text-[#1565C0] hover:underline"
                        >
                          {borrower.profiles?.full_name ?? "—"}
                        </Link>
                        <p className="text-xs text-[#6B7280]">{borrower.profiles?.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{borrower.id_code}</td>
                      <td className="px-4 py-3 capitalize">{borrower.account_type}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${credit.color}`}>
                          {borrower.credit_score}
                        </span>
                        <span className="ml-1 text-xs text-[#6B7280]">({credit.label})</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={borrower.profiles?.account_status ?? "active"} />
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {formatDate(borrower.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/admin/borrowers?search=${search}&type=${accountType}&status=${accountStatus}&page=${page - 1}`}
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
                    href={`/admin/borrowers?search=${search}&type=${accountType}&status=${accountStatus}&page=${page + 1}`}
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
