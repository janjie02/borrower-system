import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getBorrowerDashboardStats } from "@/lib/actions/settings";
import { StatCard } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCreditStatus } from "@/lib/utils";
import {
  Package,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Camera,
} from "lucide-react";

export default async function BorrowerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const stats = await getBorrowerDashboardStats(user.id);
  const credit = getCreditStatus(stats.creditScore);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2937]">
          Hello, {user.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Here&apos;s your borrowing overview
        </p>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${credit.gradient} p-6 text-white shadow-lg`}
      >
        <div className="relative z-10">
          <p className="text-sm font-medium text-white/80">Credit Score</p>
          <p className="mt-1 text-5xl font-bold tracking-tight">
            {stats.creditScore}
          </p>
          <p className="mt-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur-sm">
            {credit.label}
          </p>
        </div>
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -right-2 h-24 w-24 rounded-full bg-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Currently Borrowed"
          value={stats.currentlyBorrowed}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="Total Borrowed"
          value={stats.totalBorrowed}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard
          label="Items Due"
          value={stats.itemsDue}
          accent={stats.itemsDue > 0}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="Overdue"
          value={stats.overdueCount}
          accent={stats.overdueCount > 0}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      {stats.mostBorrowedItem !== "—" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-[#1565C0]" />
              Most Borrowed Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-[#1F2937]">
              {stats.mostBorrowedItem}
            </p>
            <p className="text-sm text-[#6B7280]">
              Borrowed {stats.mostBorrowedCount} time
              {stats.mostBorrowedCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <Button asChild size="lg" className="w-full">
          <Link href="/borrower/inventory">
            <Package className="h-5 w-5" />
            Browse Items
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="w-full">
          <Link href="/borrower/borrow">
            <Camera className="h-5 w-5" />
            Submit Borrow Request
          </Link>
        </Button>
      </div>
    </div>
  );
}
