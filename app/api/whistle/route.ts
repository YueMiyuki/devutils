import dgram from "node:dgram";
import net from "node:net";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

type Mode = "tcp-send" | "udp-send" | "tcp-listen" | "udp-listen";

interface WhistleRequest {
  mode: Mode;
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

const MAX_PAYLOAD_BYTES = 4096;
const MAX_RESPONSE_BYTES = 128 * 1024;
const MAX_DURATION_MS = 15000;
const MAX_DELAY_MS = 8000;

function toSafeDelay(value: unknown, fallback: number): number {
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) return fallback;
  return Math.min(num, MAX_DELAY_MS);
}

function toSafeDuration(value: unknown, fallback: number): number {
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return fallback;
  return Math.min(num, MAX_DURATION_MS);
}

function buildPayload(
  payload: string | undefined,
  malformed?: boolean,
): Buffer {
  const trimmed = payload ?? "";
  const baseBuffer = Buffer.from(trimmed).subarray(0, MAX_PAYLOAD_BYTES);
  if (!malformed) return baseBuffer;

  const noise = Buffer.from([0x00, 0xff, 0x13, 0x37]);
  return Buffer.concat([baseBuffer, noise]).subarray(0, MAX_PAYLOAD_BYTES);
}

function preview(buffer: Buffer) {
  return {
    text: buffer.toString("utf8"),
    hex: buffer.toString("hex"),
    bytes: buffer.length,
  };
}

function validatePort(port: number): string | null {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return "Invalid port";
  }
  return null;
}

function validateHost(host?: string): string | null {
  if (!host) return "Host is required";
  if (typeof host !== "string" || host.trim().length === 0) {
    return "Host is required";
  }
  if (host.length > 255) return "Host too long";
  return null;
}

function parseChunkSize(value: unknown): number | undefined {
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return undefined;
  return Math.floor(num);
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleTcpSend(req: WhistleRequest) {
  const payloadBuffer = buildPayload(req.payload, req.malformed);
  const delayMs = toSafeDelay(req.delayMs, 0);
  const timeoutMs = Math.max(Number(req.timeoutMs) || 5000, 500);
  const chunkSize = parseChunkSize(req.chunkSize);
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let collected = Buffer.alloc(0);
    let settled = false;

    const finalize = (error?: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) {
        reject(error);
        return;
      }

      const elapsedMs = Date.now() - start;
      const truncated = collected.subarray(0, MAX_RESPONSE_BYTES);
      resolve({
        ok: true,
        mode: "tcp-send" as const,
        elapsedMs,
        bytesSent: payloadBuffer.length,
        bytesReceived: truncated.length,
        response: preview(truncated),
      });
    };

    socket.setTimeout(timeoutMs, () => {
      finalize(new Error("Timed out while waiting for a response"));
    });
    socket.on("error", (err) => finalize(err));
    socket.on("data", (chunk: Buffer) => {
      if (settled) return;
      collected = Buffer.concat([collected, chunk]).subarray(
        0,
        MAX_RESPONSE_BYTES,
      );
    });
    socket.on("close", () => finalize());

    socket.connect(req.port, req.host ?? "", () => {
      (async () => {
        if (delayMs > 0) await wait(delayMs);

        if (chunkSize && chunkSize < payloadBuffer.length) {
          for (let i = 0; i < payloadBuffer.length; i += chunkSize) {
            socket.write(payloadBuffer.subarray(i, i + chunkSize));
            await wait(120);
          }
          socket.end();
        } else {
          socket.end(payloadBuffer);
        }
      })().catch((err) => finalize(err));
    });
  });
}

async function handleUdpSend(req: WhistleRequest) {
  const payloadBuffer = buildPayload(req.payload, req.malformed);
  const delayMs = toSafeDelay(req.delayMs, 0);
  const timeoutMs = Math.max(Number(req.timeoutMs) || 4000, 500);
  const start = Date.now();
  const family = net.isIP(req.host ?? "") === 6 ? "udp6" : "udp4";

  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket(family);
    let settled = false;
    let responseBuffer = Buffer.alloc(0);
    let timer: NodeJS.Timeout | null = null;

    const finalize = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      socket.close();
      if (error) {
        reject(error);
        return;
      }
      const elapsedMs = Date.now() - start;
      const truncated = responseBuffer.subarray(0, MAX_RESPONSE_BYTES);
      resolve({
        ok: true,
        mode: "udp-send" as const,
        elapsedMs,
        bytesSent: payloadBuffer.length,
        bytesReceived: truncated.length,
        response: preview(truncated),
      });
    };

    timer = setTimeout(
      () => finalize(new Error("UDP receive timeout")),
      timeoutMs,
    );

    socket.on("message", (msg) => {
      responseBuffer = Buffer.concat([responseBuffer, msg]).subarray(
        0,
        MAX_RESPONSE_BYTES,
      );
      finalize();
    });
    socket.on("error", (err) => finalize(err));

    (async () => {
      if (delayMs > 0) await wait(delayMs);
      socket.send(payloadBuffer, req.port, req.host ?? "", (err) => {
        if (err) finalize(err);
      });
    })().catch((err) => finalize(err));
  });
}

async function handleTcpListen(req: WhistleRequest) {
  const durationMs = toSafeDuration(req.durationMs, 5000);
  const respondDelayMs = toSafeDelay(req.respondDelayMs, 0);
  const maxCapture = Math.min(req.maxCapture ?? 10, 25);
  const echoPayload = buildPayload(req.echoPayload, req.malformed);
  const captures: CaptureEntry[] = [];
  const activeSockets = new Set<net.Socket>();

  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      activeSockets.add(socket);
      const started = Date.now();
      let collected = Buffer.alloc(0);

      const removeSocket = () => {
        activeSockets.delete(socket);
      };

      socket.on("close", removeSocket);

      socket.on("data", (chunk: Buffer) => {
        collected = Buffer.concat([collected, chunk]).subarray(
          0,
          MAX_RESPONSE_BYTES,
        );
      });

      socket.on("end", async () => {
        if (captures.length >= maxCapture) return;

        const truncated = collected.subarray(0, MAX_RESPONSE_BYTES);
        captures.push({
          at: new Date().toISOString(),
          remoteAddress: socket.remoteAddress,
          remotePort: socket.remotePort,
          bytes: truncated.length,
          hex: truncated.toString("hex"),
          text: truncated.toString("utf8"),
          elapsedMs: Date.now() - started,
        });

        if (req.echo) {
          try {
            await wait(respondDelayMs);
            socket.write(echoPayload);
          } catch {
            // socket may have been destroyed
          }
        }
        socket.end();
      });

      socket.on("error", (err) => {
        removeSocket();
        captures.push({
          at: new Date().toISOString(),
          remoteAddress: socket.remoteAddress,
          remotePort: socket.remotePort,
          bytes: 0,
          hex: "",
          text: "",
          note: `Socket error: ${err.message}`,
        });
      });
    });

    server.on("error", (err) => reject(err));

    server.listen(req.port, () => {
      setTimeout(() => {
        // Force-close all active sockets before closing the server
        for (const socket of activeSockets) {
          socket.destroy();
        }
        activeSockets.clear();

        server.close(() => {
          resolve({
            ok: true,
            mode: "tcp-listen" as const,
            durationMs,
            captures,
          });
        });
      }, durationMs);
    });
  });
}

async function handleUdpListen(req: WhistleRequest) {
  const durationMs = toSafeDuration(req.durationMs, 5000);
  const respondDelayMs = toSafeDelay(req.respondDelayMs, 0);
  const maxCapture = Math.min(req.maxCapture ?? 10, 25);
  const family = req.host && net.isIP(req.host) === 6 ? "udp6" : "udp4";
  const captures: CaptureEntry[] = [];
  const reply = buildPayload(req.echoPayload, req.malformed);

  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket(family);

    socket.on("message", async (msg, rinfo) => {
      if (captures.length < maxCapture) {
        const truncated = msg.subarray(0, MAX_RESPONSE_BYTES);
        captures.push({
          at: new Date().toISOString(),
          remoteAddress: rinfo.address,
          remotePort: rinfo.port,
          bytes: truncated.length,
          hex: truncated.toString("hex"),
          text: truncated.toString("utf8"),
        });
      }

      if (req.echo) {
        try {
          await wait(respondDelayMs);
          socket.send(reply, rinfo.port, rinfo.address);
        } catch {
          // socket may have been closed
        }
      }
    });

    socket.on("error", (err) => reject(err));

    socket.bind(req.port, req.host, () => {
      setTimeout(() => {
        socket.close();
        resolve({
          ok: true,
          mode: "udp-listen" as const,
          durationMs,
          captures,
        });
      }, durationMs);
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<WhistleRequest>;
    const mode = body.mode as Mode | undefined;
    const portError = validatePort(Number(body.port));
    const hostError =
      mode === "tcp-send" || mode === "udp-send"
        ? validateHost(body.host)
        : null;

    if (!mode) {
      return Response.json({ error: "Mode is required" }, { status: 400 });
    }
    if (portError) {
      return Response.json({ error: portError }, { status: 400 });
    }
    if (hostError) {
      return Response.json({ error: hostError }, { status: 400 });
    }

    const req: WhistleRequest = {
      mode,
      host: body.host?.trim(),
      port: Number(body.port),
      payload: body.payload ?? "",
      timeoutMs: body.timeoutMs,
      delayMs: body.delayMs,
      chunkSize: body.chunkSize,
      durationMs: body.durationMs,
      malformed: body.malformed ?? false,
      echo: body.echo ?? false,
      echoPayload: body.echoPayload ?? "ack",
      respondDelayMs: body.respondDelayMs,
      maxCapture: body.maxCapture,
    };

    if (req.mode === "tcp-send") {
      const result = await handleTcpSend(req);
      return Response.json(result);
    }
    if (req.mode === "udp-send") {
      const result = await handleUdpSend(req);
      return Response.json(result);
    }
    if (req.mode === "tcp-listen") {
      const result = await handleTcpListen(req);
      return Response.json(result);
    }
    if (req.mode === "udp-listen") {
      const result = await handleUdpListen(req);
      return Response.json(result);
    }

    return Response.json({ error: "Unsupported mode" }, { status: 400 });
  } catch (error) {
    console.error("[whistle] request failed", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Request failed",
      },
      { status: 500 },
    );
  }
}
