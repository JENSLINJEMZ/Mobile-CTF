import type { CSSProperties } from "react";

const P = (d: string, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

export const I: Record<string, string> = {
  dashboard: P(
    '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>',
  ),
  flag: P('<path d="M5 21V4M5 4h11l-2 3 2 3H5"/>'),
  calendar: P(
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  ),
  user: P(
    '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0115 0"/>',
  ),
  users: P(
    '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0112 0"/><path d="M16 5.5a3.2 3.2 0 010 6M17.5 20a6 6 0 00-1.8-4.3"/>',
  ),
  inbox: P(
    '<path d="M3 13l2.2-7A2 2 0 017.1 5h9.8a2 2 0 011.9 1L21 13v5a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M3 13h5l1 2h6l1-2h5"/>',
  ),
  mega: P(
    '<path d="M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1z"/><path d="M15.5 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12"/>',
  ),
  chart: P(
    '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  ),
  box: P(
    '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  ),
  folder: P(
    '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  ),
  award: P(
    '<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 21l5-2.5L17 21l-1.5-7.5"/>',
  ),
  card: P(
    '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',
  ),
  gear: P(
    '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7"/>',
  ),
  list: P(
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  ),
  trend: P(
    '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  ),
  up: P('<path d="M12 19V5M5 12l7-7 7 7"/>', 'stroke-width="2.4"'),
  server: P(
    '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  ),
  db: P(
    '<ellipse cx="12" cy="6" rx="8" ry="3.2"/><path d="M4 6v12c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2V6"/><path d="M4 12c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2"/>',
  ),
  redis: P(
    '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/>',
  ),
  docker: P(
    '<rect x="3" y="11" width="18" height="6" rx="1.5"/><path d="M7 11V8h3v3M12 11V8h3v3M10 8V5h3v3"/>',
  ),
  hdd: P(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h3"/>',
  ),
  sandbox: P(
    '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  ),
  proxy: P(
    '<circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="M8.4 11L15.6 7M8.4 13l7.2 4"/>',
  ),
  mail: P(
    '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M3 7l9 6 9-6"/>',
  ),
  plusflag: P(
    '<path d="M5 21V4h12l-2 3 2 3H5"/><path d="M15 16h5M17.5 13.5v5" stroke-width="2"/>',
  ),
  spawn: P(
    '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 9v6M9 12h6"/>',
  ),
  check: P('<path d="M20 6L9 17l-5-5"/>', 'stroke-width="2.4"'),
  globe: P(
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>',
  ),
  cap: P(
    '<path d="M2.5 8.5L12 4l9.5 4.5L12 13 2.5 8.5z"/><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>',
  ),
  crown: P(
    '<path d="M3 17l1.5-9 4.5 4L12 5l3 7 4.5-4L21 17z"/><path d="M3 20h18"/>',
  ),
  export: P(
    '<path d="M12 15V4M8 8l4-4 4 4"/><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"/>',
  ),
  eye: P(
    '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>',
  ),
  usercog: P(
    '<circle cx="10" cy="8" r="3.4"/><path d="M3.5 20a6.5 6.5 0 019.5-5.8"/><circle cx="18" cy="17" r="2.4"/><path d="M18 13.6v1M18 20.4v1M14.6 17h1M20.4 17h1"/>',
  ),
  bolt: P('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  target: P(
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  ),
  close: P('<path d="M18 6L6 18M6 6l12 12"/>', 'stroke-width="2.2"'),
  bell: P(
    '<path d="M18 8a6 6 0 10-12 0c0 7-2 8-2 8h16s-2-1-2-8"/><path d="M10.3 21a2 2 0 003.4 0"/>',
  ),
  sun: P(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  ),
  menu: P('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  arrow: P(
    '<path d="M5 12h13M13 6l6 6-6 6"/>',
    'stroke-width="2.2"',
  ),
  plus: P('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.2"'),
  minus: P('<path d="M5 12h14"/>', 'stroke-width="2.2"'),
  move: P(
    '<path d="M12 3v18M3 12h18M6 15l-3-3 3-3M18 15l3-3-3-3M15 6l-3-3-3 3M15 18l-3 3-3-3"/>',
    'stroke-width="1.9"',
  ),
};

export function Icon({
  name,
  style,
  className,
}: {
  name: string;
  style?: CSSProperties;
  className?: string;
}) {
  const html = I[name];
  if (!html) return null;
  return (
    <span
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}