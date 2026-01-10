"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Copy,
  Loader2,
  PlugZap,
  RefreshCw,
  Signal,
  Square,
  Waves,
} from "lucide-react";
import { useCopyAnimation } from "@/hooks/use-copy-animation";

type ReconnectStrategy = "off" | "instant" | "backoff";

type MessageDirection = "sent" | "received" | "info";

const MAX_MESSAGE_BYTES = 512 * 1024;
const MAX_RECONNECT_ATTEMPTS = 10;

interface MessageEntry {
  id: number;
  direction: MessageDirection;
  timestamp: number;
  text: string;
  hex?: string;
  isBinary?: boolean;
  size?: number;
}

interface WebSocketFishScalerProps {
  tabId: string;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(view)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

export function WebSocketFishScaler({
  tabId: _tabId,
}: WebSocketFishScalerProps) {
  const { t } = useTranslation();
  void _tabId;
  const [url, setUrl] = useState("wss://echo.websocket.org/");
  const [payload, setPayload] = useState("hello from devutils");
  const [sendFormat, setSendFormat] = useState<"text" | "json" | "hex">("text");
  const [autoReconnect, setAutoReconnect] =
    useState<ReconnectStrategy>("instant");
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [readyState, setReadyState] = useState<WebSocket["readyState"]>(3);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});
  const messageIdRef = useRef(0);
  const { copyWithAnimation } = useCopyAnimation();

  const validateWebSocketUrl = useCallback(
    (value: string): string | null => {
      if (!value.trim()) {
        return t("tools.websocketFish.errors.urlRequired");
      }

      try {
        const parsed = new URL(value);
        if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
          return t("tools.websocketFish.errors.invalidUrl");
        }
        return null;
      } catch {
        return t("tools.websocketFish.errors.invalidUrl");
      }
    },
    [t],
  );

  const statusBadge = useMemo(() => {
    const mapping: Record<number, { label: string; tone: string }> = {
      0: { label: t("tools.websocketFish.status.connecting"), tone: "info" },
      1: { label: t("tools.websocketFish.status.open"), tone: "success" },
      2: { label: t("tools.websocketFish.status.closing"), tone: "warn" },
      3: { label: t("tools.websocketFish.status.closed"), tone: "neutral" },
    };
    const { label, tone } = mapping[readyState] || mapping[3];
    const className =
      tone === "success"
        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/40"
        : tone === "warn"
          ? "bg-amber-500/10 text-amber-600 border-amber-500/40"
          : tone === "info"
            ? "bg-blue-500/10 text-blue-500 border-blue-500/40"
            : "bg-muted text-muted-foreground";
    return (
      <Badge
        variant="outline"
        className={`gap-1 px-2.5 py-1 text-xs rounded-full ${className}`}
      >
        <Signal className="w-3 h-3" />
        {label}
      </Badge>
    );
  }, [readyState, t]);

  const addMessage = useCallback((entry: Omit<MessageEntry, "id">) => {
    setMessages((prev) => {
      messageIdRef.current += 1;
      const next = [{ id: messageIdRef.current, ...entry }, ...prev];
      return next.slice(0, 200);
    });
  }, []);

  const clearSocketHandlers = (socket: WebSocket | null) => {
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
  };

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const scheduleReconnect = useCallback(() => {
    if (
      !shouldReconnectRef.current ||
      autoReconnect === "off" ||
      readyState === WebSocket.OPEN ||
      connecting
    ) {
      return;
    }

    if (retryCount >= MAX_RECONNECT_ATTEMPTS) {
      shouldReconnectRef.current = false;
      addMessage({
        direction: "info",
        text: t("tools.websocketFish.events.maxRetries", {
          count: MAX_RECONNECT_ATTEMPTS,
        }),
        timestamp: Date.now(),
      });
      return;
    }

    const delay =
      autoReconnect === "instant"
        ? 1000
        : Math.min(30000, 1000 * 2 ** retryCount);

    clearReconnectTimer();
    reconnectTimerRef.current = setTimeout(() => {
      setRetryCount((r) => r + 1);
      connectRef.current();
    }, delay);
  }, [addMessage, autoReconnect, connecting, readyState, retryCount, t]);

  const connect = useCallback(() => {
    const urlError = validateWebSocketUrl(url);
    if (urlError) {
      setError(urlError);
      return;
    }

    clearReconnectTimer();
    shouldReconnectRef.current = true;
    setError(null);
    setConnecting(true);

    try {
      if (wsRef.current) {
        clearSocketHandlers(wsRef.current);
        wsRef.current.close();
      }

      const socket = new WebSocket(url);
      wsRef.current = socket;
      socket.binaryType = "arraybuffer";
      setReadyState(socket.readyState);

      socket.onopen = () => {
        if (wsRef.current !== socket) return;
        setConnecting(false);
        setReadyState(socket.readyState);
        setRetryCount(0);
        addMessage({
          direction: "info",
          text: t("tools.websocketFish.events.connected", { url }),
          timestamp: Date.now(),
        });
      };

      socket.onmessage = async (event: MessageEvent) => {
        if (wsRef.current !== socket) return;
        const limitKb = Math.round(MAX_MESSAGE_BYTES / 1024);
        const handleOversized = (bytes: number) => {
          addMessage({
            direction: "info",
            text: t("tools.websocketFish.events.droppedLargeMessage", {
              size: bytes,
              limitKb,
            }),
            timestamp: Date.now(),
          });
        };

        let textPayload = "";
        let hexPayload: string | undefined;
        let size: number | undefined;
        let isBinary = false;

        if (typeof event.data === "string") {
          const bytes = new TextEncoder().encode(event.data);
          size = bytes.length;
          if (size > MAX_MESSAGE_BYTES) {
            handleOversized(size);
            return;
          }
          textPayload = event.data;
          hexPayload = bufferToHex(bytes);
        } else if (event.data instanceof ArrayBuffer) {
          size = event.data.byteLength;
          if (size > MAX_MESSAGE_BYTES) {
            handleOversized(size);
            return;
          }
          isBinary = true;
          hexPayload = bufferToHex(event.data);
          textPayload = new TextDecoder().decode(event.data);
        } else if (event.data instanceof Blob) {
          size = event.data.size;
          if (size > MAX_MESSAGE_BYTES) {
            handleOversized(size);
            return;
          }

          const arr = await event.data.arrayBuffer();
          if (wsRef.current !== socket) return;
          isBinary = true;
          size = arr.byteLength;
          if (size > MAX_MESSAGE_BYTES) {
            handleOversized(size);
            return;
          }
          hexPayload = bufferToHex(arr);
          textPayload = new TextDecoder().decode(arr);
        }

        addMessage({
          direction: "received",
          text: textPayload,
          hex: hexPayload,
          timestamp: Date.now(),
          size,
          isBinary,
        });
      };

      socket.onerror = () => {
        if (wsRef.current !== socket) return;
        setReadyState(socket.readyState);
        addMessage({
          direction: "info",
          text: t("tools.websocketFish.events.error"),
          timestamp: Date.now(),
        });
      };

      socket.onclose = (evt: CloseEvent) => {
        if (wsRef.current !== socket) return;
        wsRef.current = null;
        setReadyState(socket.readyState);
        setConnecting(false);
        addMessage({
          direction: "info",
          text: t("tools.websocketFish.events.closed", {
            code: evt.code,
            reason: evt.reason || "—",
          }),
          timestamp: Date.now(),
        });
        scheduleReconnect();
      };
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("tools.websocketFish.errors.failed"),
      );
      setConnecting(false);
      scheduleReconnect();
    }
  }, [addMessage, scheduleReconnect, t, url, validateWebSocketUrl]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = () => {
    shouldReconnectRef.current = false;
    clearReconnectTimer();
    setRetryCount(0);
    const socket = wsRef.current;
    if (!socket) return;
    setConnecting(false);
    setReadyState(WebSocket.CLOSING);
    socket.close();
  };

  useEffect(() => {
    return () => {
      clearReconnectTimer();
      if (wsRef.current) {
        clearSocketHandlers(wsRef.current);
        wsRef.current.close();
      }
    };
  }, []);

  const handleSend = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError(t("tools.websocketFish.errors.notConnected"));
      return;
    }

    let payloadToSend: string | ArrayBuffer = payload;
    try {
      if (sendFormat === "json") {
        payloadToSend = JSON.stringify(JSON.parse(payload));
      } else if (sendFormat === "hex") {
        const cleaned = payload.replace(/[^a-fA-F0-9]/g, "");
        if (cleaned.length === 0) {
          throw new Error(t("tools.websocketFish.errors.hexRequired"));
        }
        const bytes = new Uint8Array(
          cleaned.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [],
        );
        payloadToSend = bytes.buffer;
      }

      wsRef.current.send(payloadToSend);

      const payloadBytes =
        typeof payloadToSend === "string"
          ? new TextEncoder().encode(payloadToSend)
          : new Uint8Array(payloadToSend);

      const hex = bufferToHex(payloadBytes);

      addMessage({
        direction: "sent",
        text:
          typeof payloadToSend === "string"
            ? payloadToSend
            : `[${t("tools.websocketFish.labels.binary")}]`,
        hex,
        timestamp: Date.now(),
        isBinary: sendFormat === "hex",
        size: payloadBytes.byteLength,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  const strategyLabel = useMemo(
    () => ({
      off: t("tools.websocketFish.reconnect.off"),
      instant: t("tools.websocketFish.reconnect.instant"),
      backoff: t("tools.websocketFish.reconnect.backoff"),
    }),
    [t],
  );

  return (
    <div className="flex flex-col h-full min-h-0 p-4 gap-4 overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {t("tools.websocketFish.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("tools.websocketFish.subtitle")}
          </p>
        </div>
        {statusBadge}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <PlugZap className="w-4 h-4" />
              {t("tools.websocketFish.connection.title")}
            </CardTitle>
            <CardDescription>
              {t("tools.websocketFish.connection.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="text-sm font-medium">
              {t("tools.websocketFish.connection.endpoint")}
            </label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="wss://echo.websocket.org/"
            />

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Waves className="w-4 h-4" />
                {t("tools.websocketFish.reconnect.label")}
              </div>
              <Select
                value={autoReconnect}
                onValueChange={(value: ReconnectStrategy) =>
                  setAutoReconnect(value)
                }
              >
                <SelectTrigger size="sm" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">{strategyLabel.off}</SelectItem>
                  <SelectItem value="instant">
                    {strategyLabel.instant}
                  </SelectItem>
                  <SelectItem value="backoff">
                    {strategyLabel.backoff}
                  </SelectItem>
                </SelectContent>
              </Select>
              {retryCount > 0 && autoReconnect !== "off" && (
                <Badge variant="outline" className="text-xs">
                  {t("tools.websocketFish.reconnect.retries", {
                    count: retryCount,
                  })}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={connect}
                disabled={connecting || readyState === WebSocket.OPEN}
                className="gap-2"
              >
                {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("tools.websocketFish.actions.connect")}
              </Button>
              <Button
                variant="outline"
                onClick={disconnect}
                disabled={readyState !== WebSocket.OPEN}
                className="gap-2"
              >
                <Square className="w-4 h-4" />
                {t("tools.websocketFish.actions.disconnect")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {t("tools.websocketFish.payload.title")}
            </CardTitle>
            <CardDescription>
              {t("tools.websocketFish.payload.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="min-h-[120px] font-mono text-xs"
              placeholder={t("tools.websocketFish.payload.placeholder")}
            />
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <Select
                  value={sendFormat}
                  onValueChange={(value: "text" | "json" | "hex") =>
                    setSendFormat(value)
                  }
                >
                  <SelectTrigger size="sm" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">
                      {t("tools.websocketFish.payload.format.text")}
                    </SelectItem>
                    <SelectItem value="json">
                      {t("tools.websocketFish.payload.format.json")}
                    </SelectItem>
                    <SelectItem value="hex">
                      {t("tools.websocketFish.payload.format.hex")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPayload("")}
                  // disabled={readyState !== WebSocket.OPEN}
                >
                  {t("common.clear")}
                </Button>
                <Button
                  className="gap-2"
                  onClick={handleSend}
                  // disabled={readyState !== WebSocket.OPEN}
                >
                  <ArrowUp className="w-4 h-4" />
                  {t("tools.websocketFish.actions.send")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-destructive/40 bg-destructive/5 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="flex-1 min-h-[550px] w-full min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            {t("tools.websocketFish.log.title")}
          </CardTitle>
          <CardDescription>
            {t("tools.websocketFish.log.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-full flex flex-col gap-3 min-h-0 min-w-0 overflow-hidden">
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {t("tools.websocketFish.log.hint")}
            </div>
            <Button
              variant="outline"
              onClick={() => setMessages([])}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t("tools.websocketFish.actions.clear")}
            </Button>
          </div>
          <ScrollArea className="flex-1 w-full rounded-md border min-h-[250px] min-w-0 max-w-full overflow-hidden">
            <div className="divide-y">
              {messages.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">
                  {t("tools.websocketFish.log.empty")}
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 flex flex-col gap-2 bg-background"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="gap-1 px-2 py-1 text-[11px]"
                      >
                        {msg.direction === "sent" ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : msg.direction === "received" ? (
                          <ArrowDown className="w-3 h-3" />
                        ) : (
                          <Activity className="w-3 h-3" />
                        )}
                        {t(
                          `tools.websocketFish.labels.${msg.direction}` as const,
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.timestamp)}
                      </span>
                      {typeof msg.size === "number" && (
                        <span className="text-xs text-muted-foreground">
                          {msg.size}B
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {msg.hex && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyWithAnimation(msg.hex ?? "")}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    <pre className="bg-muted rounded-md p-2 text-xs overflow-auto min-h-[60px] font-mono break-all whitespace-pre-wrap">
                      {msg.text || "—"}
                    </pre>
                    <pre className="bg-muted rounded-md p-2 text-[11px] overflow-auto min-h-[60px] font-mono break-all whitespace-pre-wrap">
                      {msg.hex || t("tools.websocketFish.labels.noHex")}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
