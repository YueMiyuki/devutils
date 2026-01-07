import { NextRequest } from "next/server";

// Whitelist of safe headers that can be proxied
const ALLOWED_HEADERS = new Set([
  "content-type",
  "accept",
  "accept-language",
  "accept-encoding",
  "user-agent",
  "cache-control",
]);

// Dangerous headers that must be blocked
const BLOCKED_HEADERS = new Set([
  "authorization",
  "cookie",
  "host",
  "origin",
  "referer",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  "proxy-authorization",
]);

function sanitizeHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  if (!headers || typeof headers !== "object") {
    return {};
  }

  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const normalizedKey = key.toLowerCase();

    // Block dangerous headers
    if (BLOCKED_HEADERS.has(normalizedKey)) {
      continue;
    }

    // Only allow whitelisted headers
    if (!ALLOWED_HEADERS.has(normalizedKey)) {
      continue;
    }

    // Validate header value (no CRLF injection)
    if (typeof value === "string" && !/[\r\n]/.test(value)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export async function POST(request: NextRequest) {
  try {
    const { url, method, headers, body } = await request.json();

    if (!url) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    const startTime = Date.now();

    const sanitizedHeaders = sanitizeHeaders(headers);

    const response = await fetch(url, {
      method,
      headers: sanitizedHeaders,
      body: method !== "GET" && body ? body : undefined,
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const contentType = response.headers.get("content-type") || "";
    let responseData: string;

    if (contentType.includes("application/json")) {
      const json = await response.json();
      responseData = JSON.stringify(json, null, 2);
    } else {
      responseData = await response.text();
    }

    return Response.json({
      status: response.status,
      statusText: response.statusText,
      responseTime,
      data: responseData,
      contentType,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Request failed",
      },
      { status: 500 },
    );
  }
}
