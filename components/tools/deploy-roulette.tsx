"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Rocket,
  Skull,
  Music,
  History,
  AlertTriangle,
  FolderOpen,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { useDeployStatsStore } from "@/lib/deploy-stats-store";
import { useTranslation } from "react-i18next";

interface DeployRouletteProps {
  tabId: string;
}

// I have no fucking idea why we have this
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DeployRoulette({ tabId: _tabId }: DeployRouletteProps) {
  const { t } = useTranslation();
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinProgress, setSpinProgress] = useState(0);
  const [lastResult, setLastResult] = useState<"deploy" | "rickroll" | null>(
    null,
  );
  const [rickrollDialogOpen, setRickrollDialogOpen] = useState(false);

  // Use persistent store
  const {
    history,
    stats,
    directory,
    deployCommand,
    addResult,
    setDirectory,
    setDeployCommand,
  } = useDeployStatsStore();

  // Store timer references for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleBrowseDirectory = async () => {
    // Check Tauri availability at runtime
    const tauriAvailable =
      typeof window !== "undefined" && "__TAURI__" in window;

    if (!tauriAvailable) {
      toast.error(t("tools.deployRoulette.toast.directoryRequired"));
      return;
    }

    try {
      const { open } = await import("@tauri-apps/plugin-dialog");

      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Directory",
      });

      if (selected && typeof selected === "string") {
        setDirectory(selected);
        toast.success(t("tools.deployRoulette.toast.directorySelected"), {
          description: selected,
        });
      } else if (selected === null) {
        toast.info(t("tools.deployRoulette.toast.selectionCancelled"));
      }
    } catch (error) {
      console.error("Failed to open directory picker:", error);
      toast.error(t("tools.deployRoulette.toast.failedToPick"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const runDeployCommand = async () => {
    const tauriAvailable =
      typeof window !== "undefined" && "__TAURI__" in window;

    if (!tauriAvailable) {
      toast.info(t("tools.deployRoulette.toast.deployCommand"), {
        description: t("tools.deployRoulette.toast.wouldRun", {
          command: deployCommand,
          directory,
        }),
      });
      return;
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<string>("run_deploy_command", {
        directory,
        command: deployCommand,
      });

      toast.success(t("tools.deployRoulette.toast.deployStarted"), {
        description: result,
      });
    } catch (error) {
      console.error("Deploy failed:", error);
      toast.error(t("tools.deployRoulette.toast.deployFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const spin = () => {
    // Clear any existing timers
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setIsSpinning(true);
    setSpinProgress(0);
    setLastResult(null);

    // Animate progress
    intervalRef.current = setInterval(() => {
      setSpinProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 100;
        }
        return Math.min(100, prev + Math.random() * 15);
      });
    }, 100);

    // Determine result after suspenseful delay
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setSpinProgress(100);

      // 60/40 odds: deploy vs rickroll
      const roll = Math.random();
      const result: "deploy" | "rickroll" = roll < 0.6 ? "deploy" : "rickroll";

      setLastResult(result);
      setIsSpinning(false);

      // Add result to persistent store
      addResult(result);

      if (result === "deploy") {
        toast.success(t("tools.deployRoulette.toast.survived"), {
          description: t("tools.deployRoulette.toast.running", {
            command: deployCommand,
            directory,
          }),
        });
        runDeployCommand();
      } else {
        toast.error(t("tools.deployRoulette.toast.rickrolled"), {
          description: t("tools.deployRoulette.toast.betterLuck"),
        });
        setRickrollDialogOpen(true);
      }

      timeoutRef.current = null;
    }, 2000);
  };

  const survivalRate =
    stats.deploys + stats.rickrolls > 0
      ? Math.round((stats.deploys / (stats.deploys + stats.rickrolls)) * 100)
      : 0;

  return (
    <div className="h-full space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div
          className="
          flex size-10 items-center justify-center rounded-lg bg-red-500/10
          text-red-500
        "
        >
          <Rocket className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">
            {t("tools.deployRoulette.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("tools.deployRoulette.subtitle")}
          </p>
        </div>
      </div>

      <div
        className="
        grid gap-6
        lg:grid-cols-3
      "
      >
        {/* Main Spinner */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div
              className="
              flex flex-col items-center justify-center space-y-8 py-12
            "
            >
              {/* Deploy Settings */}
              <div
                className="
                w-full max-w-md space-y-4 rounded-lg border bg-muted/30 p-4
              "
              >
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Terminal className="size-4" />
                  {t("tools.deployRoulette.config")}
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="directory" className="text-xs">
                    {t("tools.deployRoulette.workingDirectory")}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="directory"
                      value={directory}
                      onChange={(e) => setDirectory(e.target.value)}
                      placeholder={t(
                        "tools.deployRoulette.directoryPlaceholder",
                      )}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleBrowseDirectory}
                      title={t("tools.deployRoulette.browseDirectory")}
                    >
                      <FolderOpen className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="command" className="text-xs">
                    {t("tools.deployRoulette.deployCommand")}
                  </Label>
                  <Input
                    id="command"
                    value={deployCommand}
                    onChange={(e) => setDeployCommand(e.target.value)}
                    placeholder={t("tools.deployRoulette.commandPlaceholder")}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              {/* Big Red Button */}
              <div className="relative">
                <div
                  className={`
                    absolute inset-0 rounded-full
                    ${isSpinning ? `animate-ping` : ""}
                    bg-red-500/30
                  `}
                />
                <Button
                  onClick={spin}
                  disabled={isSpinning}
                  className={`
                    relative size-40 rounded-full text-xl font-bold shadow-2xl
                    transition-all duration-300
                    ${
                      isSpinning
                        ? "scale-95 bg-linear-to-br from-yellow-500 to-orange-600"
                        : `
                        bg-linear-to-br from-red-500 to-red-700
                        hover:scale-105 hover:shadow-red-500/50
                      `
                    }
                  `}
                >
                  {isSpinning ? (
                    <div className="flex flex-col items-center">
                      <Skull className="size-8 animate-bounce" />
                      <span className="mt-2 text-sm">
                        {t("tools.deployRoulette.spinning")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Rocket className="size-8" />
                      <span className="mt-2 text-sm">
                        {t("tools.deployRoulette.deploy")}
                      </span>
                    </div>
                  )}
                </Button>
              </div>

              {/* Progress Bar */}
              {isSpinning && (
                <div className="w-full max-w-xs space-y-2">
                  <Progress value={spinProgress} className="h-3" />
                  <p className="text-center text-sm text-muted-foreground">
                    {t("tools.deployRoulette.determiningFate")}
                  </p>
                </div>
              )}

              {/* Result Display */}
              {lastResult && !isSpinning && (
                <div
                  className={`
                    flex flex-col items-center rounded-xl border-2 p-6
                    ${lastResult === "deploy" ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"}
                  `}
                >
                  {lastResult === "deploy" ? (
                    <>
                      <Rocket className="mb-2 size-12 text-green-500" />
                      <span className="text-xl font-bold text-green-500">
                        {t("tools.deployRoulette.deploying")}
                      </span>
                      <code
                        className="
                        mt-2 font-mono text-sm text-muted-foreground
                      "
                      >
                        {deployCommand}
                      </code>
                    </>
                  ) : (
                    <>
                      <Music className="mb-2 size-12 text-red-500" />
                      <span className="text-xl font-bold text-red-500">
                        {t("tools.deployRoulette.rickrolled")}
                      </span>
                      <span className="mt-2 text-sm text-muted-foreground">
                        {t("tools.deployRoulette.rickrollMessage")}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Warning */}
              <div
                className="
                flex items-center gap-2 text-sm text-muted-foreground
              "
              >
                <AlertTriangle className="size-4" />
                <span>{t("tools.deployRoulette.warning")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats & History */}
        <div className="space-y-6">
          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("tools.deployRoulette.statistics")}
              </CardTitle>
              <CardDescription>
                {t("tools.deployRoulette.statisticsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold">{survivalRate}%</span>
                <p className="text-sm text-muted-foreground">
                  {t("tools.deployRoulette.survivalRate")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div
                  className="
                  rounded-lg border border-green-500/20 bg-green-500/10 p-3
                "
                >
                  <span className="text-2xl font-bold text-green-500">
                    {stats.deploys}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {t("tools.deployRoulette.deploys")}
                  </p>
                </div>
                <div
                  className="
                  rounded-lg border border-red-500/20 bg-red-500/10 p-3
                "
                >
                  <span className="text-2xl font-bold text-red-500">
                    {stats.rickrolls}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {t("tools.deployRoulette.rickrolls")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" />
                {t("tools.deployRoulette.history")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t("tools.deployRoulette.noHistory")}
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="
                        flex items-center justify-between rounded-lg bg-muted/50
                        p-2
                      "
                    >
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge
                        variant={item.survived ? "default" : "destructive"}
                      >
                        {item.result === "deploy"
                          ? t("tools.deployRoulette.deployed")
                          : t("tools.deployRoulette.rickrolledBadge")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rickroll Dialog */}
      <Dialog open={rickrollDialogOpen} onOpenChange={setRickrollDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="size-5 text-red-500" />
              {t("tools.deployRoulette.rickrollDialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("tools.deployRoulette.rickrollDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div
            className="
            aspect-video w-full overflow-hidden rounded-lg bg-black
          "
          >
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
              title="Rick Astley - Never Gonna Give You Up"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setRickrollDialogOpen(false)}
              variant="outline"
            >
              {t("tools.deployRoulette.rickrollDialog.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
