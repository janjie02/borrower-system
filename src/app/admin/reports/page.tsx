"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { exportReport } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const REPORT_TYPES = [
  {
    id: "borrowing_history",
    title: "Borrowing History",
    description: "Complete list of all borrow requests with status and dates.",
  },
  {
    id: "inventory",
    title: "Inventory Report",
    description: "Current inventory levels including SKU, barcode, and availability.",
  },
  {
    id: "overdue",
    title: "Overdue Items",
    description: "All requests currently marked as overdue.",
  },
];

export default function AdminReportsPage() {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (type: string, title: string) => {
    setExporting(type);
    try {
      const csv = await exportReport(type);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`${title} exported successfully`);
    } catch {
      toast.error("Failed to export report");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2937]">Reports</h1>
        <p className="text-sm text-[#6B7280]">Export system data as CSV files</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-[#1565C0]" />
                {report.title}
              </CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleExport(report.id, report.title)}
                disabled={exporting === report.id}
                className="w-full"
              >
                <Download className="h-4 w-4" />
                {exporting === report.id ? "Exporting..." : "Download CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
