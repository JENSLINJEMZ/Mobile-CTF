import type { ChallengeSummaryDto, Difficulty } from "@ctf/shared";

export interface CategoryTone {
  color: string;
  bg: string;
  line: string;
  glow: string;
  glyph: string;
}

// Lightweight 24x24 glyphs (stroke paths rendered by <svg>), keyed by slug.
export const CATEGORY_TONES: Record<string, CategoryTone> = {
  web: {
    color: "#93c5fd",
    bg: "rgba(29,57,137,.45)",
    line: "rgba(96,165,250,.6)",
    glow: "rgba(96,165,250,.7)",
    glyph: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 3.2 2.5 13.8 0 17M12 3.5c-2.5 3.2-2.5 13.8 0 17"/>',
  },
  crypto: {
    color: "#fbbf24",
    bg: "rgba(120,53,15,.5)",
    line: "rgba(251,191,36,.55)",
    glow: "rgba(251,191,36,.65)",
    glyph: '<rect x="4.5" y="10.5" width="15" height="9" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.4" fill="currentColor"/>',
  },
  forensics: {
    color: "#fdba74",
    bg: "rgba(124,45,18,.45)",
    line: "rgba(251,146,60,.55)",
    glow: "rgba(251,146,60,.65)",
    glyph: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.6-4.6"/><path d="M8 11h6M11 8v6"/>',
  },
  reversing: {
    color: "#67e8f9",
    bg: "rgba(8,51,68,.5)",
    line: "rgba(103,232,249,.5)",
    glow: "rgba(103,232,249,.6)",
    glyph: '<rect x="7" y="7" width="10" height="10" rx="2"/><rect x="10.5" y="10.5" width="3" height="3" fill="currentColor"/><path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2"/>',
  },
  osint: {
    color: "#c4b5fd",
    bg: "rgba(76,29,149,.5)",
    line: "rgba(167,139,250,.6)",
    glow: "rgba(167,139,250,.7)",
    glyph: '<circle cx="12" cy="12" r="8.5"/><path d="m15 9-2 4-4 2 2-4z"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  },
  misc: {
    color: "#f9a8d4",
    bg: "rgba(112,26,78,.45)",
    line: "rgba(244,114,182,.55)",
    glow: "rgba(244,114,182,.65)",
    glyph: '<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.2a2.4 2.4 0 0 1 4.5 1.2c0 1.6-2.3 1.9-2.3 3.1"/><path d="M12 17h.01"/>',
  },
};

export const FALLBACK_TONE: CategoryTone = {
  color: "#a78bfa",
  bg: "rgba(76,29,149,.5)",
  line: "rgba(167,139,250,.6)",
  glow: "rgba(167,139,250,.7)",
  glyph: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><circle cx="7" cy="7.5" r="1" fill="currentColor"/><circle cx="7" cy="16.5" r="1" fill="currentColor"/>',
};

export function toneFor(slug: string): CategoryTone {
  return CATEGORY_TONES[slug] ?? {
    ...FALLBACK_TONE,
    glyph: FALLBACK_TONE.glyph,
  };
}

export const DIFF_LABEL: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
  EXPERT: "Expert",
};

export const DIFF_CLASS: Record<Difficulty, string> = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
  EXPERT: "expert",
};

export const DIFF_ORDER: Record<Difficulty, number> = {
  EASY: 0,
  MEDIUM: 1,
  HARD: 2,
  EXPERT: 3,
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function fmtWhen(iso: string): { d: string; t: string } {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return { d: "—", t: "" };
  const d = `${MONTHS[dt.getMonth()]} ${String(dt.getDate()).padStart(2, "0")}, ${dt.getFullYear()}`;
  let h = dt.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const t = `${h}:${String(dt.getMinutes()).padStart(2, "0")} ${ampm}`;
  return { d, t };
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const wks = Math.floor(days / 7);
  if (wks < 5) return `${wks}w ago`;
  return fmtWhen(iso).d;
}

export function matchesQuery(
  c: ChallengeSummaryDto,
  q: string,
): boolean {
  const ql = q.trim().toLowerCase();
  if (!ql) return true;
  return [
    c.title,
    c.slug,
    c.category.name,
    c.category.slug,
    ...c.tags.map((t) => `${t.name} ${t.slug}`),
  ]
    .join(" ")
    .toLowerCase()
    .includes(ql);
}

export function exportChallengesCsv(rows: ChallengeSummaryDto[]): void {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const head = "id,title,slug,category,difficulty,points,solves,status,updated";
  const body = rows
    .map((r) =>
      [
        r.id,
        esc(r.title),
        esc(r.slug),
        esc(r.category.name),
        r.difficulty,
        r.basePoints,
        r.solvedCount,
        r.published ? "published" : "draft",
        r.updatedAt,
      ].join(","),
    )
    .join("\n");
  const blob = new Blob([`${head}\n${body}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `challenges-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}