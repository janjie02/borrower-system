"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Package,
  Users,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  UserCog,
} from "lucide-react";
import { getAdminDashboardStats, getChartData } from "@/lib/actions/settings";
import { StatCard, LoadingSpinner } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PIE_COLORS = ["#1565C0", "#FBC02D", "#EF4444", "#9CA3AF"];
const CHART_DAYS_OPTIONS = [7, 30, 90];

type Stats = Awaited<ReturnType<typeof getAdminDashboardStats>>;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [borrowingActivity, setBorrowingActivity] = useState<{ date: string; count: number }[]>([]);
  const [mostBorrowed, setMostBorrowed] = useState<{ name: string; count: number }[]>([]);
  const [inventoryBreakdown, setInventoryBreakdown] = useState<
    { name: string; value: number }[]
  >([]);
  const [days, setDays] = useState(30);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const dateRange =
        dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;

      const [statsData, activity, borrowed, returnPerf] = await Promise.all([
        getAdminDashboardStats(dateRange),
        getChartData("borrowing_activity", days),
        getChartData("most_borrowed", days),
        getChartData("return_performance", days),
      ]);

      setStats(statsData);
      setBorrowingActivity(activity as { date: string; count: number }[]);
      setMostBorrowed(borrowed as { name: string; count: number }[]);

      if (statsData.inventoryBreakdown) {
        setInventoryBreakdown([
          { name: "Available", value: statsData.inventoryBreakdown.available },
          { name: "Borrowed", value: statsData.inventoryBreakdown.borrowed },
          { name: "Damaged", value: statsData.inventoryBreakdown.damaged },
          { name: "Lost", value: statsData.inventoryBreakdown.lost },
        ]);
      }

      void returnPerf;
    } finally {
      setLoading(false);
    }
  }, [days, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !stats) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Dashboard</h1>
          <p className="text-sm text-[#6B7280]">Overview of borrowing system activity</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Input
            type="date"
            label="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
          <Input
            type="date"
            label="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
          <div className="flex gap-1">
            {CHART_DAYS_OPTIONS.map((d) => (
              <Button
                key={d}
                variant={days === d ? "default" : "outline"}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Apply
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Inventory"
          value={stats?.totalInventory ?? 0}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="Available Items"
          value={stats?.availableItems ?? 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Currently Borrowed"
          value={stats?.currentlyBorrowed ?? 0}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard
          label="Overdue"
          value={stats?.overdue ?? 0}
          accent={(stats?.overdue ?? 0) > 0}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Borrowers" value={stats?.totalBorrowers ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Staff Members" value={stats?.totalStaff ?? 0} icon={<UserCog className="h-5 w-5" />} />
        <StatCard
          label="Pending Requests"
          value={stats?.pendingRequests ?? 0}
          accent={(stats?.pendingRequests ?? 0) > 0}
        />
        <StatCard label="Total Borrowings" value={stats?.totalBorrowings ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#1F2937]">Borrowing Activity</h2>
          {borrowingActivity.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#6B7280]">No activity in this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={borrowingActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#1F2937]">Most Borrowed Items</h2>
          {mostBorrowed.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#6B7280]">No borrowing data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mostBorrowed.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1565C0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-[#1F2937]">Inventory Breakdown</h2>
          {inventoryBreakdown.every((i) => i.value === 0) ? (
            <p className="py-8 text-center text-sm text-[#6B7280]">No inventory data</p>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={inventoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {inventoryBreakdown.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {inventoryBreakdown.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-[#6B7280]">{item.name}</span>
                    <span className="font-semibold text-[#1F2937]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
