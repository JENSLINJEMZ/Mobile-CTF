export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"}, ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"}, ${minutes} min`;
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function formatServerTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}