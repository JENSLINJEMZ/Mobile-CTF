import { decodeBase64UrlJson } from "./encoding";

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
