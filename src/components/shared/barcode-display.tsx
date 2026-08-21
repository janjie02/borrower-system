"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeDisplayProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
}

export function BarcodeDisplay({
  value,
  width = 2,
  height = 80,
  displayValue = true,
  className,
}: BarcodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue,
          fontSize: 14,
          margin: 10,
          background: "#ffffff",
          lineColor: "#1F2937",
        });
      } catch {
        // Invalid barcode value
      }
    }
  }, [value, width, height, displayValue]);

  return <svg ref={svgRef} className={className} />;
}

export function BarcodePrintView({
  name,
  sku,
  barcode,
}: {
  name: string;
  sku: string;
  barcode: string;
}) {
  const handlePrint = () => window.print();

  return (
    <div>
      <div className="print-label hidden print:block p-4 border border-gray-300 text-center">
        <p className="font-bold text-sm">{name}</p>
        <BarcodeDisplay value={barcode} height={60} />
        <p className="text-xs mt-1">{sku}</p>
      </div>
      <div className="print:hidden">
        <div className="rounded-2xl border border-white/10 p-4 text-center bg-surface">
          <p className="text-xs font-medium text-muted mb-3">Scannable label</p>
          <div className="rounded-xl bg-white p-4">
            <p className="font-semibold text-[#1F2937] mb-2">{name}</p>
            <BarcodeDisplay value={barcode} className="mx-auto" />
            <p className="text-sm text-[#6B7280] mt-2">{sku}</p>
          </div>
          <button
            onClick={handlePrint}
            className="mt-4 text-sm font-medium text-accent hover:underline cursor-pointer"
          >
            Print Label
          </button>
        </div>
      </div>
    </div>
  );
}
