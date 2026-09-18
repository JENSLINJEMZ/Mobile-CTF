import { Role, type UserAdminDto } from "@ctf/shared";

export type UserTabKey =
  | "all"
  | "active"
  | "disabled"
  | "admins"
  | "moderators"
  | "authors";

export type UserStatusKey = "all" | "online" | "idle" | "offline";

export type UserSortKey = "newest" | "oldest" | "solves" | "points";

export const TABS: [UserTabKey, string][] = [
  ["all", "All Users"],
  ["active", "Active"],
  ["disabled", "Disabled"],
  ["admins", "Admins"],
  ["moderators", "Moderators"],
  ["authors", "Authors"],
];

export const GRANTABLE_ROLES: Role[] = [
  Role.USER,
  Role.AUTHOR,
  Role.MODERATOR,
  Role.ADMIN,
];

export const ROLE_LABEL: Record<Role, string> = {
  USER: "User",
  AUTHOR: "Author",
  MODERATOR: "Moderator",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export const ROLE_OPTIONS: [Role, string][] = [
  [Role.USER, "User"],
  [Role.AUTHOR, "Author"],
  [Role.MODERATOR, "Moderator"],
  [Role.ADMIN, "Admin"],
  [Role.SUPER_ADMIN, "Super Admin"],
];

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

export function roleClass(role: Role): string {
  return role.toLowerCase().replace("_", "-");
}

export function userIdLabel(user: Pick<UserAdminDto, "id">): string {
  return `#USR${String(user.id).padStart(4, "0")}`;
}

export function joinedDate(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return `${MONTHS[d.getMonth()] ?? ""} ${d.getDate()}, ${d.getFullYear()}`;
}

export function fullDate(d: Date): string {
  const m = MONTHS[d.getMonth()] ?? "";
  return `${m} ${d.getDate()}, ${d.getFullYear()}`;
}

export function relativeTime(raw: string | null): string {
  if (!raw) return "never";
  const at = new Date(raw);
  if (Number.isNaN(at.getTime())) return "—";
  const diffMs = Date.now() - at.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return fullDate(at);
}

export type UserStatus = "online" | "idle" | "offline";

const ONLINE_WINDOW_MS = 10 * 60 * 1000;

export function userStatus(user: UserAdminDto): UserStatus {
  if (!user.isActive) return "offline";
  const last = user.lastLoginAt ? new Date(user.lastLoginAt).getTime() : 0;
  if (!Number.isNaN(last) && last > 0 && Date.now() - last < ONLINE_WINDOW_MS) {
    return "online";
  }
  return "idle";
}

export function statusLabel(s: UserStatus): string {
  if (s === "online") return "Online";
  if (s === "idle") return "Idle";
  return "Offline";
}

export function matchesUser(user: UserAdminDto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    user.username.toLowerCase().includes(q) ||
    user.email.toLowerCase().includes(q) ||
    userIdLabel(user).toLowerCase().includes(q)
  );
}

export function passesTab(user: UserAdminDto, tab: UserTabKey): boolean {
  switch (tab) {
    case "active":
      return user.isActive;
    case "disabled":
      return !user.isActive;
    case "admins":
      return user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    case "moderators":
      return user.role === "MODERATOR";
    case "authors":
      return user.role === "AUTHOR";
    default:
      return true;
  }
}

export function filterUsers(
  users: UserAdminDto[],
  opts: {
    tab: UserTabKey;
    role: "all" | Role;
    status: UserStatusKey;
    query: string;
  },
): UserAdminDto[] {
  return users.filter(
    (u) =>
      matchesUser(u, opts.query) &&
      passesTab(u, opts.tab) &&
      (opts.role === "all" || u.role === opts.role) &&
      (opts.status === "all" || userStatus(u) === opts.status),
  );
}

export function sortUsers(
  users: UserAdminDto[],
  sort: UserSortKey,
): UserAdminDto[] {
  const rows = [...users];
  switch (sort) {
    case "oldest":
      return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "solves":
      return rows.sort((a, b) => b.solveCount - a.solveCount);
    case "points":
      return rows.sort((a, b) => b.totalScore - a.totalScore);
    case "newest":
    default:
      return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function pct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}