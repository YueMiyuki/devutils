"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Copy,
  ClipboardPaste,
  Trash2,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyAnimation } from "@/hooks/use-copy-animation";
import { useTranslation } from "react-i18next";
import { httpProxy } from "@/lib/api";

interface ParsedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface CurlConverterProps {
  tabId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CurlConverter({ tabId: _tabId }: CurlConverterProps) {
  const { t } = useTranslation();
  const [curlInput, setCurlInput] = useState("");
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<KeyValue[]>([
    {
      id: crypto.randomUUID(),
      key: "Content-Type",
      value: "application/json",
      enabled: true,
    },
  ]);
  const [body, setBody] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { copyWithAnimation, pasteWithAnimation, copyAnimationClass } =
    useCopyAnimation();

  const parseCurl = useCallback((curl: string): ParsedRequest | null => {
    try {
      const trimmed = curl.trim();
      if (!trimmed.toLowerCase().startsWith("curl")) return null;

      const result: ParsedRequest = {
        method: "GET",
        url: "",
        headers: {},
      };

      // Extract URL - prioritize actual URLs
      let url = "";

      // First, remove all -H headers to avoid confusion
      // Handle both single and double quoted headers
      let withoutHeaders = trimmed.replace(/-H\s+'[^']+'/gi, "");
      withoutHeaders = withoutHeaders.replace(/-H\s+"[^"]+"/gi, "");

      // Strategy 1: Find URLs with protocol in cleaned string
      const httpUrlMatch = withoutHeaders.match(
        /['"]?(https?:\/\/[^\s'"]+)['"]?/,
      );
      if (httpUrlMatch) {
        url = httpUrlMatch[1];
      }

      // Strategy 2: Last quoted non-header string in original (fallback)
      if (!url) {
        const allQuoted = [...trimmed.matchAll(/['"]([^'"]+)['"]/g)];
        for (let i = allQuoted.length - 1; i >= 0; i--) {
          const match = allQuoted[i][1];
          // Skip if it looks like a header - I hope this works
          if (!/^[^/]*:/.test(match)) {
            url = match;
            break;
          }
        }
      }

      // Strategy 3: Unquoted URL - last non-flag token in cleaned string
      if (!url) {
        const tokens = withoutHeaders
          .trim()
          .split(/\s+/)
          .filter((token) => token.length > 0);

        // Get last token that's not 'curl' and doesn't start with '-'
        for (let i = tokens.length - 1; i >= 0; i--) {
          const token = tokens[i];
          if (
            token.toLowerCase() !== "curl" &&
            !token.startsWith("-") &&
            token.length > 0
          ) {
            url = token;
            break;
          }
        }
      }

      result.url = url;

      // Extract method
      const methodMatch = trimmed.match(/-X\s+['"]?(\w+)['"]?/i);
      if (methodMatch) {
        result.method = methodMatch[1].toUpperCase();
      }

      // Extract headers
      // Match both single-quoted and double-quoted headers separately
      // to preserve quotes inside values
      const singleQuotedHeaders = [...trimmed.matchAll(/-H\s+'([^']+)'/gi)];
      const doubleQuotedHeaders = [...trimmed.matchAll(/-H\s+"([^"]+)"/gi)];

      // Process single-quoted headers
      for (const match of singleQuotedHeaders) {
        const [key, ...valueParts] = match[1].split(":");
        if (key && valueParts.length > 0) {
          result.headers[key.trim()] = valueParts.join(":").trim();
        }
      }

      // Process double-quoted headers
      for (const match of doubleQuotedHeaders) {
        const [key, ...valueParts] = match[1].split(":");
        if (key && valueParts.length > 0) {
          result.headers[key.trim()] = valueParts.join(":").trim();
        }
      }

      // Extract body/data
      // Try single-quoted data first, then double-quoted to handle embedded quotes
      let dataMatch = trimmed.match(/(?:-d|--data|--data-raw)\s+'([^']+)'/);
      if (!dataMatch) {
        dataMatch = trimmed.match(/(?:-d|--data|--data-raw)\s+"([^"]+)"/);
      }
      if (dataMatch) {
        result.body = dataMatch[1];
        if (result.method === "GET") {
          result.method = "POST";
        }
      }

      return result;
    } catch {
      return null;
    }
  }, []);

  const handlePasteFromClipboard = async () => {
    const text = await pasteWithAnimation();
    setCurlInput(text);
    const parsed = parseCurl(text);
    if (parsed) {
      setMethod(parsed.method);
      setUrl(parsed.url);
      setHeaders(
        Object.entries(parsed.headers).map(([key, value]) => ({
          id: crypto.randomUUID(),
          key,
          value,
          enabled: true,
        })),
      );
      setBody(parsed.body || "");
    }
  };

  const handleCurlChange = (value: string) => {
    setCurlInput(value);
    const parsed = parseCurl(value);
    if (parsed) {
      setMethod(parsed.method);
      setUrl(parsed.url);
      setHeaders(
        Object.entries(parsed.headers).map(([key, value]) => ({
          id: crypto.randomUUID(),
          key,
          value,
          enabled: true,
        })),
      );
      setBody(parsed.body || "");
    }
  };

  const addHeader = () => {
    setHeaders([
      ...headers,
      { id: crypto.randomUUID(), key: "", value: "", enabled: true },
    ]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setHeaders(newHeaders);
  };

  const toggleHeader = (index: number) => {
    const newHeaders = [...headers];
    newHeaders[index] = {
      ...newHeaders[index],
      enabled: !newHeaders[index].enabled,
    };
    setHeaders(newHeaders);
  };

  const executeRequest = async () => {
    if (!url) {
      setError(t("tools.curlConverter.errors.noUrl"));
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setResponseStatus(null);

    try {
      const headersObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.enabled && h.key) {
          headersObj[h.key] = h.value;
        }
      });

      // Use unified API (Tauri invoke or fetch proxy)
      const data = await httpProxy({
        InputUrl: url,
        method,
        headers: headersObj,
        body: method !== "GET" && body ? body : undefined,
      });

      if (data.error) {
        setError(data.error);
        return;
      }

      setResponseStatus(data.status);
      setResponseTime(data.responseTime);
      setResponse(data.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("tools.curlConverter.errors.requestFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Escape single quotes for shell safety
  const escapeShellArg = (str: string): string => {
    return str.replace(/'/g, "'\\''");
  };

  const copyAsCurl = () => {
    const headerFlags = headers
      .filter((h) => h.enabled && h.key)
      .map((h) => `-H '${escapeShellArg(h.key)}: ${escapeShellArg(h.value)}'`)
      .join(" ");

    const bodyFlag = body ? `-d '${escapeShellArg(body)}'` : "";
    const curlCommand =
      `curl -X ${method} ${headerFlags} ${bodyFlag} '${escapeShellArg(url)}'`.trim();

    copyWithAnimation(curlCommand);
  };

  const clearAll = () => {
    setCurlInput("");
    setMethod("GET");
    setUrl("");
    setHeaders([
      {
        id: crypto.randomUUID(),
        key: "Content-Type",
        value: "application/json",
        enabled: true,
      },
    ]);
    setBody("");
    setResponse(null);
    setResponseStatus(null);
    setResponseTime(null);
    setError(null);
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* cURL Input Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {t("tools.curlConverter.input")}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePasteFromClipboard}
                className={copyAnimationClass}
              >
                <ClipboardPaste className="mr-2 size-4" />
                {t("tools.curlConverter.pasteFromClipboard")}
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll}>
                <Trash2 className="mr-2 size-4" />
                {t("common.clear")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder={t("tools.curlConverter.inputPlaceholder")}
            value={curlInput}
            onChange={(e) => handleCurlChange(e.target.value)}
            className="min-h-24 font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Request Builder */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {t("tools.curlConverter.requestBuilder")}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyAsCurl}
                className={copyAnimationClass}
              >
                <Copy className="mr-2 size-4" />
                {t("tools.curlConverter.copyAsCurl")}
              </Button>
              <Button size="sm" onClick={executeRequest} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Play className="mr-2 size-4" />
                )}
                {t("tools.curlConverter.send")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Bar */}
          <div className="flex gap-2">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "GET",
                  "POST",
                  "PUT",
                  "PATCH",
                  "DELETE",
                  "HEAD",
                  "OPTIONS",
                ].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder={t("tools.curlConverter.urlPlaceholder")}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 font-mono text-sm"
            />
          </div>

          {/* Tabs for Headers/Body */}
          <Tabs defaultValue="headers" className="flex-1">
            <TabsList>
              <TabsTrigger value="headers">
                {t("tools.curlConverter.headers")}
                <Badge variant="secondary" className="ml-2">
                  {headers.filter((h) => h.enabled).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="body">
                {t("tools.curlConverter.body")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="headers" className="mt-2 space-y-2">
              {headers.map((header, index) => (
                <div key={header.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={() => toggleHeader(index)}
                    className="size-4"
                  />
                  <Input
                    placeholder={t("tools.curlConverter.headerNamePlaceholder")}
                    value={header.key}
                    onChange={(e) => updateHeader(index, "key", e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Input
                    placeholder={t("tools.curlConverter.valuePlaceholder")}
                    value={header.value}
                    onChange={(e) =>
                      updateHeader(index, "value", e.target.value)
                    }
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHeader(index)}
                    className="shrink-0"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addHeader}>
                <Plus className="mr-2 size-4" />
                {t("tools.curlConverter.addHeader")}
              </Button>
            </TabsContent>

            <TabsContent value="body" className="mt-2">
              <Textarea
                placeholder={t("tools.curlConverter.bodyPlaceholder")}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-32 font-mono text-sm"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Response Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              {t("tools.curlConverter.response")}
              {responseStatus !== null && (
                <>
                  <Badge
                    variant={
                      responseStatus >= 200 && responseStatus < 300
                        ? "default"
                        : "destructive"
                    }
                    className={cn(
                      responseStatus >= 200 && responseStatus < 300
                        ? "bg-success text-success-foreground"
                        : "",
                    )}
                  >
                    {responseStatus >= 200 && responseStatus < 300 ? (
                      <CheckCircle2 className="mr-1 size-3" />
                    ) : (
                      <XCircle className="mr-1 size-3" />
                    )}
                    {responseStatus}
                  </Badge>
                  {responseTime !== null && (
                    <span className="text-sm text-muted-foreground">
                      {responseTime}ms
                    </span>
                  )}
                </>
              )}
            </CardTitle>
            {response && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyWithAnimation(response)}
                className={copyAnimationClass}
              >
                <Copy className="mr-2 size-4" />
                {t("tools.curlConverter.copy")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48 rounded-md border">
            {error ? (
              <div className="p-4 font-mono text-sm text-destructive">
                {error}
              </div>
            ) : response ? (
              <pre className="p-4 font-mono text-sm whitespace-pre-wrap">
                {response}
              </pre>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                {t("tools.curlConverter.responsePlaceholder")}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
