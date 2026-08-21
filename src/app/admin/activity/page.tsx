import Link from "next/link";
import { Search } from "lucide-react";
import { getActivityLogs } from "@/lib/actions/settings";
import { EmptyState } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, capitalize } from "@/lib/utils";
import type { ActivityLog } from "@/types";

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Number(params.page) || 1;

  const result = await getActivityLogs(search || undefined, page, 50);

  if ("error" in result && result.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        {result.error}
      </div>
    );
  }

  const logs = (result.data ?? []) as ActivityLog[];
  const total = result.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2937]">Activity Log</h1>
        <p className="text-sm text-[#6B7280]">{total} recorded events</p>
      </div>

      <form method="GET" className="flex gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by action, email, or target..."
            className="flex h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {logs.length === 0 ? (
        <EmptyState title="No activity found" description="Try a different search term." />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Actor</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-[#6B7280]">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3 whitespace-nowrap text-[#6B7280]">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1F2937]">{log.actor_email ?? "System"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#E3F2FD] px-2.5 py-0.5 text-xs font-medium text-[#1565C0]">
                        {capitalize(log.action.replace(/\./g, " "))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280]">
                      {log.target_type && (
                        <span className="text-xs uppercase tracking-wide">{log.target_type}</span>
                      )}
                      {log.target_id && (
                        <p className="font-mono text-xs truncate max-w-[200px]">{log.target_id}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/activity?search=${search}&page=${page - 1}`}>
                    Previous
                  </Link>
                </Button>
              )}
              <span className="text-sm text-[#6B7280]">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/activity?search=${search}&page=${page + 1}`}>
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
