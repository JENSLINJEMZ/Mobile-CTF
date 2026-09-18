import type { TeamAdminDto } from "@ctf/shared";

export type TeamTabKey = "all" | "active" | "inactive" | "verified";
export type TeamStatusKey = "all" | "active" | "inactive";
export type TeamSortKey = "points" | "solves" | "members" | "newest";

export const TABS: { key: TeamTabKey; label: string }[] = [
  { key: "all", label: "All Teams" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "verified", label: "Verified" },
];

export const STATUS_OPTIONS: { key: TeamStatusKey; label: string }[] = [
  { key: "all", label: "All Status" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

export const SORT_OPTIONS: { key: TeamSortKey; label: string }[] = [
  { key: "points", label: "Sort by Points" },
  { key: "solves", label: "Sort by Solves" },
  { key: "members", label: "Sort by Members" },
  { key: "newest", label: "Sort by Newest" },
];

export function statusLabel(status: string): string {
  return status === "active" ? "Active" : "Inactive";
}

export function teamIdLabel(id: number): string {
  return `#TM${String(id).padStart(3, "0")}`;
}

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

export function joinedDate(iso: string): string {
  const d = new Date(iso);
  const mon = MONTHS[d.getUTCMonth()] ?? "Jan";
  return `${mon} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function joinedTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getUTCHours();
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hour}:${min} ${suffix}`;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function chartLabel(isoDay: string): string {
  const [, m, d] = isoDay.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1] ?? "Jan"} ${d ?? 1}`;
}

export function pointsFmt(value: number): string {
  return value.toLocaleString("en-US");
}

function passesTab(team: TeamAdminDto, tab: TeamTabKey): boolean {
  switch (tab) {
    case "active":
      return team.status === "active";
    case "inactive":
      return team.status === "inactive";
    case "verified":
      return team.leaderUsername != null && team.memberCount >= 2;
    default:
      return true;
  }
}

function passesStatus(team: TeamAdminDto, status: TeamStatusKey): boolean {
  return status === "all" || team.status === status;
}

function matchesQuery(team: TeamAdminDto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  const texts = [
    team.name,
    team.slug,
    team.joinCode,
    team.leaderUsername ?? "",
    teamIdLabel(team.id),
  ];
  return texts.some((t) => t.toLowerCase().includes(q));
}

export function filterTeams(
  teams: TeamAdminDto[],
  filters: { tab: TeamTabKey; status: TeamStatusKey; query: string },
): TeamAdminDto[] {
  return teams.filter(
    (t) =>
      passesTab(t, filters.tab) &&
      passesStatus(t, filters.status) &&
      matchesQuery(t, filters.query),
  );
}

export function sortTeams(
  teams: TeamAdminDto[],
  key: TeamSortKey,
): TeamAdminDto[] {
  const sorted = [...teams];
  switch (key) {
    case "solves":
      sorted.sort((a, b) => b.solves - a.solves || a.rank - b.rank);
      break;
    case "members":
      sorted.sort((a, b) => b.memberCount - a.memberCount || a.rank - b.rank);
      break;
    case "newest":
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    default:
      sorted.sort((a, b) => a.rank - b.rank);
  }
  return sorted;
}

export function pct(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
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

export function downloadCsv(
  filename: string,
  rows: string[][],
): void {
  const esc = (cell: string) => `"${cell.replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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