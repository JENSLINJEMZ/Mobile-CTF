import { useId } from "react";

import type { EventCardMeta } from "./format";
import { hashSeed } from "./format";

export function eventThumbKey(event: Pick<EventCardMeta, "slug">): string {
  const scenes = ["cyferra", "winter", "sudo", "summer", "stealth"];
  return scenes[hashSeed(event.slug) % scenes.length] ?? "cyferra";
}

const ICONS: Record<string, string> = {
  stars:
    '<path d="M14 4.5l2.1 4.6 4.9.6-3.6 3.4.9 4.9-4.3-2.3-4.3 2.3.9-4.9-3.6-3.4 4.9-.6z"/><path d="M5 15l1.2 2.6 2.8.3-2 1.9.5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-1.9 2.8-.3z"/>',
  shield:
    '<path d="M12 3l7.5 3.4v4.5c0 4-1.7 7-3.9 8.7L12 22.5l-3.6-2.9C6.2 17.9 4.5 15 4.5 11V6.4z"/><path d="m4.5 6.4 7.5 3.4 7.5-3.4M12 9.8V22.5"/>',
  calendar:
    '<rect x="4" y="5.5" width="16" height="15" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/>',
  clock:
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check:
    '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4L16 9.8"/>',
  bolt:
    '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  users:
    '<path d="M16 20.5v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.7v1.8"/><circle cx="9.5" cy="8" r="3.4"/><path d="M21 20.5v-1.8a3.6 3.6 0 0 0-2.7-3.5"/><path d="M15.5 4.7a3.6 3.6 0 0 1 0 6.7"/>',
  sword:
    '<path d="M7.5 4.2h9v4.6a4.5 4.5 0 0 1-9 0z"/><path d="M12 13.3V17"/>',
  puzzle:
    '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 5 3 11.5"/>',
  key:
    '<circle cx="8" cy="14" r="4.5"/><path d="m11.5 10.5 8-8M17 5l2.5 2.5M14 8l2.5 2.5"/>',
  trophy:
    '<path d="M7 3h10v6a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M12 14v4M9 21h6M10 17h4"/>',
  wave:
    '<path d="M2 12c3-4 6-4 9 0s6 4 9 0M2 17c3-4 6-4 9 0s6 4 9 0"/>',
  lock:
    '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  who: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
};

function Defs({ uid }: { uid: string }) {
  return (
    <defs>
      <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1a0433" />
        <stop offset="55%" stopColor="#3a1173" />
        <stop offset="100%" stopColor="#0d021e" />
      </linearGradient>
      <radialGradient id={`${uid}-glow`} cx=".65" cy=".5" r=".7">
        <stop offset="0%" stopColor="#a855f7" stopOpacity=".65" />
        <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${uid}-hood`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3a1a6b" />
        <stop offset="100%" stopColor="#0d0818" />
      </linearGradient>
      <radialGradient id={`${uid}-eye`} cx=".5" cy=".5" r=".5">
        <stop offset="0%" stopColor="#22d3ee" stopOpacity=".95" />
        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

function HoodedScene({
  uid,
  title,
  mono,
}: {
  uid: string;
  title: string;
  mono?: string;
}) {
  return (
    <svg viewBox="0 0 220 172" preserveAspectRatio="xMidYMid slice">
      <Defs uid={uid} />
      <rect width="220" height="172" fill={`url(#${uid}-bg)`} />
      <rect width="220" height="172" fill={`url(#${uid}-glow)`} />
      <g fill="#c4b5fd" opacity=".55">
        <circle cx="30" cy="30" r=".8" />
        <circle cx="80" cy="22" r="1" />
        <circle cx="120" cy="40" r=".7" />
        <circle cx="55" cy="70" r=".9" />
        <circle cx="180" cy="60" r=".8" />
        <circle cx="45" cy="130" r=".8" />
        <circle cx="170" cy="150" r=".9" />
        <circle cx="20" cy="90" r=".7" />
      </g>
      <g transform="translate(115 20)">
        <path d="M0 152 Q15 90 60 88 Q105 90 120 152 Z" fill="#05020e" />
        <path d="M15 152 Q28 105 60 100 Q92 105 105 152 Z" fill={`url(#${uid}-hood)`} />
        <path d="M60 2 Q96 10 94 62 Q92 105 60 122 Q28 105 26 62 Q24 10 60 2 Z" fill="#1a0a33" />
        <path d="M60 2 Q96 10 94 62 Q92 105 60 122 Q28 105 26 62 Q24 10 60 2 Z" fill={`url(#${uid}-hood)`} opacity=".72" />
        <ellipse cx="60" cy="55" rx="19" ry="25" fill="#000" />
        <circle cx="51" cy="53" r="10" fill={`url(#${uid}-eye)`} />
        <circle cx="69" cy="53" r="10" fill={`url(#${uid}-eye)`} />
        <ellipse cx="53" cy="53" rx="2.4" ry="1.6" fill="#22d3ee" />
        <ellipse cx="67" cy="53" rx="2.4" ry="1.6" fill="#22d3ee" />
      </g>
      <text
        x="14"
        y="72"
        fontFamily="Playfair Display, serif"
        fontStyle="italic"
        fontWeight="900"
        fontSize="22"
        fill="#c4b5fd"
        letterSpacing="-.8"
      >
        {title}
      </text>
      {mono ? (
        <text
          x="14"
          y="118"
          fontFamily="JetBrains Mono, monospace"
          fontSize="8"
          fill="#94a3b8"
          fontWeight="600"
          letterSpacing="1.2"
        >
          {mono}
        </text>
      ) : null}
      <g textAnchor="end">
        <text x="200" y="40" fontFamily="Caveat, cursive" fontWeight="700" fontSize="13" fill="#e9d5ff">
          HACK
        </text>
        <text x="200" y="56" fontFamily="Caveat, cursive" fontWeight="700" fontSize="13" fill="#e9d5ff">
          LEARN
        </text>
        <text x="200" y="72" fontFamily="Caveat, cursive" fontWeight="700" fontSize="13" fill="#e9d5ff">
          COMPETE
        </text>
        <text x="200" y="88" fontFamily="Caveat, cursive" fontWeight="700" fontSize="13" fill="#e9d5ff">
          CONNECT
        </text>
      </g>
    </svg>
  );
}

export function EventThumb({
  event,
  variant = "card",
}: {
  event: Pick<EventCardMeta, "slug" | "title">;
  variant?: "card" | "hero";
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const scene = eventThumbKey(event);
  if (variant === "hero") {
    return (
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
        <Defs uid={uid} />
        <rect width="400" height="200" fill={`url(#${uid}-bg)`} />
        <rect width="400" height="200" fill={`url(#${uid}-glow)`} />
        <g fill="#c4b5fd" opacity=".6">
          <circle cx="30" cy="40" r="1" />
          <circle cx="90" cy="25" r="1.2" />
          <circle cx="150" cy="55" r=".9" />
          <circle cx="240" cy="30" r="1.1" />
          <circle cx="320" cy="45" r="1" />
          <circle cx="60" cy="120" r="1" />
          <circle cx="200" cy="150" r="1.2" />
          <circle cx="360" cy="130" r=".9" />
        </g>
        <g transform="translate(230 15)">
          <path d="M0 185 Q18 110 70 108 Q122 110 140 185 Z" fill="#0a0417" />
          <path d="M15 185 Q30 130 70 125 Q110 130 125 185 Z" fill={`url(#${uid}-hood)`} />
          <path d="M70 5 Q112 14 110 70 Q108 130 70 148 Q32 130 30 70 Q28 14 70 5 Z" fill="#1a0a33" />
          <path d="M70 5 Q112 14 110 70 Q108 130 70 148 Q32 130 30 70 Q28 14 70 5 Z" fill={`url(#${uid}-hood)`} opacity=".75" />
          <ellipse cx="70" cy="65" rx="22" ry="30" fill="#000" />
          <circle cx="60" cy="62" r="12" fill={`url(#${uid}-eye)`} />
          <circle cx="80" cy="62" r="12" fill={`url(#${uid}-eye)`} />
          <ellipse cx="63" cy="62" rx="3" ry="2" fill="#22d3ee" />
          <ellipse cx="77" cy="62" rx="3" ry="2" fill="#22d3ee" />
        </g>
        <text
          x="30"
          y="92"
          fontFamily="Playfair Display, serif"
          fontStyle="italic"
          fontWeight="900"
          fontSize="30"
          fill="#c4b5fd"
          letterSpacing="-1"
        >
          {event.title.split(" ").slice(0, 2).join(" ").toUpperCase() || "EVENT"}
        </text>
        <text
          x="30"
          y="128"
          fontFamily="JetBrains Mono, monospace"
          fontSize="10"
          fill="#c4b5fd"
          fontWeight="600"
          letterSpacing="1"
        >
          SECURE · BUILD · EXPLOIT
        </text>
        <text x="390" y="50" fontFamily="Caveat, cursive" fontWeight="700" fontSize="14" fill="#e9d5ff" textAnchor="end">
          HACK
        </text>
        <text x="390" y="68" fontFamily="Caveat, cursive" fontWeight="700" fontSize="14" fill="#e9d5ff" textAnchor="end">
          LEARN
        </text>
        <text x="390" y="86" fontFamily="Caveat, cursive" fontWeight="700" fontSize="14" fill="#e9d5ff" textAnchor="end">
          CONNECT
        </text>
      </svg>
    );
  }

  switch (scene) {
    case "winter":
      return (
        <svg viewBox="0 0 220 172" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c1230" />
              <stop offset="45%" stopColor="#1c2652" />
              <stop offset="100%" stopColor="#0a0e1e" />
            </linearGradient>
            <linearGradient id={`${uid}-mtn1`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8eef8" />
              <stop offset="70%" stopColor="#8892ae" />
              <stop offset="100%" stopColor="#2a3350" />
            </linearGradient>
            <linearGradient id={`${uid}-mtn2`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c2cde1" />
              <stop offset="100%" stopColor="#1e2740" />
            </linearGradient>
          </defs>
          <rect width="220" height="172" fill={`url(#${uid}-sky)`} />
          <g fill="#fff" opacity=".75">
            <circle cx="20" cy="20" r=".8" />
            <circle cx="60" cy="15" r="1" />
            <circle cx="100" cy="30" r=".7" />
            <circle cx="150" cy="18" r=".9" />
            <circle cx="190" cy="35" r=".8" />
            <circle cx="40" cy="48" r=".7" />
            <circle cx="170" cy="58" r=".8" />
            <circle cx="110" cy="12" r=".6" />
          </g>
          <path d="M0 128 L40 72 L78 100 L112 58 L158 92 L198 62 L220 82 L220 172 L0 172 Z" fill={`url(#${uid}-mtn2)`} opacity=".75" />
          <path d="M0 155 L32 102 L58 118 L92 78 L124 105 L158 68 L188 92 L220 72 L220 172 L0 172 Z" fill={`url(#${uid}-mtn1)`} />
          <path d="M92 78 L124 105 L113 105 L92 92 Z" fill="#fff" opacity=".95" />
          <path d="M158 68 L188 92 L175 92 L158 80 Z" fill="#fff" opacity=".95" />
          <text x="14" y="42" fontFamily="Playfair Display, serif" fontStyle="italic" fontWeight="900" fontSize="15" fill="#fff" letterSpacing="-.2">
            WINTER
          </text>
          <text x="14" y="60" fontFamily="Playfair Display, serif" fontStyle="italic" fontWeight="900" fontSize="15" fill="#fff" letterSpacing="-.2">
            HACKFEST
          </text>
        </svg>
      );
    case "sudo":
      return (
        <svg viewBox="0 0 220 172" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a0512" />
              <stop offset="50%" stopColor="#5a0a1e" />
              <stop offset="100%" stopColor="#0a0410" />
            </linearGradient>
            <radialGradient id={`${uid}-glow`} cx=".5" cy=".4" r=".65">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity=".55" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="220" height="172" fill={`url(#${uid}-bg)`} />
          <rect width="220" height="172" fill={`url(#${uid}-glow)`} />
          <g fill="#0a0410">
            <rect x="0" y="110" width="18" height="62" />
            <rect x="20" y="92" width="24" height="80" />
            <rect x="46" y="102" width="18" height="70" />
            <rect x="66" y="78" width="28" height="94" />
            <rect x="96" y="100" width="20" height="72" />
            <rect x="118" y="82" width="26" height="90" />
            <rect x="146" y="102" width="22" height="70" />
            <rect x="170" y="88" width="24" height="84" />
            <rect x="196" y="100" width="18" height="72" />
            <rect x="216" y="115" width="6" height="57" />
          </g>
          <g fill="#f43f5e" opacity=".8">
            <rect x="25" y="100" width="3" height="4" />
            <rect x="32" y="100" width="3" height="4" />
            <rect x="25" y="112" width="3" height="4" />
            <rect x="35" y="112" width="3" height="4" />
            <rect x="72" y="88" width="3" height="4" />
            <rect x="80" y="88" width="3" height="4" />
            <rect x="72" y="100" width="3" height="4" />
            <rect x="84" y="100" width="3" height="4" />
            <rect x="72" y="112" width="3" height="4" />
            <rect x="80" y="112" width="3" height="4" />
            <rect x="123" y="94" width="3" height="4" />
            <rect x="132" y="94" width="3" height="4" />
            <rect x="123" y="106" width="3" height="4" />
            <rect x="135" y="106" width="3" height="4" />
            <rect x="175" y="98" width="3" height="4" />
            <rect x="184" y="98" width="3" height="4" />
            <rect x="175" y="110" width="3" height="4" />
            <rect x="184" y="110" width="3" height="4" />
          </g>
          <text x="14" y="42" fontFamily="Playfair Display, serif" fontStyle="italic" fontWeight="900" fontSize="14" fill="#fff" letterSpacing="-.2">
            SUDO SOCIETY
          </text>
          <text x="14" y="60" fontFamily="Playfair Display, serif" fontStyle="italic" fontWeight="900" fontSize="14" fill="#fff" letterSpacing="-.2">
            LAUNCH CTF
          </text>
        </svg>
      );
    case "summer":
      return (
        <svg viewBox="0 0 220 172" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e3524" />
              <stop offset="50%" stopColor="#1a5c38" />
              <stop offset="100%" stopColor="#07201a" />
            </linearGradient>
            <linearGradient id={`${uid}-sun`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <rect width="220" height="172" fill={`url(#${uid}-sky)`} />
          <circle cx="182" cy="42" r="32" fill="#fbbf24" opacity=".28" />
          <circle cx="182" cy="42" r="18" fill={`url(#${uid}-sun)`} opacity=".9" />
          <path d="M0 132 Q55 122 110 132 T220 132 L220 172 L0 172 Z" fill="#061810" opacity=".9" />
          <g fill="#03120a">
            <path d="M30 165 Q28 120 25 100 Q18 96 8 100 Q22 86 26 100 Q30 84 42 88 Q30 95 30 104 Q40 100 52 106 Q36 105 30 112 Q35 130 30 165 Z" />
            <path d="M62 168 Q58 130 56 115 Q50 110 42 116 Q54 104 56 116 Q62 100 72 105 Q62 110 62 118 Q72 112 80 118 Q66 118 62 126 Q65 140 62 168 Z" />
          </g>
          <g fill="#03120a">
            <path d="M148 168 Q152 128 158 126 Q164 128 168 168 Z" />
            <path d="M158 116 Q166 116 164 138 Q162 148 158 150 Q154 148 152 138 Q150 116 158 116 Z" />
          </g>
          <text x="14" y="42" fontFamily="Playfair Display, serif" fontStyle="italic" fontWeight="900" fontSize="16" fill="#fff" letterSpacing="-.3">
            SUMMER
          </text>
          <text x="14" y="62" fontFamily="Playfair Display, serif" fontStyle="italic" fontWeight="900" fontSize="16" fill="#fcd34d" letterSpacing="-.3">
            BUG HUNT
          </text>
        </svg>
      );
    case "stealth":
      return (
        <svg viewBox="0 0 220 172" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a0a14" />
              <stop offset="100%" stopColor="#050510" />
            </linearGradient>
          </defs>
          <rect width="220" height="172" fill={`url(#${uid}-bg)`} />
          <g stroke="#2e2e52" strokeWidth=".4" opacity=".35">
            <line x1="0" y1="30" x2="220" y2="30" />
            <line x1="0" y1="60" x2="220" y2="60" />
            <line x1="0" y1="90" x2="220" y2="90" />
            <line x1="0" y1="120" x2="220" y2="120" />
            <line x1="0" y1="150" x2="220" y2="150" />
          </g>
          <g transform="translate(85 28)">
            <rect x="0" y="0" width="52" height="80" rx="4" fill="#0f0f1a" stroke="#3a3a52" strokeWidth="1" />
            <rect x="7" y="12" width="38" height="3" fill="#2e2e52" rx="1" />
            <rect x="7" y="22" width="26" height="3" fill="#2e2e52" rx="1" />
            <rect x="7" y="32" width="34" height="3" fill="#2e2e52" rx="1" />
            <rect x="7" y="42" width="22" height="3" fill="#2e2e52" rx="1" />
            <rect x="7" y="52" width="30" height="3" fill="#2e2e52" rx="1" />
            <circle cx="40" cy="64" r="9" fill="#8b5cf6" opacity=".18" stroke="#8b5cf6" strokeWidth="1" />
            <circle cx="40" cy="64" r="3.5" fill="#a78bfa" />
          </g>
          <g transform="translate(24 130) rotate(-12)">
            <rect x="0" y="0" width="90" height="18" rx="2" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity=".7" />
            <text x="45" y="13" fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="800" fill="#ef4444" textAnchor="middle" letterSpacing="2" opacity=".9">
              CLASSIFIED
            </text>
          </g>
          <text x="14" y="42" fontFamily="Playfair Display, serif" fontStyle="italic" fontWeight="900" fontSize="16" fill="#fff" letterSpacing="-.3">
            STEALTH OPS
          </text>
        </svg>
      );
    default:
      return <HoodedScene uid={uid} title={event.slug.replace(/[-_]/g, " ").toUpperCase().slice(0, 16) || "CTF"} />;
  }
}

export function EventIcon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONS[name] ?? ICONS.stars!} />
    </svg>
  );
}

export const QUILL = '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>';
export const CHEV_R = '<path d="M5 12h13"/><path d="m13 6 6 6-6 6"/>';
export const PLUS = '<path d="M12 5v14M5 12h14"/>';
export const SEARCH = '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-3.6-3.6"/>';
export const SLIDERS = '<path d="M3 5h18M6 12h12M10 19h4"/>';
export const CARET = '<path d="m6 9 6 6 6-6"/>';
export const KEBAB = '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>';

export function SVG({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}