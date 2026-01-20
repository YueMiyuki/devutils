"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { jwtVerify } from "jose";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  KeyRound,
  ListRestart,
  Play,
  ShieldAlert,
  Square,
  Timer,
} from "lucide-react";

interface JwtToothpickProps {
  tabId: string;
}

interface Attempt {
  secret: string;
  success: boolean;
  elapsedMs: number;
  id?: string;
}

interface AttemptProgress extends Attempt {
  attemptsMade: number;
}

const DEFAULT_WORDLIST = [
  "secret",
  "password",
  "123456",
  "admin",
  "dev",
  "localdev",
  "changeme",
  "jwtsecret",
  "token",
  "supersecret",
  "letmein",
  "qwerty",
  "passw0rd",
  "opensesame",
];

const MAX_SECRETS = 2000;

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeHeader(token: string) {
  try {
    const [header] = token.split(".");
    if (!header) return null;
    return JSON.parse(base64UrlDecode(header));
  } catch {
    return null;
  }
}

function parseWordlist(text: string): string[] {
  const unique = new Set<string>();
  text
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((entry) => unique.add(entry));
  return Array.from(unique).slice(0, MAX_SECRETS);
}

async function verifySecret(
  token: string,
  algorithm: string,
  candidate: string,
) {
  try {
    await jwtVerify(token, new TextEncoder().encode(candidate), {
      algorithms: [algorithm],
    });
    return true;
  } catch {
    return false;
  }
}

async function bruteForceToken({
  token,
  algorithm,
  secrets,
  shouldAbort,
  onProgress,
}: {
  token: string;
  algorithm: string;
  secrets: string[];
  shouldAbort: () => boolean;
  onProgress: (attempt: AttemptProgress) => void;
}) {
  const start = performance.now();
  let attemptsMade = 0;

  for (const secret of secrets) {
    if (shouldAbort()) break;
    attemptsMade += 1;

    const success = await verifySecret(token, algorithm, secret);
    const elapsedMs = performance.now() - start;
    onProgress({ secret, success, elapsedMs, attemptsMade });

    if (success) {
      return { found: secret, attemptsMade, elapsedMs };
    }

    if (attemptsMade % 10 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return {
    found: null,
    attemptsMade,
    elapsedMs: performance.now() - start,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function JwtToothpick({ tabId: _tabId }: JwtToothpickProps) {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [wordlist, setWordlist] = useState(DEFAULT_WORDLIST.join("\n"));
  const [status, setStatus] = useState<
    "idle" | "running" | "finished" | "stopped"
  >("idle");
  const [attempted, setAttempted] = useState(0);
  const [foundSecret, setFoundSecret] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attemptLog, setAttemptLog] = useState<Attempt[]>([]);
  const abortRef = useRef(false);
  const runIdRef = useRef(0);

  const header = useMemo(() => decodeHeader(token), [token]);
  const algorithm =
    typeof header?.alg === "string" ? header.alg.toUpperCase() : undefined;
  const supportedAlg =
    algorithm !== undefined && ["HS256", "HS384", "HS512"].includes(algorithm);

  const handleStart = async () => {
    if (!token.trim()) {
      setError(t("tools.jwtToothpick.errors.tokenRequired"));
      return;
    }
    if (!header) {
      setError(t("tools.jwtToothpick.errors.invalidToken"));
      return;
    }
    if (!header?.alg) {
      setError(t("tools.jwtToothpick.errors.invalidToken"));
      return;
    }
    if (!supportedAlg) {
      setError(
        t("tools.jwtToothpick.errors.unsupportedAlg", {
          alg: algorithm,
        }),
      );
      return;
    }

    const secrets = parseWordlist(wordlist);
    if (secrets.length === 0) {
      setError(t("tools.jwtToothpick.errors.noSecrets"));
      return;
    }

    // Increment run id to invalidate any previous run
    runIdRef.current += 1;
    const localRunId = runIdRef.current;

    setError(null);
    setStatus("running");
    setAttempted(0);
    setFoundSecret(null);
    setProgress(0);
    setSpeed(0);
    setElapsedMs(0);
    setAttemptLog([]);
    abortRef.current = false;

    const result = await bruteForceToken({
      token,
      algorithm,
      secrets,
      shouldAbort: () => abortRef.current || runIdRef.current !== localRunId,
      onProgress: (attempt) => {
        // Ignore updates from stale runs
        if (runIdRef.current !== localRunId) return;

        setAttempted(attempt.attemptsMade);
        setElapsedMs(attempt.elapsedMs);
        setAttemptLog((prev) =>
          [
            {
              secret: attempt.secret,
              success: attempt.success,
              elapsedMs: attempt.elapsedMs,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            },
            ...prev,
          ].slice(0, 6),
        );

        if (attempt.success) {
          setFoundSecret(attempt.secret);
          setStatus("finished");
          setProgress(100);
          setSpeed(
            Math.round(attempt.attemptsMade / (attempt.elapsedMs / 1000 || 1)),
          );
        } else if (attempt.attemptsMade % 10 === 0) {
          setProgress(
            Math.min((attempt.attemptsMade / secrets.length) * 100, 100),
          );
          setSpeed(
            Math.round(attempt.attemptsMade / (attempt.elapsedMs / 1000 || 1)),
          );
        }
      },
    });

    // Verify result is for current run before applying final state
    if (runIdRef.current !== localRunId) return;

    setElapsedMs(result.elapsedMs);
    setAttempted(result.attemptsMade);

    if (abortRef.current) {
      setStatus("stopped");
      setProgress(Math.min((result.attemptsMade / secrets.length) * 100, 100));
      return;
    }

    if (result.found) {
      // already handled via onProgress
      return;
    }

    setStatus("finished");
    setProgress(Math.min((result.attemptsMade / secrets.length) * 100, 100));
    setSpeed(Math.round(result.attemptsMade / (result.elapsedMs / 1000 || 1)));
  };

  const handleStop = () => {
    abortRef.current = true;
    setStatus("stopped");
  };

  const handleReset = () => {
    abortRef.current = false;
    setToken("");
    setAttempted(0);
    setFoundSecret(null);
    setStatus("idle");
    setProgress(0);
    setElapsedMs(0);
    setSpeed(0);
    setAttemptLog([]);
    setError(null);
  };

  const fillWeakList = () => setWordlist(DEFAULT_WORDLIST.join("\n"));

  return (
    <div className="h-full space-y-4 overflow-auto p-4">
      <div className="flex items-center gap-3">
        <div
          className="
          flex size-10 items-center justify-center rounded-lg bg-orange-500/10
          text-orange-500
        "
        >
          <KeyRound className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">
            {t("tools.jwtToothpick.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("tools.jwtToothpick.subtitle")}
          </p>
        </div>
      </div>

      <div
        className="
        grid gap-4
        lg:grid-cols-2
      "
      >
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">
              {t("tools.jwtToothpick.tokenInput")}
            </CardTitle>
            <CardDescription>
              {t("tools.jwtToothpick.tokenDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="min-h-35"
            />

            <div
              className="
              flex items-center gap-2 text-xs text-muted-foreground
            "
            >
              <ShieldAlert className="size-4 text-amber-500" />
              <span>{t("tools.jwtToothpick.warnings.educational")}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {t("tools.jwtToothpick.details.algorithm", {
                  alg: algorithm || "—",
                })}
              </Badge>
              {header?.kid && (
                <Badge variant="outline">kid: {String(header.kid)}</Badge>
              )}
              {header?.typ && (
                <Badge variant="outline">typ: {String(header.typ)}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader
            className="
            flex flex-row items-center justify-between space-y-0
          "
          >
            <div>
              <CardTitle className="text-base">
                {t("tools.jwtToothpick.wordlist.title")}
              </CardTitle>
              <CardDescription>
                {t("tools.jwtToothpick.wordlist.description")}
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={fillWeakList}>
              <ListRestart className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={wordlist}
              onChange={(e) => setWordlist(e.target.value)}
              className="min-h-40"
              placeholder="secret\nchangeme\nsupersecret"
            />
            <p className="text-[11px] text-muted-foreground">
              {t("tools.jwtToothpick.wordlist.hint", { max: MAX_SECRETS })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={handleStart}
                disabled={status === "running"}
              >
                <Play className="mr-2 size-4" />
                {t("tools.jwtToothpick.actions.start")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleStop}
                disabled={status !== "running"}
              >
                <Square className="mr-2 size-4" />
                {t("tools.jwtToothpick.actions.stop")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                disabled={status === "running"}
              >
                <ListRestart className="mr-2 size-4" />
                {t("tools.jwtToothpick.actions.reset")}
              </Button>
            </div>
            {error && (
              <div
                className="
                rounded-md border border-destructive/30 bg-destructive/5 p-3
                text-sm text-destructive
              "
              >
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          className="
          flex flex-row items-center justify-between space-y-0
        "
        >
          <div>
            <CardTitle className="text-base">
              {t("tools.jwtToothpick.progress.title")}
            </CardTitle>
            <CardDescription>
              {t("tools.jwtToothpick.progress.description")}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Timer className="size-3" />
            {status === "running"
              ? t("tools.jwtToothpick.status.running")
              : status === "finished"
                ? t("tools.jwtToothpick.status.finished")
                : status === "stopped"
                  ? t("tools.jwtToothpick.status.stopped")
                  : t("tools.jwtToothpick.status.idle")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progress} />
          <div
            className="
            grid gap-3
            md:grid-cols-4
          "
          >
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                {t("tools.jwtToothpick.progress.attempts")}
              </p>
              <p className="text-xl font-semibold">
                {attempted.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                {t("tools.jwtToothpick.progress.speed")}
              </p>
              <p className="text-xl font-semibold">
                {speed.toLocaleString()} /s
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                {t("tools.jwtToothpick.progress.elapsed")}
              </p>
              <p className="text-xl font-semibold">
                {(elapsedMs / 1000).toFixed(2)}s
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                {t("tools.jwtToothpick.progress.algorithm")}
              </p>
              <p className="text-xl font-semibold">{algorithm}</p>
            </div>
          </div>

          <div className="rounded-md border bg-muted/50 p-3">
            {foundSecret ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-600">
                  {t("tools.jwtToothpick.found")}
                </p>
                <code
                  className="
                  block rounded-sm bg-background px-2 py-1 text-sm break-all
                "
                >
                  {foundSecret}
                </code>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {status === "stopped"
                  ? t("tools.jwtToothpick.notFoundStopped")
                  : t("tools.jwtToothpick.notFoundYet")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("tools.jwtToothpick.progress.recent")}
            </p>
            <div
              className="
              grid gap-2
              md:grid-cols-2
            "
            >
              {attemptLog.map((attempt) => (
                <div
                  key={attempt.id!}
                  className="
                    flex items-center justify-between rounded-md border p-3
                  "
                >
                  <div>
                    <p className="max-w-50 truncate font-medium">
                      {attempt.secret}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(attempt.elapsedMs / 1000).toFixed(2)}s
                    </p>
                  </div>
                  <Badge
                    variant={attempt.success ? "secondary" : "outline"}
                    className={
                      attempt.success
                        ? "bg-emerald-500/10 text-emerald-600"
                        : ""
                    }
                  >
                    {attempt.success
                      ? t("tools.jwtToothpick.labels.hit")
                      : t("tools.jwtToothpick.labels.miss")}
                  </Badge>
                </div>
              ))}
              {attemptLog.length === 0 && (
                <div
                  className="
                  rounded-md border border-dashed p-3 text-sm
                  text-muted-foreground
                "
                >
                  {t("tools.jwtToothpick.progress.empty")}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
