"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Clock3,
  Copy,
  Link2,
  Loader2,
  ShieldCheck,
  ShieldX,
  Waves,
  Trash2,
} from "lucide-react";
import { useCopyAnimation } from "@/hooks/use-copy-animation";
import { cn } from "@/lib/utils";
import { certCheck, type CertificatePayload, type WarningKey } from "@/lib/api";

interface SSLToothbrushProps {
  tabId: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function renderWarningBadge(key: WarningKey, text: string) {
  const variantClass =
    key === "expired"
      ? "bg-destructive/10 text-destructive border border-destructive/40"
      : key === "hostnameMismatch"
        ? "bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-100"
        : "bg-amber-50 text-amber-900 border border-amber-100 dark:bg-amber-950/50 dark:text-amber-100";

  return (
    <Badge
      key={key}
      variant="outline"
      className={cn("gap-1 rounded-full px-3 py-1.5 text-xs", variantClass)}
    >
      <AlertTriangle className="size-3" />
      {text}
    </Badge>
  );
}

export function SSLToothbrush({ tabId: _tabId }: SSLToothbrushProps) {
  const { t } = useTranslation();
  void _tabId;
  const [host, setHost] = useState("example.com");
  const [port, setPort] = useState("443");
  const [pem, setPem] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CertificatePayload | null>(null);
  const { copyWithAnimation } = useCopyAnimation();

  const warningMessages = useMemo(() => {
    if (!result) return [];
    return result.warnings.map((key) =>
      renderWarningBadge(
        key,
        t(`tools.sslToothbrush.warnings.${key}`, {
          host,
          days: result.daysRemaining ?? 0,
        }),
      ),
    );
  }, [host, result, t]);

  const statusSummary = useMemo(() => {
    if (!result) return null;
    return [
      {
        label: t("tools.sslToothbrush.status.hostname"),
        value:
          result.validForHost === null
            ? t("tools.sslToothbrush.status.unknown")
            : result.validForHost
              ? t("tools.sslToothbrush.status.valid")
              : t("tools.sslToothbrush.status.invalid"),
        icon:
          result.validForHost === false ? (
            <ShieldX className="size-4 text-destructive" />
          ) : (
            <ShieldCheck className="size-4 text-emerald-500" />
          ),
        tone:
          result.validForHost === false
            ? "border-destructive/40 bg-destructive/5"
            : "border-emerald-400/40 bg-emerald-500/5",
      },
      {
        label: t("tools.sslToothbrush.status.chain"),
        value:
          result.chainValid === null
            ? t("tools.sslToothbrush.status.skip")
            : result.chainValid
              ? t("tools.sslToothbrush.status.valid")
              : t("tools.sslToothbrush.status.invalid"),
        icon:
          result.chainValid === false ? (
            <ShieldX className="size-4 text-destructive" />
          ) : (
            <ShieldCheck className="size-4 text-emerald-500" />
          ),
        tone:
          result.chainValid === false
            ? "border-destructive/40 bg-destructive/5"
            : "border-emerald-400/40 bg-emerald-500/5",
      },
      {
        label: t("tools.sslToothbrush.status.expiry"),
        value: result.isExpired
          ? t("tools.sslToothbrush.status.expired")
          : result.daysRemaining !== null
            ? t("tools.sslToothbrush.status.daysLeft", {
                count: result.daysRemaining,
              })
            : "—",
        icon: <Clock3 className="size-4 text-blue-500" />,
        tone:
          result.isExpired || result.aboutToExpire
            ? "border-amber-300/60 bg-amber-500/5"
            : "border-border",
      },
    ];
  }, [result, t]);

  const doFetch = async () => {
    if (!host) {
      setError(t("tools.sslToothbrush.errors.hostRequired"));
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const data = await certCheck({
        host: host.trim(),
        port: parseInt(port, 10) || 443,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setResult(null);
    } finally {
      setChecking(false);
    }
  };

  const handleParsePem = async () => {
    if (!pem.trim()) {
      setError(t("tools.sslToothbrush.errors.pemRequired"));
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const data = await certCheck({
        host: host.trim() || undefined,
        certPem: pem,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setResult(null);
    } finally {
      setChecking(false);
    }
  };

  const expiryProgress = useMemo(() => {
    if (!result?.validFrom || !result.validTo) return 0;
    const start = new Date(result.validFrom).getTime();
    const end = new Date(result.validTo).getTime();
    const now = Date.now();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
    const percent = ((now - start) / (end - start)) * 100;
    return Math.max(0, Math.min(100, percent));
  }, [result]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
      <div
        className="
        flex flex-col gap-3
        lg:flex-row lg:items-start lg:justify-between
      "
      >
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">
            {t("tools.sslToothbrush.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("tools.sslToothbrush.subtitle")}
          </p>
        </div>
        {warningMessages.length > 0 && (
          <div
            className="
            flex w-full flex-wrap justify-start gap-2
            lg:w-auto lg:justify-end
          "
          >
            {warningMessages}
          </div>
        )}
      </div>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="mb-3">
          <TabsTrigger value="live">
            {t("tools.sslToothbrush.tabs.live")}
          </TabsTrigger>
          <TabsTrigger value="pem">
            {t("tools.sslToothbrush.tabs.pem")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Waves className="size-4" />
                {t("tools.sslToothbrush.live.title")}
              </CardTitle>
              <CardDescription>
                {t("tools.sslToothbrush.live.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="
                grid grid-cols-1 gap-3
                md:grid-cols-3
              "
              >
                <div className="md:col-span-2">
                  <label className="flex items-center gap-1 text-sm font-medium">
                    <Link2 className="size-4 text-muted-foreground" />
                    {t("tools.sslToothbrush.live.host")}
                  </label>
                  <Input
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="example.com"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-sm font-medium">
                    <ShieldCheck className="size-4 text-muted-foreground" />
                    {t("tools.sslToothbrush.live.port")}
                  </label>
                  <Input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="443"
                  />
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={doFetch} disabled={checking} className="gap-2">
                  {checking && <Loader2 className="size-4 animate-spin" />}
                  {t("tools.sslToothbrush.live.check")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pem" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                {t("tools.sslToothbrush.pem.title")}
              </CardTitle>
              <CardDescription>
                {t("tools.sslToothbrush.pem.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={pem}
                onChange={(e) => setPem(e.target.value)}
                className="min-h-44 font-mono text-xs"
                placeholder="-----BEGIN CERTIFICATE-----"
              />
              <div className="flex flex-wrap justify-between gap-3">
                <div
                  className="
                  flex items-center gap-2 text-xs text-muted-foreground
                "
                >
                  {t("tools.sslToothbrush.pem.optionalHost")}
                  <Input
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="h-8 w-40"
                    placeholder="domain.com"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPem("")}
                  >
                    <Trash2 className="mr-2 size-4" />
                    {t("common.clear")}
                  </Button>
                  <Button
                    onClick={handleParsePem}
                    disabled={checking}
                    size="sm"
                    className="gap-2"
                  >
                    {checking && <Loader2 className="size-4 animate-spin" />}
                    {t("tools.sslToothbrush.pem.parse")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <div
          className="
          rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm
          text-destructive
        "
        >
          {error}
        </div>
      )}

      <Card className="min-h-72 w-full shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            {t("tools.sslToothbrush.result.title")}
          </CardTitle>
          <CardDescription>
            {t("tools.sslToothbrush.result.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result && (
            <div className="text-sm text-muted-foreground">
              {t("tools.sslToothbrush.result.empty")}
            </div>
          )}

          {result && (
            <>
              <div
                className="
                grid grid-cols-1 gap-3
                md:grid-cols-3
              "
              >
                {statusSummary?.map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3",
                      item.tone,
                    )}
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="text-sm font-medium">{item.value}</p>
                    </div>
                    {item.icon}
                  </div>
                ))}
              </div>

              {warningMessages.length > 0 && (
                <div className="flex flex-wrap gap-2">{warningMessages}</div>
              )}

              <Separator />

              <div
                className="
                grid grid-cols-1 gap-4
                md:grid-cols-2
              "
              >
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">
                    {t("tools.sslToothbrush.result.identity")}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-muted-foreground">
                          {t("tools.sslToothbrush.result.subject")}
                        </p>
                        <p className="font-medium break-all">
                          {result.subject || "—"}
                        </p>
                      </div>
                      {result.subject && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyWithAnimation(result.subject!)}
                        >
                          <Copy className="size-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-muted-foreground">
                          {t("tools.sslToothbrush.result.issuer")}
                        </p>
                        <p className="font-medium break-all">
                          {result.issuer || "—"}
                        </p>
                      </div>
                      {result.issuer && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyWithAnimation(result.issuer!)}
                        >
                          <Copy className="size-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-muted-foreground">
                          {t("tools.sslToothbrush.result.serial")}
                        </p>
                        <p className="font-medium break-all">
                          {result.serialNumber || "—"}
                        </p>
                      </div>
                      {result.serialNumber && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            copyWithAnimation(result.serialNumber as string)
                          }
                        >
                          <Copy className="size-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-muted-foreground">
                          {t("tools.sslToothbrush.result.fingerprint")}
                        </p>
                        <p className="font-medium break-all">
                          {result.fingerprint256 || "—"}
                        </p>
                      </div>
                      {result.fingerprint256 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            copyWithAnimation(result.fingerprint256 as string)
                          }
                        >
                          <Copy className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <Clock3 className="size-4" />
                    {t("tools.sslToothbrush.result.validity")}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("tools.sslToothbrush.result.validFrom")}
                      </span>
                      <span className="font-medium">
                        {formatDate(result.validFrom)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("tools.sslToothbrush.result.validTo")}
                      </span>
                      <span className="font-medium">
                        {formatDate(result.validTo)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("tools.sslToothbrush.result.daysRemaining")}
                      </span>
                      <span className="font-medium">
                        {result.daysRemaining !== null
                          ? t("tools.sslToothbrush.status.daysLeft", {
                              count: result.daysRemaining,
                            })
                          : "—"}
                      </span>
                    </div>
                    <div
                      className="
                      relative h-2 overflow-hidden rounded-full bg-muted
                    "
                    >
                      <div
                        className="absolute top-0 left-0 h-full bg-primary"
                        style={{ width: `${expiryProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    {t("tools.sslToothbrush.result.san")}
                  </h4>
                  <div className="text-xs text-muted-foreground">
                    {result.san.length} SAN(s)
                  </div>
                </div>
                {result.san.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("tools.sslToothbrush.result.noSan")}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {result.san.map((entry) => (
                      <Badge
                        key={entry}
                        variant="secondary"
                        className="font-mono text-[11px]"
                      >
                        {entry}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {result.rawPem && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">
                      {t("tools.sslToothbrush.result.raw")}
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => copyWithAnimation(result.rawPem as string)}
                    >
                      <Copy className="size-4" />
                      {t("tools.sslToothbrush.result.copyPem")}
                    </Button>
                  </div>
                  <pre
                    className="
                    max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs
                  "
                  >
                    {result.rawPem}
                  </pre>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
