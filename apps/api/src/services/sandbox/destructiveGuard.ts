/**
 * Destructive-command guard.
 *
 * Lines of user terminal input pass through `scanDestructiveInput` before the
 * raw runtime. A match means the sandbox is treated as compromised: the
 * container is torn down (status CRASHED) and the client offers a "Reassemble"
 * action that reconstructs a fresh container for the same session.
 *
 * The guard is intentionally conservative — it only fringes on commands that
 * destroy the environment or wipe system paths, not on normal CTF tooling.
 */

export interface DestructiveCommand {
  /** Machine-readable rule id (e.g. `RM_DELETE_ROOT`). */
  id: string;
  /** Human-readable reason embedded in the crash event/output. */
  reason: string;
}

/** Tokens that separate commands or pipe/redirect — not path targets. */
const OPERATORS = new Set([";", "&&", "||", "|", ">", ">>", "<", "&", "$", ":"]);

/** System directories whose recursive deletion should always be fringed. */
const SYSTEM_DIRS = [
  "etc",
  "usr",
  "bin",
  "sbin",
  "lib",
  "boot",
  "dev",
  "proc",
  "sys",
  "var",
  "opt",
  "srv",
  "root",
];

function isOperator(token: string): boolean {
  return OPERATORS.has(token) || /^[;&|<>]+$/.test(token);
}

function isSystemPath(target: string): boolean {
  for (const dir of SYSTEM_DIRS) {
    if (new RegExp(`^/(?:${dir})(?:/|$)`).test(target)) return true;
  }
  return false;
}

function isRootOrHome(target: string): boolean {
  return (
    target === "/" ||
    target === "/*" ||
    target === "." ||
    target === ".." ||
    target === "~" ||
    target === "~/"
  );
}

function isTopLevelGlob(target: string): boolean {
  return /^\*/.test(target) || /^\/\*/.test(target);
}

function cleanToken(token: string): string {
  return token.replace(/^["']|["']$/g, "");
}

/**
 * Token-based analysis of `rm` invocations. A delete is fringed when it is
 * recursive and/or forced and aimed at a root/home/system/glob target — even
 * when flags or targets are reordered (`rm -fr /`, `rm / -rf`,
 * `rm -rf / ; echo ok`, `rm -rf /etc`, `rm /etc/passwd -f`).
 */
export function scanRm(input: string): DestructiveCommand | null {
  const tokens = input.split(/\s+/);
  const rmIndex = tokens.findIndex((token) => token === "rm");
  if (rmIndex === -1) return null;

  const rest = tokens.slice(rmIndex + 1);
  const flags = rest.filter(
    (token) => /^-\w/.test(token) || /^--\w/.test(token),
  );
  const targets = rest
    .filter((token) => !/^-\w/.test(token) && !/^--\w/.test(token) && !isOperator(token))
    .map(cleanToken);

  const recursive = flags.some((flag) => /-[a-z]*r[a-z]*/.test(flag));
  const force = flags.some((flag) => /-[a-z]*f[a-z]*/.test(flag));
  if (!recursive && !force) return null;

  const dangerous = targets.some(
    (target) =>
      isRootOrHome(target) || isSystemPath(target) || isTopLevelGlob(target),
  );
  if (!dangerous) return null;

  return {
    id: "RM_DELETE_ROOT",
    reason: `recursive force-delete of system path (rm ${flags.join(" ")} ${targets.join(" ")})`,
  };
}

/** Regex table for non-`rm` destructive patterns (whole line, case-insensitive). */
const RULES: Array<{
  id: string;
  reason: string;
  pattern: RegExp;
}> = [
  {
    id: "DD_BLOCK_DEVICE",
    reason: "writing to a raw block device (dd of=/dev/sd*)",
    pattern: /\bdd\b[\s\S]*\bof=\/dev\/(?:sd|hd|nvme|mmcblk|loop)[a-z0-9]*/i,
  },
  {
    id: "MKFS_DEVICE",
    reason: "formatting/partitioning a device (mkfs)",
    pattern: /\bmkfs(?:\.[a-z0-9]+)?\b/i,
  },
  {
    id: "FORK_BOMB",
    reason: "fork bomb attempt",
    pattern: /:\(\)\s*\{\s*\|?:\|?:.*\};/i,
  },
  {
    id: "CHMOD_ROOT",
    reason: "recursive chmod of the whole filesystem",
    pattern: /\bchmod\s+-R\s+[0-7]{3,4}\s+\//i,
  },
  {
    id: "CHOWN_ROOT",
    reason: "recursive chown of the whole filesystem",
    pattern: /\bchown\s+-R[\s\S]*?\s+\//i,
  },
  {
    id: "DEVICE_REDIRECT",
    reason: "overwriting a raw device via redirect",
    pattern: />\s*\/dev\/(?:sd|hd|nvme|mmcblk)[a-z0-9]*/i,
  },
  {
    id: "SHUTDOWN",
    reason: "system shutdown/reboot attempt",
    pattern: /\b(?:shutdown|reboot|poweroff|halt)\b/i,
  },
  {
    id: "SHRED_SYSTEM",
    reason: "shredding/overwriting system files",
    pattern: /\bshred\b[\s\S]*?--?"?u"?[\s\S]*?\/(?:etc|boot|usr|bin|sbin|lib|var|dev)\b/i,
  },
];

/**
 * Scan one submitted input line for destructive commands.
 * Returns null when the input is fine to forward to the container.
 */
export function scanDestructiveInput(input: string): DestructiveCommand | null {
  const line = input.trim();
  if (!line) return null;

  const rmHit = scanRm(line);
  if (rmHit) return rmHit;

  for (const rule of RULES) {
    if (rule.pattern.test(line)) {
      return { id: rule.id, reason: rule.reason };
    }
  }
  return null;
}