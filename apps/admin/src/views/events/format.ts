import type { EventStatus } from "@ctf/shared";

export interface EventCardMeta {
  id: number;
  slug: string;
  title: string;
  description: string;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  participantCount: number;
  teamCount: number;
  challengeCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export const STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  RUNNING: "Running",
  ENDED: "Completed",
};

export const DAY_MS = 86400000;

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

export function monthLabel(d: Date): string {
  return MONTHS[d.getMonth()] ?? "";
}

export function dayLabel(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()] ?? ""}`;
}

export function timeLabel(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fullDate(d: Date): string {
  return `${dayLabel(d)} ${d.getFullYear()}`;
}

export function shortDate(d: Date): string {
  return `${dayLabel(d)} ${String(d.getFullYear()).slice(2)}`;
}

export function dateRange(startRaw: string, endRaw: string): string {
  const start = new Date(startRaw);
  const end = new Date(endRaw);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return "TBA";
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) {
    return `${fullDate(start)} · ${timeLabel(start)} — ${timeLabel(end)}`;
  }
  return `${fullDate(start)} · ${timeLabel(start)} — ${fullDate(end)} · ${timeLabel(end)}`;
}

export function durationDays(startRaw: string, endRaw: string): string {
  const start = new Date(startRaw);
  const end = new Date(endRaw);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return "—";
  const days = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / DAY_MS),
  );
  if (days === 0) return "Same day";
  if (days === 1) return "1 Day";
  return `${days} Days`;
}

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function matchesEvent(e: EventCardMeta, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    e.title.toLowerCase().includes(q) ||
    e.slug.toLowerCase().includes(q) ||
    e.description.toLowerCase().includes(q)
  );
}