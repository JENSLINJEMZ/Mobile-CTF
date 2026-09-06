import type { NotificationType } from "@ctf/shared";

export type NotificationIconName =
  | "information-circle"
  | "megaphone"
  | "trophy"
  | "people"
  | "calendar";

const UNKNOWN: NotificationIconName = "information-circle";

export function notificationIcon(type: string): NotificationIconName {
  switch (type as NotificationType) {
    case "ANNOUNCEMENT":
      return "megaphone";
    case "ACHIEVEMENT":
      return "trophy";
    case "TEAM_INVITE":
      return "people";
    case "EVENT":
      return "calendar";
    case "SYSTEM":
      return "information-circle";
    default:
      return UNKNOWN;
  }
}

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export function formatRelativeTime(
  iso: string,
  now: number = Date.now(),
): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, now - then);
  if (diff < MINUTE_MS) return "just now";
  if (diff < HOUR_MS) {
    const mins = Math.floor(diff / MINUTE_MS);
    return `${mins}m ago`;
  }
  if (diff < DAY_MS) {
    const hours = Math.floor(diff / HOUR_MS);
    return `${hours}h ago`;
  }
  const days = Math.floor(diff / DAY_MS);
  return days === 1 ? "yesterday" : `${days}d ago`;
}