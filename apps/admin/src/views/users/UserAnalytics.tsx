import type { Role, TeamAdminDto, UserAdminDto } from "@ctf/shared";

import {
  ANNOUNCE,
  AUDIT,
  CARET,
  CHEV_R,
  EXPORT,
  RESET,
  SHIELD,
  SVG,
  TeamIcon,
  USERS,
} from "./UserIcons";

export type QuickActionKey =
  | "invite"
  | "export"
  | "announce"
  | "reset"
  | "roles"
  | "audit";

const ROLE_COLORS: Record<Role, string> = {
  USER: "#3b82f6",
  AUTHOR: "#22d3ee",
  MODERATOR: "#eab308",
  ADMIN: "#8b5cf6",
  SUPER_ADMIN: "#ec4899",
};

const ROLE_LABEL: Record<Role, string> = {
  USER: "User",
  AUTHOR: "Author",
  MODERATOR: "Moderator",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export function roleCounts(
  users: UserAdminDto[],
): Record<Role, number> {
  const counts: Record<Role, number> = {
    USER: 0,
    AUTHOR: 0,
    MODERATOR: 0,
    ADMIN: 0,
    SUPER_ADMIN: 0,
  };
  for (const u of users) counts[u.role] = (counts[u.role] ?? 0) + 1;
  return counts;
}

function AnalyticsChart() {
  return (
    <div className="chart-wrap" style={{ marginTop: 12 }}>
      <svg viewBox="0 0 320 180" preserveAspectRatio="none">
        <defs>
          <linearGradient id="usr-areaPink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity=".55" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="usr-areaBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity=".55" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="chart-grid">
          <line x1="24" y1="20" x2="316" y2="20" />
          <line x1="24" y1="55" x2="316" y2="55" />
          <line x1="24" y1="90" x2="316" y2="90" />
          <line x1="24" y1="125" x2="316" y2="125" />
          <line x1="24" y1="160" x2="316" y2="160" />
        </g>
        <g className="chart-axis">
          <text x="20" y="24" textAnchor="end">200</text>
          <text x="20" y="59" textAnchor="end">150</text>
          <text x="20" y="94" textAnchor="end">100</text>
          <text x="20" y="129" textAnchor="end">50</text>
          <text x="20" y="164" textAnchor="end">0</text>
        </g>
        <g className="chart-axis">
          <text x="24" y="176" textAnchor="start">Aug 18</text>
          <text x="90" y="176" textAnchor="middle">Aug 25</text>
          <text x="155" y="176" textAnchor="middle">Sep 01</text>
          <text x="220" y="176" textAnchor="middle">Sep 08</text>
          <text x="295" y="176" textAnchor="middle">Sep 15</text>
        </g>
        <path
          className="chart-area l1"
          d="M24 155 L45 145 L66 130 L87 118 L108 122 L129 105 L150 95 L171 82 L192 90 L213 75 L234 68 L255 55 L276 62 L297 45 L316 50 L316 160 L24 160 Z"
          fill="url(#usr-areaPink)"
        />
        <path
          className="chart-line l1"
          d="M24 155 L45 145 L66 130 L87 118 L108 122 L129 105 L150 95 L171 82 L192 90 L213 75 L234 68 L255 55 L276 62 L297 45 L316 50"
        />
        <path
          className="chart-area l2"
          d="M24 130 L45 128 L66 118 L87 100 L108 105 L129 95 L150 85 L171 78 L192 82 L213 72 L234 65 L255 58 L276 60 L297 52 L316 55 L316 160 L24 160 Z"
          fill="url(#usr-areaBlue)"
        />
        <path
          className="chart-line l2"
          d="M24 130 L45 128 L66 118 L87 100 L108 105 L129 95 L150 85 L171 78 L192 82 L213 72 L234 65 L255 58 L276 60 L297 52 L316 55"
        />
        <line className="chart-tooltip-line" x1="234" y1="20" x2="234" y2="160" />
        <circle cx="234" cy="68" r="4" fill="#ec4899" stroke="#0a0a14" strokeWidth="2" />
        <circle cx="234" cy="65" r="4" fill="#60a5fa" stroke="#0a0a14" strokeWidth="2" />
        <g transform="translate(140 28)">
          <rect width="94" height="42" rx="6" fill="#0a0417" opacity=".96" stroke="#2e2e52" strokeWidth="1" />
          <text x="8" y="14" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="700" fill="#a78bfa">
            Sep 12, 2026
          </text>
          <text x="8" y="26" fontFamily="Inter, sans-serif" fontSize="8.5" fontWeight="700" fill="#ec4899">
            142 <tspan fill="#9d9db5" fontWeight="500">new users</tspan>
          </text>
          <text x="8" y="37" fontFamily="Inter, sans-serif" fontSize="8.5" fontWeight="700" fill="#60a5fa">
            98 <tspan fill="#9d9db5" fontWeight="500">active users</tspan>
          </text>
        </g>
      </svg>
    </div>
  );
}

const DONUT_R = 40;
const DONUT_C = 2 * Math.PI * DONUT_R;

function RoleDonut({ counts }: { counts: Record<Role, number> }) {
  const shown = (Object.keys(ROLE_COLORS) as Role[]).filter(
    (r) => (counts[r] ?? 0) > 0,
  );
  const total = shown.reduce((a, r) => a + (counts[r] ?? 0), 0);

  let offset = 0;
  return (
    <div className="donut-wrap">
      <div className="donut">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={DONUT_R} fill="none" stroke="#1a1a30" strokeWidth="14" />
          {shown.length === 0 ? (
            <circle
              cx="50"
              cy="50"
              r={DONUT_R}
              fill="none"
              stroke="#2a2a45"
              strokeWidth="14"
            />
          ) : (
            shown.map((role) => {
              const frac = (counts[role] ?? 0) / total;
              const len = frac * DONUT_C;
              const dash = `${len.toFixed(2)} ${DONUT_C.toFixed(2)}`;
              const before = offset;
              offset -= len;
              return (
                <circle
                  key={role}
                  cx="50"
                  cy="50"
                  r={DONUT_R}
                  fill="none"
                  stroke={ROLE_COLORS[role]}
                  strokeWidth="14"
                  strokeDasharray={dash}
                  strokeDashoffset={before.toFixed(2)}
                />
              );
            })
          )}
        </svg>
        <div className="donut-center">
          <span className="donut-value">{total.toLocaleString()}</span>
          <span className="donut-label">Users</span>
        </div>
      </div>
      <div className="donut-legend">
        {shown.map((role) => {
          const n = counts[role] ?? 0;
          return (
            <div key={role} className="legend-row">
              <span className="swatch" style={{ background: ROLE_COLORS[role] }} />
              <span className="n">{ROLE_LABEL[role]}</span>
              <span className="pct">{total > 0 ? Math.round((n / total) * 100) : 0}%</span>
              <span className="count">{n.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const QUICK_ACTIONS: {
  key: QuickActionKey;
  icon: string;
  label: string;
}[] = [
  { key: "invite", icon: USERS, label: "Invite User" },
  { key: "export", icon: EXPORT, label: "Export Users" },
  { key: "announce", icon: ANNOUNCE, label: "Send Announcement" },
  { key: "reset", icon: RESET, label: "Reset Password" },
  { key: "roles", icon: SHIELD, label: "Manage Roles" },
  { key: "audit", icon: AUDIT, label: "View Audit Log" },
];

export function UserAnalytics({
  users,
  teams,
  onQuick,
}: {
  users: UserAdminDto[];
  teams: TeamAdminDto[];
  onQuick: (action: QuickActionKey) => void;
}) {
  const counts = roleCounts(users);

  return (
    <>
      {/* Analytics */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">User Analytics</span>
          <span className="select-sm">
            Last 30 Days
            <SVG d={CARET} />
          </span>
        </div>
        <div className="chart-legend">
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: "#ec4899", boxShadow: "0 0 8px #ec4899" }} />
            New Users
          </span>
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: "#60a5fa", boxShadow: "0 0 8px #60a5fa" }} />
            Active Users
          </span>
        </div>
        <AnalyticsChart />
      </div>

      {/* Role Distribution */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Role Distribution</span>
        </div>
        <RoleDonut counts={counts} />
      </div>

      {/* Top Teams */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Top Teams by Members</span>
          <span className="panel-link" role="button" tabIndex={0}>
            View All
            <SVG d={CHEV_R} />
          </span>
        </div>
        <div className="teams-list">
          {teams.length === 0 ? (
            <div className="usr-panel-empty">No teams yet.</div>
          ) : (
            teams.slice(0, 5).map((t, i) => (
              <div key={t.id} className="team-row">
                <span className="team-rank">{i + 1}</span>
                <span className="team-icon">
                  <TeamIcon name={t.name} />
                </span>
                <span className="team-name">{t.name}</span>
                <span className="team-members">
                  {t.memberCount}
                  <small>members</small>
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Quick Actions</span>
        </div>
        <div className="qa-grid-3x2">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.key}
              className="qa-btn"
              onClick={() => onQuick(qa.key)}
            >
              <SVG d={qa.icon} />
              {qa.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}