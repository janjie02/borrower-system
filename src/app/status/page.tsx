"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, ArrowLeft, Package } from "lucide-react";
import { lookupBorrowRequestByNumber } from "@/lib/actions/borrowing";
import { PublicHeader } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, LoadingSpinner } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";

type LookupResult = NonNullable<
  Awaited<ReturnType<typeof lookupBorrowRequestByNumber>>["data"]
>;

function StatusChecker() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") ?? "";

  const [reference, setReference] = useState(initialRef);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);

  const lookup = async (value: string) => {
    setError("");
    setResult(null);
    setLoading(true);
    const res = await lookupBorrowRequestByNumber(value);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.data) setResult(res.data);
  };

  useEffect(() => {
    if (initialRef.trim()) {
      lookup(initialRef);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRef]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await lookup(reference);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Check borrow status</CardTitle>
        <CardDescription>
          Enter your request reference number (for example REQ-000001) to see your status and items.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            label="Reference number"
            placeholder="REQ-000001"
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            className="flex-1 font-mono"
            required
          />
          <Button type="submit" className="sm:mt-7" disabled={loading}>
            <Search className="h-4 w-4" />
            {loading ? "Checking…" : "Check"}
          </Button>
        </form>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading && <LoadingSpinner />}

        {result && (
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-lg font-bold text-accent">{result.requestNumber}</p>
                <p className="text-sm text-muted">{result.borrowerName}</p>
              </div>
              <Badge status={result.status} />
            </div>

            <div className="grid gap-2 text-sm">
              <p>
                <span className="text-muted">Submitted: </span>
                <span className="text-white">{formatDateTime(result.createdAt)}</span>
              </p>
              {result.borrowDate && (
                <p>
                  <span className="text-muted">Borrow date: </span>
                  <span className="text-white">{formatDate(result.borrowDate)}</span>
                </p>
              )}
              {result.dueDate && (
                <p>
                  <span className="text-muted">Due date: </span>
                  <span className="text-white">{formatDate(result.dueDate)}</span>
                </p>
              )}
              {result.rejectionReason && (
                <p className="text-red-200">Reason: {result.rejectionReason}</p>
              )}
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <Package className="h-4 w-4 text-accent" />
                Items
              </p>
              <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
                {result.items.map((item, i) => (
                  <li key={`${item.name}-${i}`} className="flex justify-between px-3 py-2 text-sm">
                    <span className="text-white">{item.name}</span>
                    <span className="text-muted">×{item.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted">
              Tip: Save your reference number. You can check this page anytime without logging in.
            </p>
          </div>
        )}

        <Button asChild variant="ghost" className="w-full">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function StatusPage() {
  return (
    <div className="flex min-h-screen flex-col app-bg">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Suspense
          fallback={
            <Card className="w-full max-w-lg">
              <CardContent className="py-16">
                <LoadingSpinner />
              </CardContent>
            </Card>
          }
        >
          <StatusChecker />
        </Suspense>
      </main>
    </div>
  );
}
