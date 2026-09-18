import { useId } from "react";

export function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function SVG({
  d,
  size = 14,
  className,
}: {
  d: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: "none" }}
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}

export const SEARCH =
  '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-3.6-3.6"/>';
export const CARET = '<path d="m6 9 6 6 6-6"/>';
export const CHEV_R = '<path d="M5 12h13"/><path d="m13 6 6 6-6 6"/>';
export const PLUS = '<path d="M12 5v14M5 12h14"/>';
export const SLIDERS = '<path d="M3 5h18M6 12h12M10 19h4"/>';
export const KEBAB =
  '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>';
export const LIST_VIEW = '<path d="M4 6h16M4 12h16M4 18h16"/>';
export const GRID_VIEW =
  '<rect x="3" y="3" width="7" height="7" rx="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.8"/>';
export const PENCIL = '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>';
export const COPY =
  '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8"/>';
export const BACK = '<path d="m15 18-6-6 6-6"/>';
export const FORWARD = '<path d="m9 6 6 6-6 6"/>';
export const MAIL =
  '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3 7 9 6 9-6"/>';
export const USERS =
  '<path d="M16 20.5v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.7v1.8"/><circle cx="9.5" cy="8" r="3.4"/><path d="M21 20.5v-1.8a3.6 3.6 0 0 0-2.7-3.5"/><path d="M15.5 4.7a3.6 3.6 0 0 1 0 6.7"/>';
export const EXPORT =
  '<path d="M12 3.5v11"/><path d="m7 10 5 5 5-5"/><path d="M5 19.5h14"/>';
export const ANNOUNCE =
  '<path d="M3 11v3a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>';
export const RESET =
  '<path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 3v4h4"/>';
export const SHIELD =
  '<path d="M12 2.5 4.5 5.8v5.9c0 4.9 3.2 9 7.5 10.3 4.3-1.3 7.5-5.4 7.5-10.3V5.8z"/>';
export const AUDIT =
  '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>';
export const DOWNLOAD =
  '<path d="M12 4v10"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/>';
export const CHECK = '<path d="m5 12 4 4L19 6"/>';
export const X = '<path d="M6 6l12 12M18 6 6 18"/>';

export const ROLE_ICON: Record<string, string> = {
  ADMIN:
    '<path d="M3 8l3 3 3-4 3 4 3-4 3 4 3-3v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  SUPER_ADMIN:
    '<path d="m3 17 2-9 4.5 4L12 4l2.5 8L19 8l2 9z"/><circle cx="5" cy="7" r="1.4" fill="currentColor"/><circle cx="12" cy="3" r="1.4" fill="currentColor"/><circle cx="19" cy="7" r="1.4" fill="currentColor"/>',
  MODERATOR:
    '<path d="M12 2.5 4.5 5.8v5.9c0 4.9 3.2 9 7.5 10.3 4.3-1.3 7.5-5.4 7.5-10.3V5.8z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  AUTHOR: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  USER: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
};

const AVATAR_PALETTE: [string, string][] = [
  ["#8b5cf6", "#4c1d95"],
  ["#f43f5e", "#7f1d1d"],
  ["#a78bfa", "#4c1d95"],
  ["#f472b6", "#7f1d4f"],
  ["#22d3ee", "#0e7490"],
  ["#cbd5e1", "#334155"],
  ["#60a5fa", "#1e3a8a"],
  ["#f59e0b", "#7c2d12"],
  ["#4ade80", "#14532d"],
];

const AVATAR_KINDS = ["hood", "mask", "person", "buns", "hacker"];

function hoodSvg(c1: string, c2: string, eye: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" fill={c2} opacity=".35" />
      <path d="M20 5 Q32 8 30 22 Q28 32 20 36 Q12 32 10 22 Q8 8 20 5Z" fill="#0d0818" />
      <ellipse cx="20" cy="21" rx="7" ry="9" fill="#000" />
      <circle cx="17" cy="20" r="1.4" fill={eye} />
      <circle cx="23" cy="20" r="1.4" fill={eye} />
      <path d="M6 40 q2 -13 14 -13 q12 0 14 13z" fill={`url(#${uid}-g)`} opacity=".9" />
    </svg>
  );
}

function maskSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" fill={c2} />
      <circle cx="20" cy="20" r="16" fill={c1} opacity=".35" />
      <ellipse cx="20" cy="20" rx="8" ry="9" fill="#e9c9a6" />
      <path d="M11 16 h18 v3 q-9 3 -18 0z" fill="#0d0818" />
      <path d="M11 16 h8 v3 q-4 1 -8 0z" fill="#22d3ee" opacity=".6" />
      <path d="M21 16 h8 v3 q-4 1 -8 0z" fill="#22d3ee" opacity=".6" />
      <path d="M15 26 q5 3 10 0 v5 q-5 3 -10 0z" fill="#e9c9a6" opacity=".9" />
      <path d="M6 40 q2 -13 14 -13 q12 0 14 13z" fill={`url(#${uid}-g)`} opacity=".85" />
    </svg>
  );
}

function personSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" fill={c2} />
      <circle cx="20" cy="20" r="16" fill={c1} opacity=".4" />
      <ellipse cx="20" cy="18" rx="7" ry="8" fill="#e9c9a6" />
      <path d="M12 17 q1 -12 8 -12 q9 0 8.5 13 q-1.5 -5 -4.5 -6 q-4 2.6 -8.5 1.8 q-3.4.6 -3.5 3.2z" fill={c1} />
      <path d="M6 40 q2 -13 14 -13 q12 0 14 13z" fill={`url(#${uid}-g)`} opacity=".9" />
    </svg>
  );
}

function bunsSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" fill={c2} />
      <circle cx="11" cy="12" r="4" fill={c1} />
      <circle cx="29" cy="12" r="4" fill={c1} />
      <circle cx="20" cy="20" r="16" fill={c1} opacity=".35" />
      <ellipse cx="20" cy="19" rx="6.5" ry="7.5" fill="#f0d1b0" />
      <path d="M13 18 q1 -11 7 -11 q8 0 8 11 q-1 -3.5 -3.5 -4.5 q-3.5 2.4 -7.5 1.6 q-3 .5 -4 3z" fill={c1} />
      <path d="M7 40 q2 -12 13 -12 q11 0 13 12z" fill={`url(#${uid}-g)`} opacity=".9" />
    </svg>
  );
}

function hackerSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" fill={c2} />
      <circle cx="20" cy="20" r="15" fill={c1} opacity=".35" />
      <ellipse cx="20" cy="20" rx="8" ry="9" fill="#1a1130" />
      <rect x="11" y="17" width="18" height="4" rx="1.5" fill="#0d0818" stroke="#22d3ee" strokeWidth=".6" />
      <ellipse cx="17" cy="19" rx="1" ry="1.4" fill="#22d3ee" opacity=".8" />
      <ellipse cx="23" cy="19" rx="1" ry="1.4" fill="#22d3ee" opacity=".8" />
      <path d="M14 26 q6 2 12 0 v3 q-6 3 -12 0z" fill="#1a1130" />
      <path d="M6 40 q2 -13 14 -13 q12 0 14 13z" fill={`url(#${uid}-g)`} opacity=".9" />
    </svg>
  );
}

export function Avatar({
  name,
  seed = 0,
}: {
  name: string;
  seed?: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const key = `${name}:${seed}`;
  const kind = AVATAR_KINDS[hashSeed(key) % AVATAR_KINDS.length] ?? "hood";
  const [c1, c2] =
    AVATAR_PALETTE[hashSeed(key + seed) % AVATAR_PALETTE.length] ??
    AVATAR_PALETTE[0] ?? ["#8b5cf6", "#4c1d95"];
  switch (kind) {
    case "mask":
      return maskSvg(c1, c2, uid);
    case "person":
      return personSvg(c1, c2, uid);
    case "buns":
      return bunsSvg(c1, c2, uid);
    case "hacker":
      return hackerSvg(c1, c2, uid);
    default:
      return hoodSvg(c1, c2, kind === "hood" ? "#22d3ee" : "#f43f5e", uid);
  }
}

export function TeamIcon({ name }: { name: string }) {
  const icons = [
    '<path d="M3.5 10.5 12 3l8.5 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    '<path d="M12 2.5 4.5 5.8v5.9c0 4.9 3.2 9 7.5 10.3 4.3-1.3 7.5-5.4 7.5-10.3V5.8z"/>',
    '<path d="m12 2.6 8.4 4.7v9.4L12 21.4 3.6 16.7V7.3z"/>',
    '<rect x="3" y="3" width="7" height="7" rx="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.8"/>',
    '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    '<path d="M13 2 4.5 13.5H11l-1 8.5 9-11.5h-6z"/>',
  ];
  const d = icons[hashSeed(name) % icons.length] ?? icons[0] ?? "";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="usr-team-icon-svg"
    >
      <path d={d} />
    </svg>
  );
}

export function RoleIcon({ role }: { role: string }) {
  const d = ROLE_ICON[role];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="usr-role-icon"
    >
      <path d={d} />
    </svg>
  );
}