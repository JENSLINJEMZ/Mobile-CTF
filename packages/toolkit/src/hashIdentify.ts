export interface HashCandidate {
  name: string;
  hexLength: number | null;
  pattern: string;
  description: string;
}

const CANDIDATES: Omit<HashCandidate, "match">[] = [];
function register(candidate: Omit<HashCandidate, "match">): void {
  CANDIDATES.push(candidate);
}

register({
  name: "MD5",
  hexLength: 32,
  pattern: "^[0-9a-f]{32}$",
  description: "128-bit digest (e.g. legacy web apps)",
});
register({
  name: "MD4",
  hexLength: 32,
  pattern: "^[0-9a-f]{32}$",
  description: "128-bit digest (legacy, weak)",
});
register({
  name: "NTLM",
  hexLength: 32,
  pattern: "^[0-9a-f]{32}$",
  description: "Windows NT LAN Manager hash",
});
register({
  name: "SHA-1",
  hexLength: 40,
  pattern: "^[0-9a-f]{40}$",
  description: "160-bit digest",
});
register({
  name: "SHA-224",
  hexLength: 56,
  pattern: "^[0-9a-f]{56}$",
  description: "224-bit digest",
});
register({
  name: "SHA-256",
  hexLength: 64,
  pattern: "^[0-9a-f]{64}$",
  description: "256-bit digest",
});
register({
  name: "SHA3-256",
  hexLength: 64,
  pattern: "^[0-9a-f]{64}$",
  description: "256-bit SHA-3 digest",
});
register({
  name: "SHA-384",
  hexLength: 96,
  pattern: "^[0-9a-f]{96}$",
  description: "384-bit digest",
});
register({
  name: "SHA-512",
  hexLength: 128,
  pattern: "^[0-9a-f]{128}$",
  description: "512-bit digest",
});
register({
  name: "SHA3-512",
  hexLength: 128,
  pattern: "^[0-9a-f]{128}$",
  description: "512-bit SHA-3 digest",
});
register({
  name: "bcrypt",
  hexLength: null,
  pattern: "^\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}$",
  description: "Adaptive password hash ($2a$/$2b$/$2y$)",
});
register({
  name: "SHA-512 crypt",
  hexLength: null,
  pattern: "^\\$6\\$[./A-Za-z0-9]{1,16}\\$[./A-Za-z0-9]{86}$",
  description: "Unix $6$ shadow hash",
});
register({
  name: "SHA-256 crypt",
  hexLength: null,
  pattern: "^\\$5\\$[./A-Za-z0-9]{1,16}\\$[./A-Za-z0-9]{43}$",
  description: "Unix $5$ shadow hash",
});

export interface HashIdentification {
  normalized: string;
  candidates: HashCandidate[];
  characterSet: "hex" | "mixed" | "unknown";
}

export function identifyHash(input: string): HashIdentification {
  const normalized = input.trim().replace(/\s+/g, "");
  const lower = normalized.toLowerCase();
  const isHex = /^[0-9a-f]+$/.test(lower);
  const matches: HashCandidate[] = [];
  for (const candidate of CANDIDATES) {
    const regex = new RegExp(candidate.pattern);
    const haystack = candidate.hexLength !== null ? lower : normalized;
    if (regex.test(haystack)) {
      matches.push({ ...candidate });
    }
  }
  return {
    normalized,
    candidates: matches,
    characterSet: isHex
      ? "hex"
      : /^[a-zA-Z0-9$./]+$/.test(normalized)
        ? "mixed"
        : "unknown",
  };
}
