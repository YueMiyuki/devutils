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

interface BossModeProps {
  tabId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BossMode({ tabId: _tabId }: BossModeProps) {
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
    // Skip panic key handling while recording a new key to avoid race condition
    if (!bossMode.isActive || isRecordingKey) return;

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
    isRecordingKey,
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
      <div className="h-full space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div
            className="
            flex size-10 items-center justify-center rounded-lg
            bg-emerald-500/10 text-emerald-500
          "
          >
            <TableProperties className="size-5" />
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

        <div
          className="
          grid gap-6
          lg:grid-cols-2
        "
        >
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
                  <div className="relative flex-1">
                    <Keyboard
                      className="
                      absolute top-1/2 left-3 size-4 -translate-y-1/2
                      text-muted-foreground
                    "
                    />
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
                <Shield className="mr-2 size-4" />
                {t("tools.bossMode.testDecoy")}
              </Button>

              {/* Status */}
              <div
                className={`
                  rounded-lg border p-4
                  ${
                    bossMode.isActive
                      ? `border-green-500/50 bg-green-500/10`
                      : `
                    border-border bg-muted/50
                  `
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`
                      size-2 rounded-full
                      ${
                        bossMode.isActive
                          ? `animate-pulse bg-green-500`
                          : `
                        bg-muted-foreground
                      `
                      }
                    `}
                  />
                  <span className="text-sm font-medium">
                    {bossMode.isActive
                      ? t("tools.bossMode.active")
                      : t("tools.bossMode.inactive")}
                  </span>
                </div>
                {bossMode.isActive && (
                  <p className="mt-1 text-xs text-muted-foreground">
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
              <div
                className="
                space-y-4 overflow-hidden rounded-lg border bg-background p-4
              "
              >
                <div className="flex items-center gap-2">
                  <TableProperties
                    className="
                    size-5 text-green-600
                    dark:text-green-400
                  "
                  />
                  <span className="text-sm font-semibold text-foreground">
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
                        <TableCell
                          className="
                          text-xs text-green-600
                          dark:text-green-400
                        "
                        >
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
          <CardContent>
            <div className="flex gap-3">
              <AlertCircle className="size-5 shrink-0 text-yellow-500" />
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
          className="
            fixed inset-0 z-100 cursor-pointer overflow-auto bg-background
          "
          onClick={hideDecoy}
        >
          {/* Fake Excel interface */}
          <div className="flex h-full flex-col">
            {/* Toolbar */}
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

            {/* Ribbon */}
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

            {/* Formula Bar */}
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

            {/* Spreadsheet */}
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
                      <TableCell className="font-medium">
                        {row.quarter}
                      </TableCell>
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

            {/* Sheet Tabs */}
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
                  cursor-pointer rounded-t border border-b-0 bg-background px-3
                  py-1 text-xs font-medium
                "
                >
                  Q4 Summary
                </div>
                <div
                  className="
                  cursor-pointer rounded-t border border-b-0 bg-muted/50 px-3
                  py-1 text-xs text-muted-foreground
                  hover:bg-muted
                "
                >
                  Monthly Data
                </div>
                <div
                  className="
                  cursor-pointer rounded-t border border-b-0 bg-muted/50 px-3
                  py-1 text-xs text-muted-foreground
                  hover:bg-muted
                "
                >
                  Charts
                </div>
                <div
                  className="
                  cursor-pointer rounded-t border border-b-0 bg-muted/50 px-3
                  py-1 text-xs text-muted-foreground
                  hover:bg-muted
                "
                >
                  Raw Data
                </div>
              </div>
            </div>

            {/* Status Bar */}
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

          {/* Close hint */}
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
      )}
    </>
  );
}
