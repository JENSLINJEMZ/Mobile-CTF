import { describe, expect, it } from "vitest";

import { bytesToBase64Url, jsonToBase64Url } from "../src/encoding";
import { decodeJwt } from "../src/jwt";
import { hexToBytes } from "../src/encoding";

function makeToken(
  payload: Record<string, unknown>,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" },
): string {
  return `${jsonToBase64Url(header)}.${jsonToBase64Url(payload)}.${bytesToBase64Url(hexToBytes("00".repeat(64)))}`;
}

describe("base64url helpers", () => {
  it("round-trips raw bytes", () => {
    const bytes = Uint8Array.from([0xff, 0x00, 0x3c, 0x7e, 0x01]);
    expect(bytesToBase64Url(bytes)).toBe("_wA8fgE");
  });

  it("jsonToBase64Url produces valid base64url JSON segments", () => {
    const segment = jsonToBase64Url({ alg: "HS256" });
    expect(segment).toBe("eyJhbGciOiJIUzI1NiJ9");
  });
});

describe("decodeJwt", () => {
  it("decodes a well-formed token", () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeToken({
      sub: "user-1",
      name: "Alice",
      iat: now,
      exp: now + 3600,
    });
    const result = decodeJwt(token);
    expect(result.validStructure).toBe(true);
    expect(result.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(result.payload).toMatchObject({ sub: "user-1", name: "Alice" });
    expect(result.issuedAt).toBe(now);
    expect(result.expiresAt).toBe(now + 3600);
    expect(result.errors).toEqual([]);
  });

  it("flags an expired token", () => {
    const token = makeToken({ exp: 1 });
    const result = decodeJwt(token);
    expect(
      result.errors.some((error) => error.startsWith("Token expired")),
    ).toBe(true);
    expect(result.expiresInSeconds).toBeLessThan(0);
  });

  it("treats a future exp as valid", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const result = decodeJwt(makeToken({ exp: future }));
    expect(result.expiresInSeconds).toBeGreaterThan(3000);
    expect(result.errors).toEqual([]);
  });

  it("rejects tokens without three segments", () => {
    const result = decodeJwt("only-two.parts");
    expect(result.validStructure).toBe(false);
    expect(result.errors[0]).toContain("three dot-separated");
  });

  it("reports malformed base64url JSON segments", () => {
    const result = decodeJwt("not-json.not-json.abc");
    expect(result.validStructure).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("tolerates surrounding whitespace", () => {
    const token = makeToken({ sub: "x" });
    expect(decodeJwt(`  ${token}  `).validStructure).toBe(true);
  });

  it("does not verify signatures (validation is structural only)", () => {
    const token = makeToken({ sub: "user-1" });
    const result = decodeJwt(token);
    expect(result.signature.length).toBeGreaterThan(0);
    expect(result.payload).toMatchObject({ sub: "user-1" });
  });
});
