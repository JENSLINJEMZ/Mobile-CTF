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

export function anDate(iso: string): string {
  const d = new Date(iso);
  const mon = MONTHS[d.getUTCMonth()] ?? "Jan";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${mon} ${day}, ${year}`;
}

export function anTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getUTCHours();
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${min} ${ampm}`;
}

/** Minimal, safe Markdown-flavored renderer. Escapes HTML first, then applies a few transforms. */
export function mdPreview(source: string): string {
  const esc = source.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = esc.split("\n");
  let inList = false;
  const out: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (/^#{1,4}\s+/.test(line)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      const level = Math.min(line.match(/^#+/)![0].length + 1, 6);
      const text = mdInline(line.replace(/^#+\s+/, ""));
      out.push(`<h${level}>${text}</h${level}>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${mdInline(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (line.trim() === "") {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      continue;
    }
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    out.push(`<p>${mdInline(line)}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

function mdInline(input: string): string {
  let s = input
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return s;
}

/** Deterministic gradient tint for announcement thumbnails. */
export function thumbSeed(id: number): { from: string; to: string } {
  const palettes = [
    { from: "#2a0f5c", to: "#4c1d95" },
    { from: "#0e3a5e", to: "#1d4e89" },
    { from: "#3a0f2e", to: "#6d1d5c" },
    { from: "#123a2d", to: "#1d6d4a" },
    { from: "#3a2407", to: "#7a4a10" },
    { from: "#241240", to: "#3f1d7a" },
  ];
  return palettes[id % palettes.length] ?? palettes[0]!;
}