import { describe, expect, it } from "vitest";

import {
  base64ToBytes,
  bytesToBase64,
  bytesToHex,
  bytesToUtf8,
  decodeBase64,
  encodeBase64,
  hexToBytes,
  rot13,
  rotWithShift,
  urlDecode,
  urlEncode,
  utf8ToBytes,
} from "../src/encoding";

describe("utf8/byte helpers", () => {
  it("round-trips text through utf8ToBytes/bytesToUtf8", () => {
    const input = "Hello world — 你好 🌍";
    expect(bytesToUtf8(utf8ToBytes(input))).toBe(input);
  });

  it("round-trips byte arrays through hex", () => {
    const bytes = utf8ToBytes("CTF{hex_test}");
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes);
    expect(bytesToHex(hexToBytes("0a1bff"))).toBe("0a1bff");
    expect(bytesToHex(Uint8Array.from([0x0a, 0x1b, 0xff]), true)).toBe(
      "0A1BFF",
    );
  });

  it("rejects invalid hex", () => {
    expect(() => hexToBytes("abc")).toThrow();
    expect(() => hexToBytes("zz")).toThrow();
  });

  it("tolerates separators in hex input", () => {
    expect(bytesToHex(hexToBytes("0A 1B:ff-2c"))).toBe("0a1bff2c");
  });
});

describe("base64", () => {
  it("encodes and decodes standard text", () => {
    expect(encodeBase64("Hello, World!")).toBe("SGVsbG8sIFdvcmxkIQ==");
    expect(decodeBase64("SGVsbG8sIFdvcmxkIQ==")).toBe("Hello, World!");
  });

  it("handles unicode via UTF-8 bytes", () => {
    const value = "café ☕";
    expect(decodeBase64(encodeBase64(value))).toBe(value);
  });

  it("round-trips through raw byte conversion", () => {
    const bytes = Uint8Array.from([
      0, 1, 2, 3, 4, 5, 250, 251, 252, 253, 254, 255,
    ]);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it("supports unpadded and newline-tolerant input", () => {
    expect(decodeBase64("SGVsbG8gV29ybGQ")).toBe("Hello World");
    expect(decodeBase64("SGVs\nbG8gV29ybGQ")).toBe("Hello World");
  });

  it("rejects invalid characters or lengths", () => {
    expect(() => decodeBase64("not base64!!!")).toThrow();
  });
});

describe("URL encoding", () => {
  it("percent-encodes and decodes", () => {
    expect(urlEncode("a b&c=d")).toBe("a%20b%26c%3Dd");
    expect(urlDecode("a%20b%26c%3Dd")).toBe("a b&c=d");
  });

  it("treats + as a space when decoding", () => {
    expect(urlDecode("hello+world")).toBe("hello world");
  });

  it("round-trips unicode", () => {
    const value = "café/ﬁle?q=1";
    expect(urlDecode(urlEncode(value))).toBe(value);
  });

  it("leaves unreserved characters intact", () => {
    expect(
      urlEncode(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~",
      ),
    ).toBe(
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~",
    );
  });
});

describe("rot13 / rot", () => {
  it("applies ROT13 twice to return to original", () => {
    const input = "The quick brown fox jumps over the lazy dog.";
    expect(rot13(rot13(input))).toBe(input);
    expect(rot13("Hello")).toBe("Uryyb");
  });

  it("preserves case and non-letters", () => {
    expect(rot13("aBcZ 123!")).toBe("nOpM 123!");
  });

  it("rotWithShift normalizes negative and large shifts", () => {
    expect(rotWithShift("abc", 1)).toBe("bcd");
    expect(rotWithShift("abc", -1)).toBe("zab");
    expect(rotWithShift("abc", 27)).toBe("bcd");
    expect(rotWithShift("abc", 26)).toBe("abc");
  });
});
