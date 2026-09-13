import type { LucideName } from "@/components/lucide-icon";

/* ------------------------------------------------------------
   Design tokens (ported from /home/jemzi/Developement/UI comps)
   ------------------------------------------------------------ */
export const C = {
  bgPrimary: "#07070f",
  bgSecondary: "#0b0a16",
  surface: "#12101f",
  surface2: "#181530",
  purple: "#8b5cf6",
  purpleLight: "#a78bfa",
  purpleDeep: "#6d28d9",
  blue: "#60a5fa",
  cyan: "#22d3ee",
  pink: "#ec4899",
  green: "#34d399",
  orange: "#f59e0b",
  red: "#f43f5e",
  rose: "#fb7185",
  gold: "#fbbf24",
  textPrimary: "#f2f0fb",
  textSecondary: "#b0abc9",
  textMuted: "#7a7699",
  border: "rgba(255, 255, 255, 0.07)",
  borderStrong: "rgba(255, 255, 255, 0.13)",
};

export type Accent = { color: string; soft: string; line: string; glow: string };

export const ACCENTS: Record<string, Accent> = {
  purple: { color: "#a78bfa", soft: "rgba(167,139,250,.12)", line: "rgba(167,139,250,.32)", glow: "rgba(167,139,250,.28)" },
  red: { color: "#f87171", soft: "rgba(248,113,113,.12)", line: "rgba(248,113,113,.32)", glow: "rgba(248,113,113,.28)" },
  green: { color: "#34d399", soft: "rgba(52,211,153,.12)", line: "rgba(52,211,153,.32)", glow: "rgba(52,211,153,.28)" },
  orange: { color: "#f59e0b", soft: "rgba(245,158,11,.12)", line: "rgba(245,158,11,.32)", glow: "rgba(245,158,11,.28)" },
  blue: { color: "#60a5fa", soft: "rgba(96,165,250,.12)", line: "rgba(96,165,250,.32)", glow: "rgba(96,165,250,.28)" },
  pink: { color: "#ec4899", soft: "rgba(236,72,153,.12)", line: "rgba(236,72,153,.32)", glow: "rgba(236,72,153,.28)" },
  cyan: { color: "#22d3ee", soft: "rgba(34,211,238,.12)", line: "rgba(34,211,238,.32)", glow: "rgba(34,211,238,.28)" },
};

export const ACCENT_ORDER = ["green", "orange", "blue", "pink", "cyan", "purple", "red"];

export const DIFF_COLORS: Record<string, string> = {
  EASY: "#4ade80",
  MEDIUM: "#fbbf24",
  HARD: "#fb923c",
  EXPERT: "#f43f5e",
};

export function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function difficultyLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const CATEGORY_ICON: Record<string, LucideName> = {
  cryptography: "lock",
  forensics: "file",
  "mobile security": "bug",
  "web exploitation": "globe",
  "reverse engineering": "cpu",
  network: "activity",
  hardware: "logic",
  osint: "search",
  web: "globe",
  recon: "radar",
};

export function categoryIcon(category: string): LucideName {
  return CATEGORY_ICON[String(category ?? "").toLowerCase()] ?? "cube";
}

export function categoryAccent(name: string): Accent {
  const n = String(name ?? "").toLowerCase();
  let h = 0;
  for (let i = 0; i < n.length; i += 1) h = (h * 31 + n.charCodeAt(i)) | 0;
  const key = ACCENT_ORDER[(h & 0x7fffffff) % ACCENT_ORDER.length];
  return ACCENTS[key];
}