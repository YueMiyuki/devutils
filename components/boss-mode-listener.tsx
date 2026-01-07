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
      className="fixed inset-0 z-[100] bg-background overflow-auto cursor-pointer"
      onClick={hideDecoy}
    >
      <div className="h-full flex flex-col">
        <div className="bg-[#217346] dark:bg-[#185c37] text-white px-4 py-2 flex items-center gap-4">
          <TableProperties className="w-6 h-6" />
          <span className="font-semibold">Q4 Revenue Analysis - Excel</span>
          <div className="flex-1" />
          <Badge
            variant="secondary"
            className="bg-white/20 hover:bg-white/30 text-white"
          >
            AutoSave On
          </Badge>
        </div>

        <div className="bg-muted border-b px-4 py-2 flex gap-6 text-xs">
          <span className="font-medium text-[#217346] dark:text-[#4ade80]">
            Home
          </span>
          <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            Insert
          </span>
          <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            Page Layout
          </span>
          <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            Formulas
          </span>
          <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            Data
          </span>
          <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            Review
          </span>
          <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            View
          </span>
        </div>

        <div className="bg-background border-b px-4 py-1 flex items-center gap-2 text-sm">
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border">
            A1
          </span>
          <span className="text-muted-foreground">fx</span>
          <span className="font-mono text-xs text-foreground">
            =SUM(B2:B13)
          </span>
        </div>

        <div className="flex-1 p-4 overflow-auto bg-background">
          <h2 className="text-xl font-bold mb-4 text-foreground">
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
                  <TableCell className="text-green-600 dark:text-green-400">
                    {row.growth}
                  </TableCell>
                  <TableCell>{row.forecast}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <h3 className="text-lg font-semibold mb-3 text-foreground">
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

        <div className="bg-muted border-t px-2 py-1 flex items-center gap-1">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-0.5 ml-2">
            <div className="px-3 py-1 text-xs bg-background border border-b-0 rounded-t font-medium cursor-pointer">
              Q4 Summary
            </div>
            <div className="px-3 py-1 text-xs bg-muted/50 border border-b-0 rounded-t text-muted-foreground cursor-pointer hover:bg-muted">
              Monthly Data
            </div>
            <div className="px-3 py-1 text-xs bg-muted/50 border border-b-0 rounded-t text-muted-foreground cursor-pointer hover:bg-muted">
              Charts
            </div>
            <div className="px-3 py-1 text-xs bg-muted/50 border border-b-0 rounded-t text-muted-foreground cursor-pointer hover:bg-muted">
              Raw Data
            </div>
          </div>
        </div>

        <div className="bg-[#217346] dark:bg-[#185c37] text-white px-4 py-1 text-xs flex items-center justify-between">
          <span>Ready</span>
          <span>Sum: $6,149,369 | Average: $1,024,895 | Count: 6</span>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 bg-foreground/90 text-background px-3 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg">
        <X className="w-4 h-4" />
        Click anywhere or press any key to close
      </div>
    </div>
  );
}
