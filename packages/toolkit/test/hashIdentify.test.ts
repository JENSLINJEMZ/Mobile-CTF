import { describe, expect, it } from "vitest";

import { identifyHash } from "../src/hashIdentify";

describe("identifyHash", () => {
  it("identifies MD5-style 32-char hex hashes", () => {
    const result = identifyHash("5f4dcc3b5aa765d61d8327deb882cf99");
    expect(result.candidates.map((candidate) => candidate.name)).toEqual(
      expect.arrayContaining(["MD5", "MD4", "NTLM"]),
    );
    expect(result.characterSet).toBe("hex");
  });

  it("identifies SHA-1", () => {
    const result = identifyHash("e40bd250b78d6b22b5c9d58f5b560d89f1aa001e");
    expect(result.candidates.map((candidate) => candidate.name)).toContain(
      "SHA-1",
    );
  });

  it("identifies SHA-256", () => {
    const result = identifyHash(
      "6d2e5f5b0b42f4582dc70d5d9fca5ebbc4cbcc2a14b13a1f819c9ae3673de4bb",
    );
    expect(result.candidates.map((candidate) => candidate.name)).toEqual([
      "SHA-256",
      "SHA3-256",
    ]);
  });

  it("identifies SHA-384 and SHA-512", () => {
    expect(
      identifyHash("a".repeat(96)).candidates.some(
        (candidate) => candidate.name === "SHA-384",
      ),
    ).toBe(true);
    expect(
      identifyHash("a".repeat(128)).candidates.some(
        (candidate) => candidate.name === "SHA-512",
      ),
    ).toBe(true);
  });

  it("identifies bcrypt hashes", () => {
    const result = identifyHash(
      "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
    );
    expect(
      result.candidates.some((candidate) => candidate.name === "bcrypt"),
    ).toBe(true);
  });

  it("identifies unix crypt hashes", () => {
    expect(
      identifyHash(`$6$salt$${"z".repeat(86)}`).candidates.some(
        (candidate) => candidate.name === "SHA-512 crypt",
      ),
    ).toBe(true);
    expect(
      identifyHash(`$5$salt$${"z".repeat(43)}`).candidates.some(
        (candidate) => candidate.name === "SHA-256 crypt",
      ),
    ).toBe(true);
  });

  it("reports no candidates and unknown charset for non-hash strings", () => {
    const result = identifyHash("=== not a hash at all ===");
    expect(result.candidates).toEqual([]);
    expect(result.characterSet).toBe("unknown");
  });

  it("treats uppercase hex the same as lowercase", () => {
    const lower = identifyHash("a".repeat(32));
    const upper = identifyHash("A".repeat(32));
    expect(lower.candidates.map((candidate) => candidate.name)).toEqual(
      upper.candidates.map((candidate) => candidate.name),
    );
  });
});
