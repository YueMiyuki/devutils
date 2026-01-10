import dns from "node:dns/promises";
import net from "node:net";
import { NextRequest } from "next/server";
import tls from "tls";
import { X509Certificate } from "crypto";

export const runtime = "nodejs";

type WarningKey =
  | "expired"
  | "expiresSoon"
  | "hostnameMismatch"
  | "chainInvalid";

interface CertificatePayload {
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

function parseAltNames(altNames?: string | null): string[] {
  if (!altNames) return [];

  return altNames
    .split(/,\s*/)
    .map((entry) => entry.replace(/^(DNS:|IP Address:)/i, "").trim())
    .filter(Boolean);
}

function extractCnFromString(subject?: string | null): string | null {
  if (!subject) return null;
  const match = subject.match(/CN=([^,]+)/);
  return match ? match[1].trim() : null;
}

function subjectToString(subject: unknown): {
  value: string | null;
  cn: string | null;
} {
  if (!subject) return { value: null, cn: null };

  if (typeof subject === "string") {
    return { value: subject, cn: extractCnFromString(subject) };
  }

  if (typeof subject === "object") {
    const entries = Object.entries(subject as Record<string, string>);
    const cnEntry =
      (subject as Record<string, string>).CN ||
      (subject as Record<string, string>).commonName ||
      null;
    if (entries.length === 0) return { value: null, cn: cnEntry ?? null };
    return {
      value: entries.map(([k, v]) => `${k}=${v}`).join(", "),
      cn: cnEntry ?? null,
    };
  }

  return { value: null, cn: null };
}

function bufferToPem(raw?: Buffer): string | null {
  if (!raw) return null;
  const base64 = raw.toString("base64");
  const lines = base64.match(/.{1,64}/g)?.join("\n") ?? base64;
  return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----`;
}

function hostMatches(host: string, candidates: string[]): boolean {
  if (!host || candidates.length === 0) return false;
  const normalizedHost = host.toLowerCase();

  return candidates.some((entry) => {
    const candidate = entry.trim().toLowerCase();
    if (!candidate) return false;

    if (candidate.startsWith("*.")) {
      const domain = candidate.slice(2);
      if (!domain) return false;
      if (!normalizedHost.endsWith(`.${domain}`)) return false;

      const hostParts = normalizedHost.split(".");
      const domainParts = domain.split(".");
      if (hostParts.length !== domainParts.length + 1) return false;
      
      return hostParts.slice(1).join(".") === domain;
    }

    return normalizedHost === candidate;
  });
}

function calculateDaysRemaining(target?: string | Date | null): number | null {
  if (!target) return null;
  const targetDate =
    typeof target === "string" ? new Date(target) : new Date(target);
  if (Number.isNaN(targetDate.getTime())) return null;
  const diffMs = targetDate.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function collectWarnings(params: {
  isExpired: boolean;
  aboutToExpire: boolean;
  validForHost: boolean | null;
  chainValid: boolean | null;
}): WarningKey[] {
  const warnings: WarningKey[] = [];
  if (params.isExpired) warnings.push("expired");
  if (!params.isExpired && params.aboutToExpire) warnings.push("expiresSoon");
  if (params.validForHost === false) warnings.push("hostnameMismatch");
  if (params.chainValid === false) warnings.push("chainInvalid");
  return warnings;
}

const HOSTNAME_REGEX =
  /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z0-9-]{2,63}$/;
const BLOCKED_TLDS = new Set([
  "local",
  "localhost",
  "localdomain",
  "internal",
  "home",
  "lan",
]);
const BLOCKED_HOSTS = new Set(["localhost"]);
const ALLOWED_PORTS = new Set([443, 8443]);

function isPrivateIPv4(ip: string): boolean {
  const octets = ip.split(".").map(Number);
  if (
    octets.length !== 4 ||
    octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)
  ) {
    return true;
  }

  const [a, b] = octets;
  if (a === 10 || a === 127 || a === 0 || a === 255) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && (b === 168 || b === 0)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:1" ||
    normalized === "::"
  ) {
    return true;
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;

  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.replace(/^::ffff:/, "");
    if (net.isIP(mapped) === 4) {
      return isPrivateIPv4(mapped);
    }
  }

  return false;
}

function isPrivateAddress(address: string): boolean {
  const ipType = net.isIP(address);
  if (ipType === 4) return isPrivateIPv4(address);
  if (ipType === 6) return isPrivateIPv6(address);
  return false;
}

async function validateHost(host: string): Promise<string | null> {
  const trimmed = host.trim();
  const normalized =
    trimmed.startsWith("[") && trimmed.endsWith("]")
      ? trimmed.slice(1, -1)
      : trimmed;

  if (!normalized) return "Host is required";

  if (BLOCKED_HOSTS.has(normalized.toLowerCase())) {
    return "Local addresses are not allowed";
  }

  if (net.isIP(normalized)) {
    if (isPrivateAddress(normalized)) {
      return "Private or loopback addresses are not allowed";
    }
    return null;
  }

  if (!HOSTNAME_REGEX.test(normalized)) {
    return "Invalid host format";
  }

  const tld = normalized.split(".").pop()?.toLowerCase();
  if (tld && BLOCKED_TLDS.has(tld)) {
    return "Local network hostnames are not allowed";
  }

  try {
    const results = await dns.lookup(normalized, { all: true });
    if (
      results.length === 0 ||
      results.some((entry) => isPrivateAddress(entry.address))
    ) {
      return "Host resolves to a private or local address";
    }
  } catch {
    return "Unable to resolve host";
  }

  return null;
}

async function fetchRemoteCertificate(
  host: string,
  port: number,
): Promise<CertificatePayload> {
  return new Promise<CertificatePayload>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      socket.removeAllListeners("error");
      socket.removeAllListeners("timeout");
      socket.removeAllListeners("close");
      socket.destroy();
    };

    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: false,
    });

    socket.once("secureConnect", () => {
      const peer = socket.getPeerCertificate(true);
      if (!peer || Object.keys(peer).length === 0) {
        settled = true;
        cleanup();
        reject(new Error("No certificate presented by remote host"));
        return;
      }

      const { value: subject, cn: subjectCN } = subjectToString(peer.subject);
      const { value: issuer, cn: issuerCN } = subjectToString(peer.issuer);

      const san = parseAltNames(
        (peer as tls.PeerCertificate & { subjectaltname?: string })
          .subjectaltname,
      );

      const validFrom = peer.valid_from
        ? new Date(peer.valid_from).toISOString()
        : null;
      const validTo = peer.valid_to
        ? new Date(peer.valid_to).toISOString()
        : null;
      const daysRemaining = calculateDaysRemaining(validTo);
      const isExpired =
        validTo !== null && new Date(validTo).getTime() < Date.now();
      const aboutToExpire =
        !isExpired && daysRemaining !== null ? daysRemaining <= 14 : false;

      const validForHost = hostMatches(
        host,
        san.length > 0
          ? san
          : subjectCN
            ? [subjectCN]
            : subject
              ? [subject]
              : [],
      );

      const chainValid = socket.authorized;
      const warnings = collectWarnings({
        isExpired,
        aboutToExpire,
        validForHost,
        chainValid,
      });

      const payload: CertificatePayload = {
        source: "remote",
        subject,
        subjectCN,
        issuer,
        issuerCN,
        san,
        validFrom,
        validTo,
        daysRemaining,
        isExpired,
        aboutToExpire,
        chainValid,
        authorizationError: socket.authorizationError
          ? String(socket.authorizationError)
          : null,
        validForHost,
        rawPem: bufferToPem(
          (peer as tls.PeerCertificate & { raw?: Buffer }).raw,
        ),
        serialNumber: peer.serialNumber ?? null,
        fingerprint256:
          (peer as tls.PeerCertificate & { fingerprint256?: string })
            .fingerprint256 ?? null,
        warnings,
      };

      settled = true;
      cleanup();
      resolve(payload);
    });

    socket.setTimeout(8000);

    socket.on("error", (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    });

    socket.on("timeout", () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Connection to remote host timed out"));
    });
  });
}

function parseProvidedCertificate(
  certPem: string,
  host?: string,
): CertificatePayload {
  const x509 = new X509Certificate(certPem);
  const san = parseAltNames(x509.subjectAltName);

  const subject = x509.subject || null;
  const issuer = x509.issuer || null;
  const subjectCN = extractCnFromString(subject);
  const issuerCN = extractCnFromString(issuer);

  const validFrom = x509.validFrom
    ? new Date(x509.validFrom).toISOString()
    : null;
  const validTo = x509.validTo ? new Date(x509.validTo).toISOString() : null;
  const daysRemaining = calculateDaysRemaining(validTo);
  const isExpired =
    validTo !== null && new Date(validTo).getTime() < Date.now();
  const aboutToExpire =
    !isExpired && daysRemaining !== null ? daysRemaining <= 14 : false;

  const validForHost =
    host && host.length > 0
      ? hostMatches(
          host,
          san.length > 0
            ? san
            : subjectCN
              ? [subjectCN]
              : subject
                ? [subject]
                : [],
        )
      : null;

  const warnings = collectWarnings({
    isExpired,
    aboutToExpire,
    validForHost,
    chainValid: null,
  });

  return {
    source: "pem",
    subject,
    subjectCN,
    issuer,
    issuerCN,
    san,
    validFrom,
    validTo,
    daysRemaining,
    isExpired,
    aboutToExpire,
    chainValid: null,
    authorizationError: null,
    validForHost,
    rawPem: bufferToPem(x509.raw),
    serialNumber: x509.serialNumber || null,
    fingerprint256: x509.fingerprint256 || null,
    warnings,
  };
}

export async function POST(request: NextRequest) {
  try {
    // const body = await request.json();
    interface CertCheckRequestBody {
      host?: string;
      port?: number | string;
      certPem?: string;
    }
    let body: CertCheckRequestBody;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Debugging: Log input values
    // console.log("Incoming body.host:", body.host);

    const rawHost =
      typeof body.host === "string"
        ? body.host.trim()
        : String(body.host ?? "").trim();
    // console.log("Trimmed rawHost:", rawHost);
    const host =
      rawHost.length > 0 && rawHost.startsWith("[") && rawHost.endsWith("]")
        ? rawHost.slice(1, -1)
        : rawHost.length > 0
          ? rawHost
          : undefined;
    // console.log("Final host for validation/use:", host);
    const requestedPort = Number(body.port);
    const port: number = Number.isInteger(requestedPort) ? requestedPort : 443;
    // const certPem: string | undefined = body.certPem;
    const certPem: string | undefined =
      typeof body.certPem === "string" ? body.certPem : undefined;

    if (certPem && certPem.length > 200_000) {
      return Response.json({ error: "certPem is too large" }, { status: 413 });
    }

    if (!host && !certPem) {
      return Response.json(
        { error: "Either host or certPem is required" },
        { status: 400 },
      );
    }

    if (host) {
      const hostError = await validateHost(host);
      if (hostError) {
        return Response.json({ error: hostError }, { status: 400 });
      }
    }

    if (host && !ALLOWED_PORTS.has(port)) {
      return Response.json(
        { error: "Only ports 443 and 8443 are allowed" },
        { status: 400 },
      );
    }

    if (certPem) {
      try {
        const result = parseProvidedCertificate(certPem, host);
        return Response.json(result);
      } catch (err) {
        return Response.json(
          {
            error:
              err instanceof Error
                ? err.message
                : "Failed to parse certificate",
          },
          { status: 400 },
        );
      }
    }

    if (!host || typeof host !== "string" || host.length === 0) {
      return Response.json({ error: "Host is required" }, { status: 400 });
    }
    try {
      const result = await fetchRemoteCertificate(host, port);
      return Response.json(result);
    } catch (error) {
      console.error("Error during fetchRemoteCertificate:", error);
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}
