"use client";

import type React from "react";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

interface PortInfo {
  port: number;
  inUse: boolean;
  pid?: number;
  processName?: string;
  needsAdmin?: boolean;
}

interface PortDetectiveProps {
  tabId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PortDetective({ tabId: _tabId }: PortDetectiveProps) {
  const { t } = useTranslation();
  const [singlePort, setSinglePort] = useState<string>("3000");
  const [singlePortInfo, setSinglePortInfo] = useState<PortInfo | null>(null);
  const [isCheckingPort, setIsCheckingPort] = useState(false);
  const [showAdminWarning, setShowAdminWarning] = useState(false);
  const [scanStartPort, setScanStartPort] = useState<string>("1");
  const [scanEndPort, setScanEndPort] = useState<string>("65535");
  const [scanResults, setScanResults] = useState<PortInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const checkPort = useCallback(
    async (port: number) => {
      try {
        const result = await invoke<PortInfo>("check_port", { port });
        return result;
      } catch (err) {
        throw new Error(
          err instanceof Error
            ? err.message
            : t("tools.portDetective.errors.checkFailed"),
        );
      }
    },
    [t],
  );

  const handleCheckSinglePort = async () => {
    const port = parseInt(singlePort);
    if (isNaN(port) || port < 1 || port > 65535) {
      setError(t("tools.portDetective.errors.invalidPort"));
      return;
    }

    setIsCheckingPort(true);
    setError(null);

    try {
      const info = await checkPort(port);
      setSinglePortInfo(info);
      if (info.needsAdmin) {
        setShowAdminWarning(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("tools.portDetective.errors.checkFailed"),
      );
    } finally {
      setIsCheckingPort(false);
    }
  };

  const handleKillProcess = async (pid: number, port?: number) => {
    try {
      await invoke("kill_process", { pid });
      toast.success(t("tools.portDetective.success.processKilled"));

      if (port !== undefined) {
        setScanResults((prev) => prev.filter((r) => r.port !== port));
      }

      if (singlePortInfo && singlePortInfo.port === port) {
        await handleCheckSinglePort();
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("tools.portDetective.errors.killFailed"),
      );
    }
  };

  const handleScanPorts = async () => {
    const startPort = parseInt(scanStartPort);
    const endPort = parseInt(scanEndPort);

    if (
      isNaN(startPort) ||
      isNaN(endPort) ||
      startPort < 1 ||
      endPort > 65535 ||
      startPort > endPort
    ) {
      setError(t("tools.portDetective.errors.invalidRange"));
      return;
    }

    setIsScanning(true);
    setError(null);
    setScanResults([]);
    setScanProgress(0);
    setShowAdminWarning(false);

    try {
      // Use new scan_listening_ports command for much faster scanning
      const results = await invoke<PortInfo[]>("scan_listening_ports", {
        startPort,
        endPort,
      });

      // Check if any results need admin
      if (results.some((r) => r.needsAdmin)) {
        setShowAdminWarning(true);
      }

      setScanResults(results);
      setScanProgress(100);

      if (results.length === 0) {
        toast.info(t("tools.portDetective.noPortsInUse"));
      } else {
        toast.success(
          t("tools.portDetective.success.scanComplete", {
            count: results.length,
          }),
        );
      }
    } catch (err) {
      console.error("Error scanning ports:", err);
      setError(
        err instanceof Error
          ? err.message
          : t("tools.portDetective.errors.scanFailed"),
      );
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const clearSinglePort = () => {
    setSinglePort("3000");
    setSinglePortInfo(null);
    setError(null);
  };

  const clearScan = () => {
    setScanStartPort("1");
    setScanEndPort("65535");
    setScanResults([]);
    setError(null);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      <Tabs defaultValue="single" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-fit shrink-0">
          <TabsTrigger value="single">
            {t("tools.portDetective.singlePortTab")}
          </TabsTrigger>
          <TabsTrigger value="scan">
            {t("tools.portDetective.scanTab")}
          </TabsTrigger>
        </TabsList>

        {showAdminWarning && (
          <div
            className="
            mt-4 flex shrink-0 items-start gap-3 rounded-md border
            border-amber-500/20 bg-amber-500/10 p-4
          "
          >
            <Info
              className="
              mt-0.5 size-5 shrink-0 text-amber-600
              dark:text-amber-400
            "
            />
            <div className="flex-1 space-y-1">
              <p
                className="
                text-sm font-medium text-amber-800
                dark:text-amber-200
              "
              >
                {t("tools.portDetective.adminWarning.title")}
              </p>
              <p
                className="
                text-sm text-amber-700
                dark:text-amber-300
              "
              >
                {t("tools.portDetective.adminWarning.description")}
              </p>
            </div>
          </div>
        )}

        <TabsContent
          value="single"
          className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
        >
          <Card className="shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("tools.portDetective.checkPort")}
              </CardTitle>
              <CardDescription>
                {t("tools.portDetective.checkPortDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={singlePort}
                  onChange={(e) => setSinglePort(e.target.value)}
                  placeholder={t("tools.portDetective.portPlaceholder")}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCheckSinglePort();
                    }
                  }}
                />
                <Button
                  onClick={handleCheckSinglePort}
                  disabled={isCheckingPort}
                >
                  <Search className="mr-2 size-4" />
                  {isCheckingPort
                    ? t("tools.portDetective.checking")
                    : t("tools.portDetective.check")}
                </Button>
                <Button variant="outline" onClick={clearSinglePort}>
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {error && (
                <div
                  className="
                  flex items-center gap-2 rounded-md bg-destructive/10 p-4
                  text-sm text-destructive
                "
                >
                  <AlertCircle className="size-4" />
                  {error}
                </div>
              )}

              {singlePortInfo && (
                <div className="space-y-2">
                  {singlePortInfo.inUse ? (
                    <div className="space-y-2 rounded-lg bg-muted p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {t("tools.portDetective.port")}{" "}
                            {singlePortInfo.port}
                          </span>
                          <span
                            className="
                            flex items-center gap-1 text-sm text-destructive
                          "
                          >
                            <XCircle className="size-4" />
                            {t("tools.portDetective.inUse")}
                          </span>
                        </div>
                        {singlePortInfo.pid && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleKillProcess(
                                singlePortInfo.pid!,
                                singlePortInfo.port,
                              )
                            }
                          >
                            <XCircle className="mr-2 size-4" />
                            {t("tools.portDetective.kill")}
                          </Button>
                        )}
                      </div>
                      {singlePortInfo.pid && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">
                            {t("tools.portDetective.pid")}:
                          </div>
                          <div className="font-mono">{singlePortInfo.pid}</div>
                          {singlePortInfo.processName && (
                            <>
                              <div className="text-muted-foreground">
                                {t("tools.portDetective.process")}:
                              </div>
                              <div className="font-mono">
                                {singlePortInfo.processName}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-green-500/10 p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {t("tools.portDetective.port")} {singlePortInfo.port}
                        </span>
                        <span
                          className="
                          flex items-center gap-1 text-sm text-green-600
                        "
                        >
                          <CheckCircle2 className="size-4" />
                          {t("tools.portDetective.available")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="scan"
          className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
        >
          <Card className="shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("tools.portDetective.scanPorts")}
              </CardTitle>
              <CardDescription>
                {t("tools.portDetective.scanPortsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <label className="text-sm text-muted-foreground">
                    {t("tools.portDetective.startPort")}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={65535}
                    value={scanStartPort}
                    onChange={(e) => setScanStartPort(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm text-muted-foreground">
                    {t("tools.portDetective.endPort")}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={65535}
                    value={scanEndPort}
                    onChange={(e) => setScanEndPort(e.target.value)}
                  />
                </div>
                <Button onClick={handleScanPorts} disabled={isScanning}>
                  <RefreshCw
                    className={`
                      mr-2 size-4
                      ${isScanning ? "animate-spin" : ""}
                    `}
                  />
                  {isScanning
                    ? t("tools.portDetective.scanning")
                    : t("tools.portDetective.scan")}
                </Button>
                <Button variant="outline" onClick={clearScan}>
                  <Trash2 className="size-4" />
                </Button>
              </div>

              {isScanning && (
                <div className="space-y-2">
                  <Progress value={scanProgress} />
                  <p className="text-center text-sm text-muted-foreground">
                    {t("tools.portDetective.scanningProgress")}{" "}
                    {scanProgress.toFixed(0)}%
                  </p>
                </div>
              )}

              {error && (
                <div
                  className="
                  flex items-center gap-2 rounded-md bg-destructive/10 p-4
                  text-sm text-destructive
                "
                >
                  <AlertCircle className="size-4" />
                  {error}
                </div>
              )}

              {scanResults.length > 0 && (
                <Card className="shrink-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {t("tools.portDetective.resultsTitle", {
                        count: scanResults.length,
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-2">
                      {scanResults.map((result) => (
                        <div
                          key={result.port}
                          className="space-y-2 rounded-lg bg-muted p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {t("tools.portDetective.port")} {result.port}
                              </span>
                              <span
                                className="
                                flex items-center gap-1 text-sm text-destructive
                              "
                              >
                                <XCircle className="size-4" />
                                {t("tools.portDetective.inUse")}
                              </span>
                            </div>
                            {result.pid && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleKillProcess(result.pid!, result.port)
                                }
                              >
                                <XCircle className="mr-2 size-4" />
                                {t("tools.portDetective.kill")}
                              </Button>
                            )}
                          </div>
                          {result.pid && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="text-muted-foreground">
                                {t("tools.portDetective.pid")}:
                              </div>
                              <div className="font-mono">{result.pid}</div>
                              {result.processName && (
                                <>
                                  <div className="text-muted-foreground">
                                    {t("tools.portDetective.process")}:
                                  </div>
                                  <div className="font-mono">
                                    {result.processName}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
