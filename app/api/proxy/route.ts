import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url, method, headers, body } = await request.json();

    if (!url) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    const startTime = Date.now();

    const response = await fetch(url, {
      method,
      headers,
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
