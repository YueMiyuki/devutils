import { NextRequest } from "next/server";
import normalizeUrl from "normalize-url";

function sanitizeHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  if (!headers || typeof headers !== "object") {
    return {};
  }

  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    // Validate header value (no CRLF injection)
    if (typeof value === "string" && !/[\r\n]/.test(value)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export async function POST(request: NextRequest) {
  try {
    const { InputUrl, method, headers, body } = await request.json();

    if (!InputUrl) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    let url: string;
    try {
      url = normalizeUrl(InputUrl);
    } catch {
      return Response.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const startTime = Date.now();

    const sanitizedHeaders = sanitizeHeaders(headers);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    const response = await fetch(url, {
      method,
      headers: sanitizedHeaders,
      body: method !== "GET" && body ? body : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
