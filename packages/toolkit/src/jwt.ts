import { base64ToBytes, bytesToUtf8, utf8ToBytes } from "./encoding";

export function base64UrlToBytes(input: string): Uint8Array {
  const migrated = input
    .replace(/[-_]/g, (char) => (char === "-" ? "+" : "/"))
    .replace(/[^A-Za-z0-9+/]/g, "");
  return base64ToBytes(migrated);
}

function encodeBase64(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const n = ((b0 << 16) | (b1 << 8) | b2) >>> 0;
    out += alphabet[(n >>> 18) & 63];
    out += alphabet[(n >>> 12) & 63];
    out += i + 1 < bytes.length ? alphabet[(n >>> 6) & 63] : "=";
    out += i + 2 < bytes.length ? alphabet[n & 63] : "=";
  }
  return out;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  return encodeBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function jsonToBase64Url(value: unknown): string {
  return bytesToBase64Url(utf8ToBytes(JSON.stringify(value)));
}

export function decodeBase64UrlJson(input: string): unknown {
  return JSON.parse(bytesToUtf8(base64UrlToBytes(input)));
}

export interface DecodedJwt {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string;
  validStructure: boolean;
  expiresAt: number | null;
  expiresInSeconds: number | null;
  issuedAt: number | null;
  errors: string[];
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split(".");
  const errors: string[] = [];

  if (parts.length !== 3) {
    errors.push(
      "Token must have three dot-separated segments (header.payload.signature)",
    );
    return {
      header: null,
      payload: null,
      signature: "",
      validStructure: false,
      expiresAt: null,
      expiresInSeconds: null,
      issuedAt: null,
      errors,
    };
  }

  const [headerSegment = "", payloadSegment = "", signature = ""] = parts;

  let header: Record<string, unknown> | null = null;
  let payload: Record<string, unknown> | null = null;
  try {
    const parsed = decodeBase64UrlJson(headerSegment);
    header =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
  } catch {
    errors.push("Header segment is not valid base64url JSON");
  }
  try {
    const parsed = decodeBase64UrlJson(payloadSegment);
    payload =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
  } catch {
    errors.push("Payload segment is not valid base64url JSON");
  }

  const now = Math.floor(Date.now() / 1000);
  let expiresAt: number | null = null;
  let expiresInSeconds: number | null = null;
  let issuedAt: number | null = null;

  if (payload) {
    const exp = payload.exp;
    const iat = payload.iat;
    if (typeof exp === "number") {
      expiresAt = exp;
      expiresInSeconds = exp - now;
      if (exp <= now)
        errors.push(`Token expired at ${new Date(exp * 1000).toISOString()}`);
    }
    if (typeof iat === "number") issuedAt = iat;
  }

  return {
    header,
    payload,
    signature,
    validStructure: header !== null && payload !== null,
    expiresAt,
    expiresInSeconds,
    issuedAt,
    errors,
  };
}
