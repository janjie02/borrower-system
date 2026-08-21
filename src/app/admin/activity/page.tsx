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
      <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-6 text-red-200">
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
        <h1 className="text-2xl font-bold text-white">Activity Log</h1>
        <p className="text-sm text-muted">{total} recorded events</p>
      </div>

      <form method="GET" className="flex gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by action, email, or target..."
            className="flex h-10 w-full rounded-lg border border-white/10 bg-surface pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
          <div className="overflow-hidden rounded-xl border border-white/10 bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Actor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{log.actor_email ?? "System"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                        {capitalize(log.action.replace(/\./g, " "))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
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
              <span className="text-sm text-muted">
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
