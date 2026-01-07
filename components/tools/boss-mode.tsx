"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TableProperties,
  Keyboard,
  Shield,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useSettingsStore } from "@/lib/settings-store";

// Fake spreadsheet data
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

export function BossMode() {
  const { t } = useTranslation();
  const { bossMode, setBossModeActive, setBossModePanicKey } =
    useSettingsStore();
  const [isRecordingKey, setIsRecordingKey] = useState(false);
  const [decoyVisible, setDecoyVisible] = useState(false);

  const showDecoy = useCallback(() => {
    setDecoyVisible(true);
    toast.success(t("tools.bossMode.activated"), {
      description: t("tools.bossMode.activatedDescription"),
    });
  }, [t]);

  const hideDecoy = useCallback(() => {
    setDecoyVisible(false);
  }, []);

  // Listen for panic key
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

  // Record new panic key
  useEffect(() => {
    if (!isRecordingKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const newKey = e.key === " " ? "Space" : e.key;
      setBossModePanicKey(newKey);
      setIsRecordingKey(false);
      toast.success(t("tools.bossMode.panicKeySet", { key: newKey }));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecordingKey, setBossModePanicKey, t]);

  return (
    <>
      <div className="h-full p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500">
            <TableProperties className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              {t("tools.bossMode.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("tools.bossMode.subtitle")}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("tools.bossMode.settings")}
              </CardTitle>
              <CardDescription>
                {t("tools.bossMode.settingsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    {t("tools.bossMode.enable")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("tools.bossMode.enableDescription")}
                  </p>
                </div>
                <Switch
                  checked={bossMode.isActive}
                  onCheckedChange={setBossModeActive}
                />
              </div>

              {/* Panic Key */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {t("tools.bossMode.panicKey")}
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={
                        isRecordingKey
                          ? t("tools.bossMode.pressAnyKey")
                          : bossMode.panicKey
                      }
                      readOnly
                      className="pl-9 font-mono"
                    />
                  </div>
                  <Button
                    variant={isRecordingKey ? "destructive" : "outline"}
                    onClick={() => setIsRecordingKey(!isRecordingKey)}
                  >
                    {isRecordingKey
                      ? t("tools.bossMode.cancel")
                      : t("tools.bossMode.change")}
                  </Button>
                </div>
              </div>

              {/* Test Button */}
              <Button
                onClick={showDecoy}
                variant="outline"
                className="w-full bg-transparent"
                disabled={!bossMode.isActive}
              >
                <Shield className="w-4 h-4 mr-2" />
                {t("tools.bossMode.testDecoy")}
              </Button>

              {/* Status */}
              <div
                className={`p-4 rounded-lg border ${bossMode.isActive ? "border-green-500/50 bg-green-500/10" : "border-border bg-muted/50"}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${bossMode.isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`}
                  />
                  <span className="text-sm font-medium">
                    {bossMode.isActive
                      ? t("tools.bossMode.active")
                      : t("tools.bossMode.inactive")}
                  </span>
                </div>
                {bossMode.isActive && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("tools.bossMode.pressToActivate", {
                      key: bossMode.panicKey,
                    })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("tools.bossMode.decoyPreview")}
              </CardTitle>
              <CardDescription>
                {t("tools.bossMode.decoyPreviewDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-background p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <TableProperties className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-sm text-foreground">
                    Q4 Revenue Analysis.xlsx
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Quarter</TableHead>
                      <TableHead className="text-xs">Revenue</TableHead>
                      <TableHead className="text-xs">Growth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spreadsheetData.slice(0, 3).map((row) => (
                      <TableRow key={row.quarter}>
                        <TableCell className="text-xs font-medium">
                          {row.quarter}
                        </TableCell>
                        <TableCell className="text-xs">{row.revenue}</TableCell>
                        <TableCell className="text-xs text-green-600 dark:text-green-400">
                          {row.growth}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warning */}
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t("tools.bossMode.disclaimer")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("tools.bossMode.disclaimerText")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Screen Decoy Overlay */}
      {decoyVisible && (
        <div
          className="fixed inset-0 z-100 bg-background overflow-auto cursor-pointer"
          onClick={hideDecoy}
        >
          {/* Fake Excel interface */}
          <div className="h-full flex flex-col">
            {/* Toolbar */}
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

            {/* Ribbon */}
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

            {/* Formula Bar */}
            <div className="bg-background border-b px-4 py-1 flex items-center gap-2 text-sm">
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border">
                A1
              </span>
              <span className="text-muted-foreground">fx</span>
              <span className="font-mono text-xs text-foreground">
                =SUM(B2:B13)
              </span>
            </div>

            {/* Spreadsheet */}
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
                      <TableCell className="font-medium">
                        {row.quarter}
                      </TableCell>
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

            {/* Sheet Tabs */}
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

            {/* Status Bar */}
            <div className="bg-[#217346] dark:bg-[#185c37] text-white px-4 py-1 text-xs flex items-center justify-between">
              <span>Ready</span>
              <span>Sum: $6,149,369 | Average: $1,024,895 | Count: 6</span>
            </div>
          </div>

          {/* Close hint */}
          <div className="fixed bottom-4 right-4 bg-foreground/90 text-background px-3 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg">
            <X className="w-4 h-4" />
            Click anywhere or press any key to close
          </div>
        </div>
      )}
    </>
  );
}
