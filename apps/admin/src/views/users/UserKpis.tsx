import type { Role, UserAdminDto } from "@ctf/shared";

import { pct } from "./format";

function G(d: string) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

function Bars({
  id,
  values,
  color,
  segmentColors,
}: {
  id: string;
  values: number[];
  color: string;
  segmentColors?: string[];
}) {
  if (segmentColors) {
    if (!values.some((v) => v > 0)) {
      return (
        <svg
          viewBox="0 0 76 26"
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%" }}
        >
          <rect x="0" y={8} width={76} height={10} rx={2} fill={color} opacity=".16" />
        </svg>
      );
    }
    const total = values.reduce((a, b) => a + b, 0);
    let acc = 0;
    return (
      <svg
        viewBox="0 0 76 26"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%" }}
      >
        {values.map((v, i) => {
          if (v <= 0) return null;
          const x = (acc / total) * 76;
          acc += v;
          const last = i === values.length - 1;
          const w = Math.max((v / total) * 76 - (last ? 0 : 1), 1.5);
          return (
            <rect
              key={i}
              x={x}
              y={5}
              width={w}
              height={16}
              rx={1.5}
              fill={segmentColors[i] ?? color}
            />
          );
        })}
      </svg>
    );
  }
  if (values.length === 0) {
    return (
      <svg
        viewBox="0 0 76 26"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%" }}
      >
        <rect x="0" y={7} width={76} height={12} rx={2} fill={color} opacity=".2" />
      </svg>
    );
  }
  const max = Math.max(...values, 0.0001);
  const n = values.length;
  const step = 76 / n;
  const bw = Math.max(3, Math.min(7, step * 0.55));
  const grad = `usrkg-${id}`;
  return (
    <svg
      viewBox="0 0 76 26"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.95" />
          <stop offset="1" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {values.map((v, i) => {
        const h = Math.max(3, (v / max) * (26 - 6));
        const x = i * step + (step - bw) / 2;
        const y = 26 - h - 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={bw}
            height={h}
            rx={1.6}
            fill={`url(#${grad})`}
          />
        );
      })}
    </svg>
  );
}

const CARDS = [
  {
    key: "total" as const,
    tone: "blue",
    icon: '<path d="M16 20.5v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.7v1.8"/><circle cx="9.5" cy="8" r="3.4"/><path d="M21 20.5v-1.8a3.6 3.6 0 0 0-2.7-3.5"/><path d="M15.5 4.7a3.6 3.6 0 0 1 0 6.7"/>',
    label: "Total Users",
  },
  {
    key: "active" as const,
    tone: "green",
    icon: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4L16 9.8"/>',
    label: "Active Users",
  },
  {
    key: "disabled" as const,
    tone: "red",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16" r=".8" fill="currentColor"/>',
    label: "Disabled Users",
  },
  {
    key: "teams" as const,
    tone: "purple",
    icon: '<path d="M16 20.5v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.7v1.8"/><circle cx="9.5" cy="8" r="3.4"/><path d="M21 20.5v-1.8a3.6 3.6 0 0 0-2.7-3.5"/><path d="M15.5 4.7a3.6 3.6 0 0 1 0 6.7"/>',
    label: "Total Teams",
  },
];

const ROLE_COLORS: Record<Role, string> = {
  USER: "#3b82f6",
  AUTHOR: "#22d3ee",
  MODERATOR: "#eab308",
  ADMIN: "#8b5cf6",
  SUPER_ADMIN: "#ec4899",
};

export interface UserKpiValues {
  total: number;
  active: number;
  disabled: number;
  teams: number;
}

export function UserKpis({
  v,
  users,
  topTeams,
}: {
  v: UserKpiValues;
  users: UserAdminDto[];
  topTeams: { id: number; name: string; memberCount: number }[];
}) {
  const roleCounts = (pred: (u: UserAdminDto) => boolean): number[] =>
    (Object.keys(ROLE_COLORS) as Role[]).map(
      (role) => users.filter((u) => u.role === role && pred(u)).length,
    );

  const GRAPH: Record<string, { values: number[]; colors?: string[]; delta: string }> = {
    total: {
      values: roleCounts(() => true),
      colors: (Object.keys(ROLE_COLORS) as Role[]).map((r) => ROLE_COLORS[r]!),
      delta: `${roleCounts(() => true).filter((n) => n > 0).length} roles in view`,
    },
    active: {
      values: roleCounts((u) => u.isActive),
      colors: (Object.keys(ROLE_COLORS) as Role[]).map((r) => ROLE_COLORS[r]!),
      delta: `${pct(v.active, v.total)} of total`,
    },
    disabled: {
      values: roleCounts((u) => !u.isActive),
      colors: (Object.keys(ROLE_COLORS) as Role[]).map((r) => ROLE_COLORS[r]!),
      delta: `${pct(v.disabled, v.total)} of total`,
    },
    teams: {
      values: topTeams.slice(0, 8).map((t) => t.memberCount),
      delta: topTeams.length > 0 ? `top teams × ${topTeams[0]?.name ?? "—"}` : "no teams",
    },
  };

  const ACCENT: Record<string, string> = {
    blue: "#60a5fa",
    green: "#22c55e",
    red: "#f87171",
    purple: "#a78bfa",
  };

  return (
    <div className="kpi-row usr-kpis">
      {CARDS.map((c) => {
        const g = GRAPH[c.key]!;
        return (
          <div key={c.key} className={`kpi usr-kpi ${c.tone}`}>
            <span
              className="kpi-icon"
              dangerouslySetInnerHTML={{ __html: G(c.icon) }}
            />
            <div className="kpi-value">
              {String(v[c.key]).length > 0
                ? Math.round(v[c.key]).toLocaleString()
                : "0"}
            </div>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-foot">
              <span className="kpi-change">{g.delta}</span>
              <span className="kpi-spark">
                <Bars
                  id={c.key}
                  values={g.values}
                  color={ACCENT[c.tone] ?? "#a78bfa"}
                  segmentColors={g.colors}
                />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}