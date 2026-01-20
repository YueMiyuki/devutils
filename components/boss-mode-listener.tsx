"use client";

import { useEffect, useState, useCallback } from "react";
import { useSettingsStore } from "@/lib/settings-store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableProperties, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const spreadsheetData = [
  {
    quarter: "Q1",
    revenue: "$1,234,567",
    growth: "12.3%",
    forecast: "$1,345,000",
  },
  {
    quarter: "Q2",
    revenue: "$1,456,789",
    growth: "18.0%",
    forecast: "$1,567,000",
  },
  {
    quarter: "Q3",
    revenue: "$1,567,890",
    growth: "7.6%",
    forecast: "$1,678,000",
  },
  {
    quarter: "Q4",
    revenue: "$1,890,123",
    growth: "20.5%",
    forecast: "$2,100,000",
  },
];

const monthlyData = [
  { month: "January", sales: 45234, units: 1234, avg: "$36.69" },
  { month: "February", sales: 52341, units: 1456, avg: "$35.95" },
  { month: "March", sales: 48901, units: 1345, avg: "$36.36" },
  { month: "April", sales: 61234, units: 1678, avg: "$36.49" },
  { month: "May", sales: 58902, units: 1567, avg: "$37.59" },
  { month: "June", sales: 67123, units: 1890, avg: "$35.51" },
];

export function BossModeListener() {
  const { bossMode } = useSettingsStore();
  const [decoyVisible, setDecoyVisible] = useState(false);

  const showDecoy = useCallback(() => {
    setDecoyVisible(true);
  }, []);

  const hideDecoy = useCallback(() => {
    setDecoyVisible(false);
  }, []);

  useEffect(() => {
    if (!bossMode.isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (decoyVisible) {
        e.preventDefault();
        hideDecoy();
        return;
      }

      if (e.key === bossMode.panicKey || e.code === bossMode.panicKey) {
        e.preventDefault();
        showDecoy();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    bossMode.isActive,
    bossMode.panicKey,
    decoyVisible,
    showDecoy,
    hideDecoy,
  ]);

  if (!decoyVisible) return null;

  return (
    <div
      className="fixed inset-0 z-100 cursor-pointer overflow-auto bg-background"
      onClick={hideDecoy}
    >
      <div className="flex h-full flex-col">
        <div
          className="
          flex items-center gap-4 bg-[#217346] px-4 py-2 text-white
          dark:bg-[#185c37]
        "
        >
          <TableProperties className="size-6" />
          <span className="font-semibold">Q4 Revenue Analysis - Excel</span>
          <div className="flex-1" />
          <Badge
            variant="secondary"
            className="
              bg-white/20 text-white
              hover:bg-white/30
            "
          >
            AutoSave On
          </Badge>
        </div>

        <div className="flex gap-6 border-b bg-muted px-4 py-2 text-xs">
          <span
            className="
            font-medium text-[#217346]
            dark:text-[#4ade80]
          "
          >
            Home
          </span>
          <span
            className="
            cursor-pointer text-muted-foreground transition-colors
            hover:text-foreground
          "
          >
            Insert
          </span>
          <span
            className="
            cursor-pointer text-muted-foreground transition-colors
            hover:text-foreground
          "
          >
            Page Layout
          </span>
          <span
            className="
            cursor-pointer text-muted-foreground transition-colors
            hover:text-foreground
          "
          >
            Formulas
          </span>
          <span
            className="
            cursor-pointer text-muted-foreground transition-colors
            hover:text-foreground
          "
          >
            Data
          </span>
          <span
            className="
            cursor-pointer text-muted-foreground transition-colors
            hover:text-foreground
          "
          >
            Review
          </span>
          <span
            className="
            cursor-pointer text-muted-foreground transition-colors
            hover:text-foreground
          "
          >
            View
          </span>
        </div>

        <div
          className="
          flex items-center gap-2 border-b bg-background px-4 py-1 text-sm
        "
        >
          <span
            className="
            rounded-sm border bg-muted px-2 py-0.5 font-mono text-xs
          "
          >
            A1
          </span>
          <span className="text-muted-foreground">fx</span>
          <span className="font-mono text-xs text-foreground">
            =SUM(B2:B13)
          </span>
        </div>

        <div className="flex-1 overflow-auto bg-background p-4">
          <h2 className="mb-4 text-xl font-bold text-foreground">
            Quarterly Revenue Report FY2024
          </h2>

          <Table className="mb-8">
            <TableHeader>
              <TableRow>
                <TableHead>Quarter</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Growth</TableHead>
                <TableHead>Forecast</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spreadsheetData.map((row) => (
                <TableRow key={row.quarter}>
                  <TableCell className="font-medium">{row.quarter}</TableCell>
                  <TableCell>{row.revenue}</TableCell>
                  <TableCell
                    className="
                    text-green-600
                    dark:text-green-400
                  "
                  >
                    {row.growth}
                  </TableCell>
                  <TableCell>{row.forecast}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <h3 className="mb-3 text-lg font-semibold text-foreground">
            Monthly Breakdown
          </h3>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Total Sales</TableHead>
                <TableHead>Units Sold</TableHead>
                <TableHead>Avg Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium">{row.month}</TableCell>
                  <TableCell>${row.sales.toLocaleString()}</TableCell>
                  <TableCell>{row.units.toLocaleString()}</TableCell>
                  <TableCell>{row.avg}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center gap-1 border-t bg-muted px-2 py-1">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground"
            >
              <ChevronLeft className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground"
            >
              <ChevronRight className="size-3" />
            </Button>
          </div>
          <div className="ml-2 flex gap-0.5">
            <div
              className="
              cursor-pointer rounded-t border border-b-0 bg-background px-3 py-1
              text-xs font-medium
            "
            >
              Q4 Summary
            </div>
            <div
              className="
              cursor-pointer rounded-t border border-b-0 bg-muted/50 px-3 py-1
              text-xs text-muted-foreground
              hover:bg-muted
            "
            >
              Monthly Data
            </div>
            <div
              className="
              cursor-pointer rounded-t border border-b-0 bg-muted/50 px-3 py-1
              text-xs text-muted-foreground
              hover:bg-muted
            "
            >
              Charts
            </div>
            <div
              className="
              cursor-pointer rounded-t border border-b-0 bg-muted/50 px-3 py-1
              text-xs text-muted-foreground
              hover:bg-muted
            "
            >
              Raw Data
            </div>
          </div>
        </div>

        <div
          className="
          flex items-center justify-between bg-[#217346] px-4 py-1 text-xs
          text-white
          dark:bg-[#185c37]
        "
        >
          <span>Ready</span>
          <span>Sum: $6,149,369 | Average: $1,024,895 | Count: 6</span>
        </div>
      </div>

      <div
        className="
        fixed right-4 bottom-4 flex items-center gap-2 rounded-lg
        bg-foreground/90 px-3 py-2 text-sm text-background shadow-lg
      "
      >
        <X className="size-4" />
        Click anywhere or press any key to close
      </div>
    </div>
  );
}
