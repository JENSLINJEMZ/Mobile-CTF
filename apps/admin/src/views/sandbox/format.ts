import type { SandboxContainerStatus } from "@ctf/shared";

const AVATAR_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
  "#f97316",
  "#22c55e",
  "#22d3ee",
  "#f5a524",
];

export function colorOf(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length] ?? "#8b5cf6";
}

export function humanBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function fmtUptime(sec: number | null): string {
  if (sec === null || sec <= 0) return "-";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function fmtRemaining(iso: string | null): string {
  if (!iso) return "-";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "-";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "<1m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function relativeTime(epochMs: number): string {
  const mins = Math.max(0, Math.round((Date.now() - epochMs) / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return h === 1 ? "1 hour ago" : `${h} hours ago`;
}

export function humanCpu(cpu: number): string {
  return `${cpu} vCPU`;
}

export function humanRam(mb: number): string {
  if (mb >= 1024) return `${mb / 1024} GB RAM`;
  return `${mb} MB RAM`;
}

export function statusLabel(status: SandboxContainerStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}