const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function submissionTime(iso: string): string {
  const d = new Date(iso);
  const mon = MONTHS[d.getUTCMonth()] ?? "Jan";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${mon} ${day}, ${h}:${min}`;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return `just now`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function chartLabel(isoDay: string): string {
  const [, m, d] = isoDay.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1] ?? "Jan"} ${d ?? 1}`;
}

export function shortNum(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export function numFmt(value: number): string {
  return value.toLocaleString("en-US");
}

export function pct(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export function flagPreview(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 12)}…`;
}

export function sparkline(values: number[]): { area: string; line: string } {
  const w = 84;
  const h = 28;
  const pad = 4;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => ({
    x: pad + (values.length > 1 ? i * step : 0),
    y: pad + ((max - v) / span) * (h - pad * 2),
  }));
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const last = pts.at(-1) ?? { x: pad, y: pad };
  return {
    line,
    area: `${line} L${last.x.toFixed(1)} ${h - pad} L${pad} ${h - pad} Z`,
  };
}

export function pageWindow(
  page: number,
  totalPages: number,
): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const out: (number | "...")[] = [];
  if (page <= 4) {
    for (let i = 1; i <= 5; i += 1) out.push(i);
    out.push("...", totalPages);
  } else if (page >= totalPages - 3) {
    out.push(1, "...");
    for (let i = totalPages - 4; i <= totalPages; i += 1) out.push(i);
  } else {
    out.push(1, "...", page - 1, page, page + 1, "...", totalPages);
  }
  return out;
}

/** Donut ring: returns dash segment info for a circumference (r) circle. */
export function donutSegments(
  values: number[],
  r: number,
  _strokeWidth: number,
): { len: number; offset: number }[] {
  const c = 2 * Math.PI * r;
  const total = values.reduce((a, b) => a + b, 0);
  let acc = 0;
  return values.map((v) => {
    const frac = total > 0 ? v / total : 0;
    const len = frac * c;
    const seg = { len, offset: acc };
    acc -= len;
    return seg;
  });
}

const CHALLENGE_ICONS: { re: RegExp; d: string; color: string }[] = [
  { re: /sql|inject/i, d: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>', color: "#ef4444" },
  { re: /xor|cipher|caesar|crypto|rot/i, d: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8M12 8v8"/><path d="M4 12h3M17 12h3M6 6l2.2 2.2M15.8 15.8 18 18M6 18l2.2-2.2M15.8 8.2 18 6"/>', color: "#a78bfa" },
  { re: /cookie|web|proxy|http/i, d: '<circle cx="12" cy="12" r="9"/><path d="M9 9.2a1.6 1.6 0 1 0 1.5 2M13.5 13.5a1.8 1.8 0 1 0 2-1M11 7.6a1.5 1.5 0 1 0 .9 2.3"/>', color: "#60a5fa" },
  { re: /log|sweep|analy|forensic/i, d: '<path d="M4 19V10M8 19V6M12 19v-8M16 19v-5M20 19v-7"/>', color: "#facc15" },
  { re: /binary|shell|zombie|assembly|reverse/i, d: '<path d="M6 12h7M9 5h7M3 19h18"/>', color: "#f472b6" },
  { re: /photo|pixel|image|noise|geek|stego/i, d: '<rect x="4" y="6" width="16" height="12" rx="2"/><circle cx="9" cy="10.5" r="1.6"/><path d="m4 16 4.5-4.5L12 14.5l3.5-3.5L20 15"/>', color: "#60a5fa" },
  { re: /vault|wallet|bank/i, d: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M12 13v7"/><circle cx="12" cy="10" r="2"/>', color: "#60a5fa" },
  { re: /root|privilege|sudo/i, d: '<path d="M12 3a6 6 0 0 0-6 6v3h1v3h2l1 3h4l1-3h2v-3h1V9a6 6 0 0 0-6-6z"/>', color: "#ef4444" },
];

export function challengeProfile(title: string): { d: string; color: string } {
  for (const c of CHALLENGE_ICONS) {
    if (c.re.test(title)) return { d: c.d, color: c.color };
  }
  return {
    d: '<path d="M6 21V3.8"/><path d="M6 4.4h10.6l-2.1 3.6 2.1 3.6H6z"/>',
    color: "#a78bfa",
  };
}