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

interface DeployRouletteProps {
  tabId: string;
}

// I have no fucking idea why we have this
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DeployRoulette({ tabId: _tabId }: DeployRouletteProps) {
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
      toast.error("Directory picker requires Tauri desktop app");
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
        toast.success("Directory selected", { description: selected });
      } else if (selected === null) {
        toast.info("Selection cancelled");
      }
    } catch (error) {
      console.error("Failed to open directory picker:", error);
      toast.error("Failed to open directory picker", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const runDeployCommand = async () => {
    const tauriAvailable =
      typeof window !== "undefined" && "__TAURI__" in window;

    if (!tauriAvailable) {
      toast.info("Deploy command", {
        description: `Would run: ${deployCommand} in ${directory}`,
      });
      return;
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<string>("run_deploy_command", {
        directory,
        command: deployCommand,
      });

      toast.success("Deploy started!", {
        description: result,
      });
    } catch (error) {
      console.error("Deploy failed:", error);
      toast.error("Deploy failed", {
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
        toast.success("You survived! Deploying...", {
          description: `Running: ${deployCommand} in ${directory}`,
        });
        runDeployCommand();
      } else {
        toast.error("You've been Rickrolled!", {
          description: "Better luck next time...",
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
    <div className="h-full p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/10 text-red-500">
          <Rocket className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Deploy Roulette Spinner</h1>
          <p className="text-sm text-muted-foreground">
            60% chance to deploy, 40% chance to get Rickrolled
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Spinner */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 space-y-8">
              {/* Deploy Settings */}
              <div className="w-full max-w-md space-y-4 p-4 rounded-lg border bg-muted/30">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Deploy Configuration
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="directory" className="text-xs">
                    Working Directory
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="directory"
                      value={directory}
                      onChange={(e) => setDirectory(e.target.value)}
                      placeholder="/path/to/project"
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleBrowseDirectory}
                      title="Browse directory"
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="command" className="text-xs">
                    Deploy Command
                  </Label>
                  <Input
                    id="command"
                    value={deployCommand}
                    onChange={(e) => setDeployCommand(e.target.value)}
                    placeholder="npm run deploy"
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              {/* Big Red Button */}
              <div className="relative">
                <div
                  className={`absolute inset-0 rounded-full ${isSpinning ? "animate-ping" : ""} bg-red-500/30`}
                />
                <Button
                  onClick={spin}
                  disabled={isSpinning}
                  className={`relative w-40 h-40 rounded-full text-xl font-bold shadow-2xl transition-all duration-300 ${
                    isSpinning
                      ? "bg-linear-to-br from-yellow-500 to-orange-600 scale-95"
                      : "bg-linear-to-br from-red-500 to-red-700 hover:scale-105 hover:shadow-red-500/50"
                  }`}
                >
                  {isSpinning ? (
                    <div className="flex flex-col items-center">
                      <Skull className="w-8 h-8 animate-bounce" />
                      <span className="text-sm mt-2">SPINNING...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Rocket className="w-8 h-8" />
                      <span className="text-sm mt-2">DEPLOY?</span>
                    </div>
                  )}
                </Button>
              </div>

              {/* Progress Bar */}
              {isSpinning && (
                <div className="w-full max-w-xs space-y-2">
                  <Progress value={spinProgress} className="h-3" />
                  <p className="text-sm text-center text-muted-foreground">
                    Determining your fate...
                  </p>
                </div>
              )}

              {/* Result Display */}
              {lastResult && !isSpinning && (
                <div
                  className={`flex flex-col items-center p-6 rounded-xl border-2 ${
                    lastResult === "deploy"
                      ? "border-green-500 bg-green-500/10"
                      : "border-red-500 bg-red-500/10"
                  }`}
                >
                  {lastResult === "deploy" ? (
                    <>
                      <Rocket className="w-12 h-12 text-green-500 mb-2" />
                      <span className="text-xl font-bold text-green-500">
                        DEPLOYING!
                      </span>
                      <code className="mt-2 text-sm text-muted-foreground font-mono">
                        {deployCommand}
                      </code>
                    </>
                  ) : (
                    <>
                      <Music className="w-12 h-12 text-red-500 mb-2" />
                      <span className="text-xl font-bold text-red-500">
                        RICKROLLED!
                      </span>
                      <span className="mt-2 text-sm text-muted-foreground">
                        Never gonna give you up...
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Warning */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4" />
                <span>Use at your own risk. Results may vary.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats & History */}
        <div className="space-y-6">
          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statistics</CardTitle>
              <CardDescription>Your deployment survival rate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold">{survivalRate}%</span>
                <p className="text-sm text-muted-foreground">Survival Rate</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-2xl font-bold text-green-500">
                    {stats.deploys}
                  </span>
                  <p className="text-xs text-muted-foreground">Deploys</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <span className="text-2xl font-bold text-red-500">
                    {stats.rickrolls}
                  </span>
                  <p className="text-xs text-muted-foreground">Rickrolls</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No spins yet. Feeling lucky?
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge
                        variant={item.survived ? "default" : "destructive"}
                      >
                        {item.result === "deploy" ? "Deployed" : "Rickrolled"}
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
              <Music className="w-5 h-5 text-red-500" />
              You&apos;ve Been Rickrolled!
            </DialogTitle>
            <DialogDescription>
              Never gonna give you up, never gonna let you down...
            </DialogDescription>
          </DialogHeader>

          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
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
              Close (if you dare)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
