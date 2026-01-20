"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  ClipboardPaste,
  Trash2,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignJWT } from "jose";
import { useCopyAnimation } from "@/hooks/use-copy-animation";

interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

interface JwtDecoderProps {
  tabId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function JwtDecoder({ tabId: _tabId }: JwtDecoderProps) {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [decoded, setDecoded] = useState<DecodedJwt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const { copyWithAnimation, pasteWithAnimation, copyAnimationClass } =
    useCopyAnimation();

  // Custom token generator state
  const [customHeader, setCustomHeader] = useState(
    JSON.stringify({ alg: "HS256", typ: "JWT" }, null, 2),
  );
  const [customPayload, setCustomPayload] = useState(
    JSON.stringify(
      {
        sub: "1234567890",
        name: "John Doe",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      null,
      2,
    ),
  );
  const [customSecret, setCustomSecret] = useState("your-256-bit-secret");
  const [generatedToken, setGeneratedToken] = useState("");

  const base64UrlDecode = (str: string): string => {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);

    // atob() returns binary string, decode as UTF-8 for proper character handling
    const binaryString = atob(base64 + padding);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new TextDecoder().decode(bytes);
  };

  const decodeJwt = (jwt: string): DecodedJwt | null => {
    try {
      const parts = jwt.trim().split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const header = JSON.parse(base64UrlDecode(parts[0]));
      const payload = JSON.parse(base64UrlDecode(parts[1]));
      const signature = parts[2];

      return { header, payload, signature };
    } catch {
      return null;
    }
  };

  const handleTokenChange = (value: string) => {
    setToken(value);
    setError(null);

    if (!value.trim()) {
      setDecoded(null);
      setCountdown(null);
      return;
    }

    const result = decodeJwt(value);
    if (result) {
      setDecoded(result);
    } else {
      setError(t("tools.jwtDecoder.invalidToken"));
      setDecoded(null);
    }
  };

  const handlePaste = async () => {
    const text = await pasteWithAnimation();
    handleTokenChange(text);
  };

  const formatTimestamp = (ts: number): string => {
    return new Date(ts * 1000).toLocaleString();
  };

  const getTimeUntilExpiry = (
    exp: number,
  ): { text: string; expired: boolean } => {
    const now = Math.floor(Date.now() / 1000);
    const diff = exp - now;

    if (diff <= 0) {
      return { text: t("tools.jwtDecoder.expired"), expired: true };
    }

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (days > 0) {
      return { text: `${days}d ${hours}h ${minutes}m`, expired: false };
    } else if (hours > 0) {
      return { text: `${hours}h ${minutes}m ${seconds}s`, expired: false };
    } else if (minutes > 0) {
      return { text: `${minutes}m ${seconds}s`, expired: false };
    } else {
      return { text: `${seconds}s`, expired: false };
    }
  };

  // Update countdown every second
  useEffect(() => {
    const exp = decoded?.payload?.exp;
    // Validate that exp is a finite number before using it as a timestamp
    if (typeof exp !== "number" || !Number.isFinite(exp)) {
      setCountdown(null);
      setIsExpired(false);
      return;
    }

    const updateCountdown = () => {
      const { text, expired } = getTimeUntilExpiry(exp);
      setCountdown(text);
      setIsExpired(expired);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decoded]);

  const generateToken = async () => {
    try {
      const header = JSON.parse(customHeader);
      const payload = JSON.parse(customPayload);

      const secret = new TextEncoder().encode(customSecret);
      const alg = header.alg || "HS256";

      const jwt = new SignJWT(payload)
        .setProtectedHeader({ alg, typ: header.typ || "JWT" })
        .setIssuedAt();

      if (payload.exp) {
        jwt.setExpirationTime(payload.exp);
      }
      if (payload.iat) {
        jwt.setIssuedAt(payload.iat);
      }
      if (payload.nbf) {
        jwt.setNotBefore(payload.nbf);
      }
      if (payload.sub) {
        jwt.setSubject(payload.sub);
      }
      if (payload.aud) {
        jwt.setAudience(payload.aud);
      }
      if (payload.iss) {
        jwt.setIssuer(payload.iss);
      }
      if (payload.jti) {
        jwt.setJti(payload.jti);
      }

      const token = await jwt.sign(secret);
      setGeneratedToken(token);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid JSON in header or payload",
      );
    }
  };

  const renderValue = (key: string, value: unknown) => {
    if (key === "iat" || key === "exp" || key === "nbf") {
      // Validate that the value is a finite number before treating it as a timestamp
      if (typeof value === "number" && Number.isFinite(value)) {
        return (
          <div className="flex flex-col">
            <span className="font-mono">{value}</span>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(value)}
            </span>
          </div>
        );
      }
      // Fall through to default rendering if not a valid number
    }

    if (typeof value === "object") {
      return (
        <pre className="font-mono text-xs whitespace-pre-wrap">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return <span className="font-mono">{String(value)}</span>;
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Tabs defaultValue="decode" className="flex flex-1 flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="decode">
            {t("tools.jwtDecoder.decodeTab")}
          </TabsTrigger>
          <TabsTrigger value="generate">
            {t("tools.jwtDecoder.generateTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decode" className="mt-4 flex flex-1 flex-col gap-4">
          {/* Token Input */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {t("tools.jwtDecoder.tokenInput")}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePaste}
                    className={copyAnimationClass}
                  >
                    <ClipboardPaste className="mr-2 size-4" />
                    {t("tools.jwtDecoder.paste")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setToken("");
                      setDecoded(null);
                      setError(null);
                    }}
                  >
                    <Trash2 className="mr-2 size-4" />
                    {t("common.clear")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={token}
                onChange={(e) => handleTokenChange(e.target.value)}
                className="min-h-24 font-mono text-sm"
              />
              {error && (
                <p
                  className="
                  mt-2 flex items-center gap-1 text-sm text-destructive
                "
                >
                  <XCircle className="size-4" />
                  {error}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Decoded Output */}
          {decoded && (
            <div
              className="
              grid flex-1 grid-cols-1 gap-4
              lg:grid-cols-2
            "
            >
              {/* Header */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {t("tools.jwtDecoder.header")}
                    <Badge variant="secondary">
                      {decoded.header.alg as string}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-40">
                    <div className="space-y-2">
                      {Object.entries(decoded.header).map(([key, value]) => (
                        <div
                          key={key}
                          className="
                            flex items-start justify-between border-b
                            border-border py-1
                            last:border-0
                          "
                        >
                          <span className="text-sm text-muted-foreground">
                            {key}
                          </span>
                          {renderValue(key, value)}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Payload */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {t("tools.jwtDecoder.payload")}
                    </CardTitle>
                    {countdown && (
                      <Badge
                        variant={isExpired ? "destructive" : "default"}
                        className={cn(
                          "flex items-center gap-1",
                          !isExpired && "bg-success text-success-foreground",
                        )}
                      >
                        {isExpired ? (
                          <AlertTriangle className="size-3" />
                        ) : (
                          <Clock className="size-3" />
                        )}
                        {countdown}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-40">
                    <div className="space-y-2">
                      {Object.entries(decoded.payload).map(([key, value]) => (
                        <div
                          key={key}
                          className="
                            flex items-start justify-between border-b
                            border-border py-1
                            last:border-0
                          "
                        >
                          <span className="text-sm text-muted-foreground">
                            {key}
                          </span>
                          {renderValue(key, value)}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Signature */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t("tools.jwtDecoder.signature")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code
                      className="
                      flex-1 rounded-md bg-muted p-3 font-mono text-sm break-all
                    "
                    >
                      {decoded.signature}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyWithAnimation(decoded.signature)}
                      className={copyAnimationClass}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="generate"
          className="mt-4 flex flex-1 flex-col gap-4"
        >
          <div
            className="
            grid grid-cols-1 gap-4
            lg:grid-cols-2
          "
          >
            {/* Header Editor */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t("tools.jwtDecoder.header")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={customHeader}
                  onChange={(e) => setCustomHeader(e.target.value)}
                  className="min-h-32 font-mono text-sm"
                />
              </CardContent>
            </Card>

            {/* Payload Editor */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t("tools.jwtDecoder.payload")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={customPayload}
                  onChange={(e) => setCustomPayload(e.target.value)}
                  className="min-h-32 font-mono text-sm"
                />
              </CardContent>
            </Card>
          </div>

          {/* Secret & Generate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("tools.jwtDecoder.secretKey")}
              </CardTitle>
              <CardDescription>
                {t("tools.jwtDecoder.secretKeyDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={customSecret}
                onChange={(e) => setCustomSecret(e.target.value)}
                placeholder="your-256-bit-secret"
                className="font-mono"
              />
              <Button onClick={generateToken}>
                <RefreshCw className="mr-2 size-4" />
                {t("tools.jwtDecoder.generateToken")}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Token */}
          {generatedToken && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {t("tools.jwtDecoder.generatedToken")}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyWithAnimation(generatedToken)}
                    className={copyAnimationClass}
                  >
                    <Copy className="mr-2 size-4" />
                    {t("tools.jwtDecoder.copy")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <code
                  className="
                  block rounded-md bg-muted p-3 font-mono text-sm break-all
                "
                >
                  {generatedToken}
                </code>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
