"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  History,
  Inbox,
  PlugZap,
  RadioTower,
  Send,
  Timer,
  Waves,
} from "lucide-react";

type Protocol = "tcp" | "udp";

interface SendResult {
  ok: boolean;
  mode: "tcp-send" | "udp-send";
  elapsedMs: number;
  bytesSent: number;
  bytesReceived: number;
  response: {
    text: string;
    hex: string;
    bytes: number;
  };
}

interface CaptureEntry {
  at: string;
  remoteAddress?: string | null;
  remotePort?: number | null;
  bytes: number;
  hex: string;
  text: string;
  elapsedMs?: number;
  note?: string;
}

interface ListenResult {
  ok: boolean;
  mode: "tcp-listen" | "udp-listen";
  durationMs: number;
  captures: CaptureEntry[];
}

interface HistoryEntry {
  id: string;
  type: "send" | "listen";
  protocol: Protocol;
  summary: string;
  at: string;
}

interface TcpUdpWhistleProps {
  tabId: string;
}

function formatDate(input: string) {
  return new Date(input).toLocaleTimeString();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TcpUdpWhistle({ tabId: _tabId }: TcpUdpWhistleProps) {
  const { t } = useTranslation();
  const [sendProtocol, setSendProtocol] = useState<Protocol>("tcp");
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("9000");
  const [payload, setPayload] = useState("ping");
  const [delayMs, setDelayMs] = useState("0");
  const [chunkSize, setChunkSize] = useState("0");
  const [timeoutMs, setTimeoutMs] = useState("4000");
  const [malformed, setMalformed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const [listenProtocol, setListenProtocol] = useState<Protocol>("udp");
  const [listenPort, setListenPort] = useState("9001");
  const [listenDuration, setListenDuration] = useState("5000");
  const [echoReply, setEchoReply] = useState(true);
  const [echoPayload, setEchoPayload] = useState("ack");
  const [respondDelay, setRespondDelay] = useState("150");
  const [listenResult, setListenResult] = useState<ListenResult | null>(null);
  const [isListening, setIsListening] = useState(false);

  const [sendError, setSendError] = useState<string | null>(null);
  const [listenError, setListenError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const protocolBadge = useMemo(
    () =>
      sendProtocol === "tcp" ? (
        <Badge variant="secondary" className="gap-1">
          <PlugZap className="size-3" />
          TCP
        </Badge>
      ) : (
        <Badge variant="secondary" className="gap-1">
          <Waves className="size-3" />
          UDP
        </Badge>
      ),
    [sendProtocol],
  );

  const handleSend = async () => {
    const portNumber = parseInt(port, 10);
    const delay = Math.max(parseInt(delayMs, 10) || 0, 0);
    const chunk = Math.max(parseInt(chunkSize, 10) || 0, 0);
    const timeout = Math.max(parseInt(timeoutMs, 10) || 0, 500);

    if (!host.trim()) {
      setSendError(t("tools.tcpWhistle.errors.hostRequired"));
      return;
    }
    if (Number.isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      setSendError(t("tools.tcpWhistle.errors.portInvalid"));
      return;
    }

    setSendError(null);
    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/whistle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: `${sendProtocol}-send`,
          host: host.trim(),
          port: portNumber,
          payload,
          delayMs: delay,
          chunkSize: chunk || undefined,
          timeoutMs: timeout,
          malformed,
        }),
      });

      const data = (await res.json()) as SendResult & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      setSendResult(data);
      setHistory((prev) =>
        [
          {
            id: crypto.randomUUID(),
            type: "send" as const,
            protocol: sendProtocol,
            summary: `${data.bytesSent}B → ${data.bytesReceived}B`,
            at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 8),
      );
    } catch (err) {
      setSendError(
        err instanceof Error
          ? err.message
          : t("tools.tcpWhistle.errors.requestFailed"),
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleListen = async () => {
    const portNumber = parseInt(listenPort, 10);
    const duration = Math.max(parseInt(listenDuration, 10) || 0, 1000);
    const replyDelay = Math.max(parseInt(respondDelay, 10) || 0, 0);

    if (Number.isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      setListenError(t("tools.tcpWhistle.errors.portInvalid"));
      return;
    }

    setListenError(null);
    setIsListening(true);
    setListenResult(null);

    try {
      const res = await fetch("/api/whistle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: `${listenProtocol}-listen`,
          port: portNumber,
          durationMs: duration,
          echo: echoReply,
          echoPayload,
          respondDelayMs: replyDelay,
          malformed,
          maxCapture: 12,
        }),
      });

      const data = (await res.json()) as ListenResult & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setListenResult(data);
      setHistory((prev) =>
        [
          {
            id: crypto.randomUUID(),
            type: "listen" as const,
            protocol: listenProtocol,
            summary: `${data.captures.length} capture${data.captures.length === 1 ? "" : "s"}`,
            at: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 8),
      );
    } catch (err) {
      setListenError(
        err instanceof Error
          ? err.message
          : t("tools.tcpWhistle.errors.requestFailed"),
      );
    } finally {
      setIsListening(false);
    }
  };

  const lastResponseHex =
    sendResult?.response?.hex?.slice(0, 120) ??
    t("tools.tcpWhistle.response.empty");

  return (
    <div className="h-full space-y-4 overflow-auto p-4">
      <div className="flex items-center gap-3">
        <div
          className="
          flex size-10 items-center justify-center rounded-lg bg-blue-500/10
          text-blue-500
        "
        >
          <RadioTower className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">
            {t("tools.tcpWhistle.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("tools.tcpWhistle.subtitle")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">
            {t("tools.tcpWhistle.tabs.send")}
          </TabsTrigger>
          <TabsTrigger value="listen">
            {t("tools.tcpWhistle.tabs.listen")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader
              className="
              flex flex-row items-center justify-between space-y-0
            "
            >
              <div>
                <CardTitle className="text-base">
                  {t("tools.tcpWhistle.send.title")}
                </CardTitle>
                <CardDescription>
                  {t("tools.tcpWhistle.send.description")}
                </CardDescription>
              </div>
              {protocolBadge}
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="
                grid gap-3
                md:grid-cols-4
              "
              >
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.inputs.host")}
                  </label>
                  <Input
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.inputs.port")}
                  </label>
                  <Input
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.inputs.protocol")}
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={sendProtocol === "tcp" ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setSendProtocol("tcp")}
                    >
                      TCP
                    </Button>
                    <Button
                      type="button"
                      variant={sendProtocol === "udp" ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setSendProtocol("udp")}
                    >
                      UDP
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.inputs.timeout")}
                  </label>
                  <Input
                    value={timeoutMs}
                    onChange={(e) => setTimeoutMs(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  {t("tools.tcpWhistle.inputs.payload")}
                </label>
                <Textarea
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  className="min-h-30"
                  placeholder="ping"
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    "ping",
                    "GET / HTTP/1.1\r\nHost: dev.local\r\n\r\n",
                    "\\x00\\xffjunk",
                  ].map((preset) => (
                    <Button
                      key={preset}
                      variant="outline"
                      size="sm"
                      onClick={() => setPayload(preset)}
                    >
                      {preset.length > 12 ? `${preset.slice(0, 12)}…` : preset}
                    </Button>
                  ))}
                </div>
              </div>

              <div
                className="
                grid gap-3
                md:grid-cols-3
              "
              >
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.inputs.delay")}
                  </label>
                  <Input
                    value={delayMs}
                    onChange={(e) => setDelayMs(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.inputs.chunk")}
                  </label>
                  <Input
                    value={chunkSize}
                    onChange={(e) => setChunkSize(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div
                  className="
                  flex items-center justify-between rounded-md border p-3
                "
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {t("tools.tcpWhistle.inputs.malformed")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("tools.tcpWhistle.inputs.malformedHint")}
                    </p>
                  </div>
                  <Switch
                    checked={malformed}
                    onCheckedChange={(checked) => setMalformed(checked)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleSend} disabled={isSending}>
                  <Send className="mr-2 size-4" />
                  {t("tools.tcpWhistle.send.button")}
                </Button>
                {sendError && (
                  <span className="text-sm text-destructive">{sendError}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              className="
              flex flex-row items-center justify-between space-y-0
            "
            >
              <div>
                <CardTitle className="text-base">
                  {t("tools.tcpWhistle.response.title")}
                </CardTitle>
                <CardDescription>
                  {t("tools.tcpWhistle.response.description")}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Timer className="size-3" />
                {sendResult ? `${sendResult.elapsedMs} ms` : "—"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="
                grid gap-3
                md:grid-cols-4
              "
              >
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.response.sent")}
                  </p>
                  <p className="text-xl font-semibold">
                    {sendResult?.bytesSent ?? 0}B
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.response.received")}
                  </p>
                  <p className="text-xl font-semibold">
                    {sendResult?.bytesReceived ?? 0}B
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.response.elapsed")}
                  </p>
                  <p className="text-xl font-semibold">
                    {sendResult ? `${sendResult.elapsedMs}ms` : "—"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.response.protocol")}
                  </p>
                  <p className="text-xl font-semibold">
                    {sendProtocol.toUpperCase()}
                  </p>
                </div>
              </div>

              <div
                className="
                grid gap-3
                md:grid-cols-2
              "
              >
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.response.text")}
                  </p>
                  <Textarea
                    value={sendResult?.response?.text ?? ""}
                    readOnly
                    className="min-h-35"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.response.hex")}
                  </p>
                  <div
                    className="
                    min-h-35 rounded-md border bg-muted/50 p-3 font-mono
                    text-xs break-all
                  "
                  >
                    {lastResponseHex}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listen" className="space-y-4">
          <Card>
            <CardHeader
              className="
              flex flex-row items-center justify-between space-y-0
            "
            >
              <div>
                <CardTitle className="text-base">
                  {t("tools.tcpWhistle.listen.title")}
                </CardTitle>
                <CardDescription>
                  {t("tools.tcpWhistle.listen.description")}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Activity className="size-3" />
                {listenProtocol.toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="
                grid gap-3
                md:grid-cols-3
              "
              >
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.inputs.port")}
                  </label>
                  <Input
                    value={listenPort}
                    onChange={(e) => setListenPort(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.inputs.duration")}
                  </label>
                  <Input
                    value={listenDuration}
                    onChange={(e) => setListenDuration(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.inputs.protocol")}
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={
                        listenProtocol === "tcp" ? "secondary" : "outline"
                      }
                      size="sm"
                      onClick={() => setListenProtocol("tcp")}
                    >
                      TCP
                    </Button>
                    <Button
                      type="button"
                      variant={
                        listenProtocol === "udp" ? "secondary" : "outline"
                      }
                      size="sm"
                      onClick={() => setListenProtocol("udp")}
                    >
                      UDP
                    </Button>
                  </div>
                </div>
              </div>

              <div
                className="
                grid gap-3
                md:grid-cols-3
              "
              >
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.listen.echo")}
                  </label>
                  <div
                    className="
                    flex items-center justify-between rounded-md border p-3
                  "
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {t("tools.tcpWhistle.listen.echoLabel")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("tools.tcpWhistle.listen.echoHint")}
                      </p>
                    </div>
                    <Switch
                      checked={echoReply}
                      onCheckedChange={(checked) => setEchoReply(checked)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.listen.echoPayload")}
                  </label>
                  <Input
                    value={echoPayload}
                    onChange={(e) => setEchoPayload(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    {t("tools.tcpWhistle.listen.echoDelay")}
                  </label>
                  <Input
                    value={respondDelay}
                    onChange={(e) => setRespondDelay(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleListen} disabled={isListening}>
                  <Inbox className="mr-2 size-4" />
                  {t("tools.tcpWhistle.listen.button")}
                </Button>
                {listenError && (
                  <span className="text-sm text-destructive">
                    {listenError}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              className="
              flex flex-row items-center justify-between space-y-0
            "
            >
              <div>
                <CardTitle className="text-base">
                  {t("tools.tcpWhistle.captures.title")}
                </CardTitle>
                <CardDescription>
                  {t("tools.tcpWhistle.captures.description")}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <History className="size-3" />
                {listenResult?.captures.length ?? 0}{" "}
                {t("tools.tcpWhistle.captures.count")}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {listenResult?.captures.length ? (
                <div className="space-y-2">
                  {listenResult.captures.map((capture, idx) => (
                    <div
                      key={`${capture.at}-${idx}`}
                      className="space-y-1 rounded-lg border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary">
                            {capture.remoteAddress ?? "—"}:
                            {capture.remotePort ?? "—"}
                          </Badge>
                          <Badge variant="outline">{capture.bytes}B</Badge>
                          {capture.elapsedMs && (
                            <Badge variant="outline">
                              {capture.elapsedMs}ms
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(capture.at)}
                        </span>
                      </div>
                      {capture.note && (
                        <p className="text-xs text-destructive">
                          {capture.note}
                        </p>
                      )}
                      <p
                        className="
                        rounded-sm bg-muted/50 p-2 font-mono text-sm break-all
                      "
                      >
                        {capture.text ||
                          t("tools.tcpWhistle.captures.emptyText")}
                      </p>
                      <p className="text-[11px] break-all text-muted-foreground">
                        {capture.hex}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="
                  rounded-md border border-dashed p-4 text-sm
                  text-muted-foreground
                "
                >
                  {t("tools.tcpWhistle.captures.empty")}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div
        className="
        grid gap-3
        md:grid-cols-2
      "
      >
        <div className="rounded-md border p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {t("tools.tcpWhistle.history")}
          </p>
          {history.length ? (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {item.protocol.toUpperCase()}
                    </Badge>
                    <span className="text-sm">{item.summary}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.at)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("tools.tcpWhistle.historyEmpty")}
            </p>
          )}
        </div>
        <div className="rounded-md border p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {t("tools.tcpWhistle.notes.title")}
          </p>
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            <li>{t("tools.tcpWhistle.notes.slowNetwork")}</li>
            <li>{t("tools.tcpWhistle.notes.malformed")}</li>
            <li>{t("tools.tcpWhistle.notes.localOnly")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
