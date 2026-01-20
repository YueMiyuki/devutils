/**
 * Unified API abstraction layer
 * Uses Tauri invoke for desktop app, fetch for web preview
 */

import { isTauri, invokeCommand } from "./tauri";

// ============================================================================
// Certificate Check API
// ============================================================================

export type WarningKey =
  | "expired"
  | "expiresSoon"
  | "hostnameMismatch"
  | "chainInvalid";

export interface CertificatePayload {
  source: "remote" | "pem";
  subject: string | null;
  subjectCN: string | null;
  issuer: string | null;
  issuerCN: string | null;
  san: string[];
  validFrom: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
  aboutToExpire: boolean;
  chainValid: boolean | null;
  authorizationError: string | null;
  validForHost: boolean | null;
  rawPem: string | null;
  serialNumber: string | null;
  fingerprint256: string | null;
  warnings: WarningKey[];
}

export interface CertCheckRequest {
  host?: string;
  port?: number;
  certPem?: string;
}

export async function certCheck(
  request: CertCheckRequest,
): Promise<CertificatePayload> {
  if (isTauri()) {
    return invokeCommand<CertificatePayload>("cert_check", {
      host: request.host,
      port: request.port,
      certPem: request.certPem,
    });
  }

  // Web fallback
  const response = await fetch("/api/cert-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Certificate check failed");
  }

  return response.json();
}

// ============================================================================
// HTTP Proxy API
// ============================================================================

export interface ProxyRequest {
  InputUrl: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  responseTime: number;
  data: string;
  contentType: string;
  error?: string;
}

export async function httpProxy(request: ProxyRequest): Promise<ProxyResponse> {
  if (isTauri()) {
    return invokeCommand<ProxyResponse>("http_proxy", {
      request,
    });
  }

  // Web fallback
  const response = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  return response.json();
}

// ============================================================================
// TCP/UDP Whistle API
// ============================================================================

type WhistleMode = "tcp-send" | "udp-send" | "tcp-listen" | "udp-listen";

export interface WhistleRequest {
  mode: WhistleMode;
  host?: string;
  port: number;
  payload?: string;
  timeoutMs?: number;
  delayMs?: number;
  chunkSize?: number;
  durationMs?: number;
  malformed?: boolean;
  echo?: boolean;
  echoPayload?: string;
  respondDelayMs?: number;
  maxCapture?: number;
}

export interface ResponsePreview {
  text: string;
  hex: string;
  bytes: number;
}

export interface WhistleSendResponse {
  ok: boolean;
  mode: "tcp-send" | "udp-send";
  elapsedMs: number;
  bytesSent: number;
  bytesReceived: number;
  response: ResponsePreview;
}

export interface CaptureEntry {
  at: string;
  remoteAddress?: string | null;
  remotePort?: number | null;
  bytes: number;
  hex: string;
  text: string;
  elapsedMs?: number;
  note?: string;
}

export interface WhistleListenResponse {
  ok: boolean;
  mode: "tcp-listen" | "udp-listen";
  durationMs: number;
  captures: CaptureEntry[];
}

export type WhistleResponse = WhistleSendResponse | WhistleListenResponse;

export async function whistle(
  request: WhistleRequest,
): Promise<WhistleResponse> {
  if (!isTauri()) {
    throw new Error("TCP/UDP Whistle is only available in the desktop app");
  }

  return invokeCommand<WhistleResponse>("whistle", {
    request,
  });
}
