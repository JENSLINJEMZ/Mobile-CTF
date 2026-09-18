import type { CSSProperties } from "react";

/** Small inline action/brand icons used across the sandbox views. */
export function Svg({
  d,
  size = 14,
  fill = false,
  style,
}: {
  d: string;
  size?: number;
  fill?: boolean;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, flex: "none", ...style }}
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}

export const D_TERMINAL =
  '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>';
export const D_MONITOR =
  '<rect x="2" y="3" width="20" height="14" rx="2.5"/><path d="M8 21h8"/><path d="M12 17v4"/>';
export const D_DOTS_V =
  '<circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/>';
export const D_STOP = '<rect x="5" y="5" width="14" height="14" rx="2.4"/>';
export const D_CLOCK = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
export const D_SEARCH = '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-3.6-3.6"/>';
export const D_CHEV = '<path d="m6 9 6 6 6-6"/>';
export const D_BREAD = '<path d="m9 6 6 6-6 6"/>';
export const D_ARROW = '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>';
export const D_DRIVE =
  '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>';
export const D_CPU =
  '<rect x="7" y="7" width="10" height="10" rx="2.4"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/>';
export const D_MEM =
  '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M7 10h4M7 14h2"/>';
export const D_USERS =
  '<path d="M16 20.5v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.7v1.8"/><circle cx="9.5" cy="8" r="3.4"/><path d="M21 20.5v-1.8a3.6 3.6 0 0 0-2.7-3.5"/><path d="M15.5 4.7a3.6 3.6 0 0 1 0 6.7"/>';
export const D_NET =
  '<path d="M12 12h13M6 12h1"/><rect x="2.5" y="12" width="5" height="5" rx="1.5"/><rect x="16.5" y="12" width="5" height="5" rx="1.5"/><path d="M5 7V4.5M5 4.5h5.5M5 4.5 8.2 1.3M5 4.5 7.8 7.7"/>';
export const D_ISOLATE =
  '<rect x="3" y="11" width="18" height="10" rx="2.5"/><path d="M7 11V7a5 5 0 0 1 8-4.2"/><circle cx="12" cy="16" r="2"/>';
export const D_LOCK =
  '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>';
export const D_BOX =
  '<path d="m12 2.6 8.4 4.7v9.4L12 21.4 3.6 16.7V7.3z"/><path d="m3.6 7.3 8.4 4.7 8.4-4.7M12 12v9.4"/>';
export const D_REFRESH = '<path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/>';
export const D_FILTER = '<path d="M3 5h18M6 12h12M10 19h4"/>';
export const D_DOC =
  '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>';
export const D_SETTINGS =
  '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0V21a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4H21a1.6 1.6 0 0 0-1.5 1z"/>';