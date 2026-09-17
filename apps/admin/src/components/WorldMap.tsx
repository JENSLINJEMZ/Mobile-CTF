import type { UserAdminDto } from "@ctf/shared";
import { useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "../icons";

const VB_W = 320;
const VB_H = 170;

const CITIES: Array<{
  name: string;
  country: string;
  flag: string;
  lon: number;
  lat: number;
}> = [
  { name: "San Francisco", country: "USA", flag: "🇺🇸", lon: -122.4, lat: 37.77 },
  { name: "New York", country: "USA", flag: "🇺🇸", lon: -74.0, lat: 40.71 },
  { name: "London", country: "UK", flag: "🇬🇧", lon: -0.13, lat: 51.51 },
  { name: "Paris", country: "France", flag: "🇫🇷", lon: 2.35, lat: 48.85 },
  { name: "Berlin", country: "Germany", flag: "🇩🇪", lon: 13.4, lat: 52.52 },
  { name: "Stockholm", country: "Sweden", flag: "🇸🇪", lon: 18.07, lat: 59.33 },
  { name: "Warsaw", country: "Poland", flag: "🇵🇱", lon: 21.01, lat: 52.23 },
  { name: "Moscow", country: "Russia", flag: "🇷🇺", lon: 37.62, lat: 55.75 },
  { name: "Cairo", country: "Egypt", flag: "🇪🇬", lon: 31.24, lat: 30.05 },
  { name: "Mumbai", country: "India", flag: "🇮🇳", lon: 72.88, lat: 19.08 },
  { name: "Bengaluru", country: "India", flag: "🇮🇳", lon: 77.59, lat: 12.97 },
  { name: "Singapore", country: "Singapore", flag: "🇸🇬", lon: 103.82, lat: 1.35 },
  { name: "Jakarta", country: "Indonesia", flag: "🇮🇩", lon: 106.85, lat: -6.21 },
  { name: "Bangkok", country: "Thailand", flag: "🇹🇭", lon: 100.5, lat: 13.76 },
  { name: "Tokyo", country: "Japan", flag: "🇯🇵", lon: 139.69, lat: 35.68 },
  { name: "Seoul", country: "South Korea", flag: "🇰🇷", lon: 126.98, lat: 37.57 },
  { name: "Dubai", country: "UAE", flag: "🇦🇪", lon: 55.27, lat: 25.2 },
  { name: "Sydney", country: "Australia", flag: "🇦🇺", lon: 151.21, lat: -33.87 },
  { name: "Lagos", country: "Nigeria", flag: "🇳🇬", lon: 3.38, lat: 6.52 },
  { name: "Johannesburg", country: "South Africa", flag: "🇿🇦", lon: 28.05, lat: -26.2 },
  { name: "Sao Paulo", country: "Brazil", flag: "🇧🇷", lon: -46.63, lat: -23.55 },
  { name: "Mexico City", country: "Mexico", flag: "🇲🇽", lon: -99.13, lat: 19.43 },
  { name: "Bogota", country: "Colombia", flag: "🇨🇴", lon: -74.07, lat: 4.71 },
  { name: "Toronto", country: "Canada", flag: "🇨🇦", lon: -79.38, lat: 43.65 },
];

const BANDS: Record<string, number[][]> = {
  75: [[-70, -20], [-160, -95], [60, 180]],
  70: [[-160, -62], [-52, -20], [10, 180]],
  65: [[-165, -60], [-50, -20], [5, 180]],
  60: [[-165, -60], [-45, -25], [-10, 180]],
  55: [[-135, -58], [-8, 140]],
  50: [[-130, -58], [-10, 142]],
  45: [[-125, -62], [-5, 145]],
  40: [[-125, -70], [-10, 60], [70, 145]],
  35: [[-120, -75], [-10, 60], [70, 140]],
  30: [[-115, -80], [-10, 60], [65, 125]],
  25: [[-110, -80], [-15, 55], [65, 120]],
  20: [[-105, -85], [-18, 50], [70, 110]],
  15: [[-95, -85], [-18, 50], [73, 105]],
  10: [[-85, -77], [-15, 48], [75, 100], [118, 127]],
  5: [[-80, -72], [-10, 45], [95, 120]],
  0: [[-80, -50], [8, 42], [100, 120]],
  "-5": [[-78, -35], [10, 40], [100, 135]],
  "-10": [[-77, -35], [12, 40], [105, 140]],
  "-15": [[-73, -35], [12, 40], [120, 146]],
  "-20": [[-70, -38], [13, 40], [113, 150]],
  "-25": [[-70, -42], [15, 33], [113, 152]],
  "-30": [[-72, -50], [16, 32], [115, 152]],
  "-35": [[-73, -55], [18, 28], [115, 150]],
  "-40": [[-73, -62], [170, 178]],
  "-45": [[-74, -66]],
  "-50": [[-74, -68]],
};

const HOT: Array<[number, number, string]> = [
  [-98, 39, "#a855f7"],
  [10, 51, "#8b5cf6"],
  [-2, 54, "#8b5cf6"],
  [103, 1, "#22d3ee"],
  [-47, -15, "#ec4899"],
  [135, -25, "#22d3ee"],
  [139, 36, "#a855f7"],
  [31, 30, "#8b5cf6"],
  [-79, 44, "#a855f7"],
  [28, -26, "#ec4899"],
];

export function project(lon: number, lat: number): [number, number] {
  return [((lon + 180) / 360) * VB_W, ((78 - lat) / 133) * VB_H];
}

export interface ParticipantPin {
  user: UserAdminDto;
  city: (typeof CITIES)[number];
  lon: number;
  lat: number;
  x: number;
  y: number;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function placeParticipants(users: UserAdminDto[]): ParticipantPin[] {
  return users
    .filter((u) => u.isActive)
    .map((u) => {
      const h = hashStr(u.username ?? u.email);
      const city = CITIES[h % CITIES.length]!;
      const jx = (((h >>> 8) % 15) - 7) * 0.45;
      const jy = (((h >>> 13) % 11) - 5) * 0.45;
      const lon = city.lon + jx;
      const lat = city.lat + jy;
      const [x, y] = project(lon, lat);
      return { user: u, city, lon, lat, x, y };
    });
}

function roleColor(role: string): string {
  switch (role.toLowerCase()) {
    case "root":
    case "admin":
      return "#f5a524";
    case "mentor":
    case "moderator":
    case "editor":
      return "#22d3ee";
    case "bot":
    case "guest":
      return "#8b86a8";
    default:
      return "#4ade80";
  }
}

interface View {
  x: number;
  y: number;
  w: number;
}

const MIN_W = VB_W / 8;
const MAX_W = VB_W / 0.85;

function clampView(next: View): View {
  let x = next.x;
  let y = next.y;
  const w = Math.max(MIN_W, Math.min(MAX_W, next.w));
  const h = w * (VB_H / VB_W);
  if (w >= VB_W) x = (VB_W - w) / 2;
  else x = Math.max(0, Math.min(VB_W - w, x));
  if (h >= VB_H) y = (VB_H - h) / 2;
  else y = Math.max(0, Math.min(VB_H - h, y));
  return { x, y, w };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WorldMap({ users }: { users: UserAdminDto[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(() => clampView({ x: 105, y: 28, w: 168 }));
  const [sel, setSel] = useState<ParticipantPin | null>(null);
  const drag = useRef<{ px: number; py: number; vx: number; vy: number; moved: boolean } | null>(null);

  const pins = useMemo(() => placeParticipants(users), [users]);

  const world = useMemo(() => {
    let s = "";
    Object.keys(BANDS).forEach((k) => {
      const lat = +k;
      BANDS[k]!.forEach((pair) => {
        for (let lon = pair[0]!; lon <= pair[1]!; lon += 3.6) {
          const [x, y] = project(lon, lat);
          s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.05" fill="#3a2f6b"/>`;
        }
      });
    });
    HOT.forEach(([lon, lat, c]) => {
      const [x, y] = project(lon, lat);
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.8" fill="${c}" opacity=".13"/>`;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" fill="${c}"/>`;
    });
    return s;
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setView((v) => clampView({ x: v.x, y: v.y, w: v.w || 168 }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stageMetrics = () => {
    const rect = stageRef.current!.getBoundingClientRect();
    const scale = Math.min(rect.width / VB_W, rect.height / VB_H);
    const pw = VB_W * scale;
    const ph = VB_H * scale;
    return { rect, pw, ph, ox: (rect.width - pw) / 2, oy: (rect.height - ph) / 2 };
  };

  const toViewCoords = (clientX: number, clientY: number) => {
    const m = stageMetrics();
    const px = clientX - m.rect.left - m.ox;
    const py = clientY - m.rect.top - m.oy;
    return {
      vx: view.x + (px / m.pw) * view.w,
      vy: view.y + (py / m.ph) * view.w * (VB_H / VB_W),
    };
  };

  const onWheel = (e: React.WheelEvent) => {
    const { vx, vy } = toViewCoords(e.clientX, e.clientY);
    const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setView((v) => {
      const w = Math.max(MIN_W, Math.min(MAX_W, v.w * f));
      const x = vx - ((vx - v.x) / v.w) * w;
      const y = vy - ((vy - v.y) / (v.w * (VB_H / VB_W))) * (w * (VB_H / VB_W));
      return clampView({ x, y, w });
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { px: e.clientX, py: e.clientY, vx: view.x, vy: view.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const m = stageMetrics();
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    setView((v) =>
      clampView({
        x: d.vx - (dx / m.pw) * v.w,
        y: d.vy - (dy / m.ph) * v.w * (VB_H / VB_W),
        w: v.w,
      }),
    );
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) setSel(null);
    if (stageRef.current?.hasPointerCapture(e.pointerId)) {
      stageRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const zoomAt = (f: number) => {
    const rect = stageRef.current!.getBoundingClientRect();
    const cx = view.x + (rect.width / 2 / Math.max(rect.width, 1)) * view.w;
    const cy = view.y + (rect.height / 2 / Math.max(rect.height, 1)) * view.w * (VB_H / VB_W);
    setView((v) => {
      const w = Math.max(MIN_W, Math.min(MAX_W, v.w * f));
      return clampView({
        x: cx - ((cx - v.x) / v.w) * w,
        y: cy - ((cy - v.y) / (v.w * (VB_H / VB_W))) * (w * (VB_H / VB_W)),
        w,
      });
    });
  };

  const reset = () =>
    setView(clampView({ x: 0, y: 0, w: VB_W }));

  const pinR = view.w / 80;

  return (
    <div className="map-modal-body">
      <div className="map-tools">
        <div className="map-tools-group">
          <button className="map-btn" onClick={() => zoomAt(1.35)} aria-label="Zoom in">
            <Icon name="plus" />
          </button>
          <button className="map-btn" onClick={() => zoomAt(1 / 1.35)} aria-label="Zoom out">
            <Icon name="minus" />
          </button>
          <button className="map-btn" onClick={reset} aria-label="Reset view">
            <Icon name="move" />
          </button>
        </div>
        <span className="map-cap">
          {pins.length} participant{pins.length === 1 ? "" : "s"} · scroll to zoom · drag to move
        </span>
      </div>

      <div
        className="map-stage"
        ref={stageRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => (drag.current = null)}
      >
        <svg
          viewBox={`${view.x} ${view.y} ${view.w} ${view.w * (VB_H / VB_W)}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
        >
          <g dangerouslySetInnerHTML={{ __html: world }} />
          {pins.map((p) => {
            const c = roleColor(p.user.role);
            const selected = sel?.user.id === p.user.id;
            const s = (pins.length >= 60 ? 0.8 : 1) * pinR;
            return (
              <g
                key={p.user.id}
                transform={`translate(${p.x} ${p.y})`}
                className="map-pin"
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  drag.current = null;
                  setSel(selected ? null : p);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <circle r={s * 3.2} fill={c} opacity="0.16" />
                <circle r={s} fill={c} />
                <circle r={s * 2.1} fill="none" stroke={c} strokeWidth="1" opacity={selected ? 1 : 0.4}>
                  <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.4s" repeatCount="indefinite" />
                </circle>
                {selected ? (
                  <text
                    x={s + 3}
                    y={s * 0.9}
                    fill="#e9e6f7"
                    fontSize="6"
                    fontWeight="600"
                    style={{ paintOrder: "stroke" }}
                    stroke="#07050f"
                    strokeWidth="1"
                  >
                    {p.user.username}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {sel ? (
          <div className="map-detail">
            <div className="map-detail-head">
              <span className="map-avatar" style={{ background: `${roleColor(sel.user.role)}2e`, color: roleColor(sel.user.role) }}>
                {(sel.user.username ?? "?").slice(0, 2).toUpperCase()}
              </span>
              <span>
                <b>{sel.user.username}</b>
                <small>
                  {sel.city.flag} {sel.city.name}, {sel.city.country}
                </small>
              </span>
            </div>
            <div className="map-detail-grid">
              <span>
                <small>Role</small>
                <b className="cap">{sel.user.role}</b>
              </span>
              <span>
                <small>Solves</small>
                <b>{sel.user.solveCount}</b>
              </span>
              <span>
                <small>Score</small>
                <b>{sel.user.totalScore.toLocaleString()}</b>
              </span>
              <span>
                <small>Status</small>
                <b className={sel.user.isActive ? "ok" : "down"}>{sel.user.isActive ? "Active" : "Inactive"}</b>
              </span>
              <span>
                <small>Joined</small>
                <b>{fmtDate(sel.user.createdAt)}</b>
              </span>
              <span>
                <small>Last login</small>
                <b>{fmtDate(sel.user.lastLoginAt)}</b>
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}