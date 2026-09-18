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
      style={{ flex: "none", width: size, height: size }}
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
export const PENCIL = '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>';
export const COPY =
  '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8"/>';
export const BACK = '<path d="m15 18-6-6 6-6"/>';
export const FORWARD = '<path d="m9 6 6 6-6 6"/>';
export const EYE =
  '<path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/>';
export const TRASH =
  '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>';
export const CROWN = '<path d="m3 17 2-9 4.5 4L12 4l2.5 8L19 8l2 9z"/>';
export const CHECK = '<path d="m5 12 4 4L19 6"/>';
export const X = '<path d="M6 6l12 12M18 6 6 18"/>';
export const USERS =
  '<path d="M16 20.5v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.7v1.8"/><circle cx="9.5" cy="8" r="3.4"/><path d="M21 20.5v-1.8a3.6 3.6 0 0 0-2.7-3.5"/><path d="M15.5 4.7a3.6 3.6 0 0 1 0 6.7"/>';
export const FLAG =
  '<path d="M6 21V3.8"/><path d="M6 4.4h10.6l-2.1 3.6 2.1 3.6H6z"/>';
export const CLOCK = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
export const CAL =
  '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/>';
export const CODE =
  '<path d="M8 9 4.5 12 8 15M16 9l3.5 3-3.5 3M13.5 6l-3 12"/>';
export const TROPHY =
  '<path d="M7.5 4.2h9v4.6a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.6H5.2a1.9 1.9 0 0 0 1.9 3.4M16.5 5.6h2.3a1.9 1.9 0 0 1-1.9 3.4"/><path d="M12 13.3V17M9.2 20.2h5.6M10.2 17h3.6"/>';
export const HASH =
  '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>';
export const BOOK =
  '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>';
export const STAR =
  '<circle cx="12" cy="15" r="5"/><path d="m12 13.1.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>';
export const BOLT = '<path d="M13 2 4.5 13.5H11l-1 8.5 9-11.5h-6z"/>';
export const SHIELD =
  '<path d="M12 2.5 4.5 5.8v5.9c0 4.9 3.2 9 7.5 10.3 4.3-1.3 7.5-5.4 7.5-10.3V5.8z"/>';

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
  ["#fb923c", "#7c2d12"],
];

const AVATAR_KINDS = [
  "hood",
  "hoodRed",
  "person",
  "bun",
  "mask",
  "hacker",
  "astro",
  "dark",
  "turban",
  "red",
];

function Defs({ uid, c1, c2 }: { uid: string; c1: string; c2: string }) {
  return (
    <defs>
      <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c1} />
        <stop offset="100%" stopColor={c2} />
      </linearGradient>
    </defs>
  );
}

function hoodBase(c1: string, c2: string, eye: string) {
  return (
    <>
      <path d="M20 5 Q32 8 30 22 Q28 32 20 36 Q12 32 10 22 Q8 8 20 5Z" fill="#0d0818" />
      <ellipse cx="20" cy="21" rx="7" ry="9" fill="#000" />
      <circle cx="17" cy="20" r="1.4" fill={eye} />
      <circle cx="23" cy="20" r="1.4" fill={eye} />
    </>
  );
}

function hoodSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <rect width="40" height="40" fill={c2} opacity=".4" />
      <Defs uid={uid} c1={c1} c2={c2} />
      {hoodBase(c1, c2, "#22d3ee")}
      <path d="M6 40 q2 -13 14 -13 q12 0 14 13z" fill={`url(#${uid}-g)`} opacity=".9" />
    </svg>
  );
}

function hoodRedSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <rect width="40" height="40" fill={c2} opacity=".4" />
      <Defs uid={uid} c1={c1} c2={c2} />
      <path d="M20 5 Q32 8 30 22 Q28 32 20 36 Q12 32 10 22 Q8 8 20 5Z" fill="#150408" />
      <ellipse cx="20" cy="21" rx="7" ry="9" fill="#000" />
      <circle cx="17" cy="20" r="1.4" fill="#f43f5e" />
      <circle cx="23" cy="20" r="1.4" fill="#f43f5e" />
      <path d="M6 40 q2 -13 14 -13 q12 0 14 13z" fill={`url(#${uid}-g)`} opacity=".9" />
    </svg>
  );
}

function personSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <rect width="40" height="40" fill={c2} />
      <Defs uid={uid} c1={c1} c2={c2} />
      <circle cx="20" cy="20" r="16" fill={c1} opacity=".4" />
      <ellipse cx="20" cy="18" rx="7" ry="8" fill="#e9c9a6" />
      <path d="M12 17 q1 -12 8 -12 q9 0 8.5 13 q-1.5 -5 -4.5 -6 q-4 2.6 -8.5 1.8 q-3.4.6 -3.5 3.2z" fill={c1} />
      <path d="M6 40 q2 -13 14 -13 q12 0 14 13z" fill={`url(#${uid}-g)`} opacity=".9" />
    </svg>
  );
}

function bunSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <rect width="40" height="40" fill={c2} />
      <Defs uid={uid} c1={c1} c2={c2} />
      <circle cx="11" cy="12" r="4" fill={c1} />
      <circle cx="29" cy="12" r="4" fill={c1} />
      <circle cx="20" cy="20" r="16" fill={c1} opacity=".35" />
      <ellipse cx="20" cy="19" rx="6.5" ry="7.5" fill="#f0d1b0" />
      <path d="M13 18 q1 -11 7 -11 q8 0 8 11 q-1 -3.5 -3.5 -4.5 q-3.5 2.4 -7.5 1.6 q-3 .5 -4 3z" fill={c1} />
      <path d="M7 40 q2 -12 13 -12 q11 0 13 12z" fill={`url(#${uid}-g)`} opacity=".9" />
    </svg>
  );
}

function maskSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <rect width="40" height="40" fill={c2} />
      <Defs uid={uid} c1={c1} c2={c2} />
      <circle cx="20" cy="20" r="16" fill={c1} opacity=".35" />
      <ellipse cx="20" cy="20" rx="8" ry="9" fill="#e9c9a6" />
      <path d="M11 16 h18 v3 q-9 3 -18 0z" fill="#0d0818" />
      <path d="M11 16 h8 v3 q-4 1 -8 0z" fill="#22d3ee" opacity=".6" />
      <path d="M21 16 h8 v3 q-4 1 -8 0z" fill="#22d3ee" opacity=".6" />
      <path d="M6 40 q2 -13 14 -13 q12 0 14 13z" fill={`url(#${uid}-g)`} opacity=".9" />
    </svg>
  );
}

function hackerSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <rect width="40" height="40" fill={c2} />
      <Defs uid={uid} c1={c1} c2={c2} />
      <circle cx="20" cy="20" r="15" fill={c1} opacity=".35" />
      <ellipse cx="20" cy="20" rx="8" ry="9" fill="#1a1130" />
      <rect x="11" y="17" width="18" height="4" rx="1.5" fill="#0d0818" stroke="#22d3ee" strokeWidth=".6" />
      <ellipse cx="17" cy="19" rx="1" ry="1.4" fill="#22d3ee" opacity=".8" />
      <ellipse cx="23" cy="19" rx="1" ry="1.4" fill="#22d3ee" opacity=".8" />
      <path d="M6 40 q2 -13 14 -13 q12 0 14 13z" fill={`url(#${uid}-g)`} opacity=".9" />
    </svg>
  );
}

function astroSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <rect width="40" height="40" fill={c2} />
      <Defs uid={uid} c1={c1} c2={c2} />
      <circle cx="20" cy="20" r="15" fill={c1} opacity=".35" />
      <circle cx="20" cy="20" r="12" fill="#0d0818" />
      <circle cx="20" cy="20" r="9" fill="#4c1d95" opacity=".5" />
      <circle cx="20" cy="20" r="6" fill={c1} opacity=".9" />
      <ellipse cx="17" cy="17" rx="2.6" ry="3" fill="#fff" opacity=".55" />
      <path d="M6 40 q2 -10 14 -10 q12 0 14 10z" fill="#cbd5e1" />
    </svg>
  );
}

function darkSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <rect width="40" height="40" fill={c2} />
      <Defs uid={uid} c1={c1} c2={c2} />
      <circle cx="20" cy="20" r="16" fill={c1} opacity=".4" />
      <path d="M20 5 Q32 9 30 22 Q28 34 20 38 Q12 34 10 22 Q8 9 20 5Z" fill="#0d0818" />
      <ellipse cx="20" cy="20" rx="6.5" ry="8.5" fill="#000" />
      <path d="M6 40 q2 -13 14 -13 q12 0 14 13z" fill={`url(#${uid}-g)`} opacity=".9" />
    </svg>
  );
}

function turbanSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <rect width="40" height="40" fill={c2} />
      <Defs uid={uid} c1={c1} c2={c2} />
      <circle cx="20" cy="20" r="16" fill={c1} opacity=".4" />
      <ellipse cx="20" cy="20" rx="7.5" ry="8.5" fill="#e0b998" />
      <path d="M12 15 q1 -8 8 -8 q8 0 8 8 q-3.5 -3 -8 -3 q-4.5 0 -8 3z" fill={c1} />
      <path d="M6 40 q3 -13 14 -13 q11 0 14 13z" fill={`url(#${uid}-g)`} opacity=".9" />
    </svg>
  );
}

function redSvg(c1: string, c2: string, uid: string) {
  return (
    <svg viewBox="0 0 40 40">
      <rect width="40" height="40" fill="#2a0512" />
      <Defs uid={uid} c1={c1} c2={c1} />
      <circle cx="20" cy="20" r="14" fill="#7f1d1d" opacity=".5" />
      <ellipse cx="20" cy="20" rx="8" ry="9" fill="#e9c9a6" />
      <path d="M11 18 h18 q-9 5 -18 0z" fill="#0d0818" />
      <path d="M6 40 q2 -13 14 -13 q12 0 14 13z" fill="#1a0a10" />
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
    case "hoodRed":
      return hoodRedSvg(c1, c2, uid);
    case "person":
      return personSvg(c1, c2, uid);
    case "bun":
      return bunSvg(c1, c2, uid);
    case "mask":
      return maskSvg(c1, c2, uid);
    case "hacker":
      return hackerSvg(c1, c2, uid);
    case "astro":
      return astroSvg(c1, c2, uid);
    case "dark":
      return darkSvg(c1, c2, uid);
    case "turban":
      return turbanSvg(c1, c2, uid);
    case "red":
      return redSvg(c1, c2, uid);
    default:
      return hoodSvg(c1, c2, uid);
  }
}

const TEAM_BADGES = [
  '<path d="M3.5 10.5 12 3l8.5 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  '<path d="M12 2.5 4.5 5.8v5.9c0 4.9 3.2 9 7.5 10.3 4.3-1.3 7.5-5.4 7.5-10.3V5.8z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  '<path d="M12 2.5 4.5 5.8v5.9c0 4.9 3.2 9 7.5 10.3 4.3-1.3 7.5-5.4 7.5-10.3V5.8z"/><path d="M9 13V9l6 4v4"/>',
  '<path d="m12 3 10 5-10 5L2 8z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>',
  '<circle cx="12" cy="8" r="3.4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/><path d="M19 4v5M16.5 6.5h5"/>',
  '<path d="M12 3a6 6 0 0 0-6 6v3h1v3h2l1 3h4l1-3h2v-3h1V9a6 6 0 0 0-6-6z"/><circle cx="10" cy="10" r="1.4" fill="currentColor"/><circle cx="14" cy="10" r="1.4" fill="currentColor"/>',
  '<circle cx="12" cy="14" r="6"/><path d="M9 8 L8 4 M15 8 L16 4"/>',
  '<path d="M12 2.5 4.5 5.8v5.9c0 4.9 3.2 9 7.5 10.3 4.3-1.3 7.5-5.4 7.5-10.3V5.8z"/>',
  '<path d="M3 12h4l2-7 4 14 3-7h5"/>',
  '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 18v3"/><path d="M9 9l6 6M15 9l-6 6"/>',
  '<path d="M13 2 4.5 13.5H11l-1 8.5 9-11.5h-6z"/>',
  '<circle cx="12" cy="9" r="4.5"/><path d="M6.5 21a5.5 5.5 0 0 1 11 0"/>',
];

export function TeamBadge({ name, seed = 0 }: { name: string; seed?: number }) {
  const key = `${name}:${seed}`;
  const idx = hashSeed(key) % TEAM_BADGES.length;
  const d = TEAM_BADGES[idx] ?? TEAM_BADGES[0] ?? "";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="tm-badge-svg"
    >
      <g dangerouslySetInnerHTML={{ __html: d }} />
    </svg>
  );
}