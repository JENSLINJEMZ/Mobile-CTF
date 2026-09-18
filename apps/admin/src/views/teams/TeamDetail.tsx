import type { TeamAdminDetailDto, TeamAdminDto } from "@ctf/shared";
import { useRef } from "react";

import { chartLabel, joinedDate, pointsFmt, relativeTime } from "./format";
import {
  Avatar,
  CAL,
  CARET,
  CHEV_R,
  CROWN,
  EYE,
  FLAG,
  KEBAB,
  PENCIL,
  SVG,
  USERS,
} from "./TeamIcons";

function shortNum(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, "")}K`;
  }
  return String(n);
}

function monthDay(iso: string): string {
  return joinedDate(iso).replace(/,\s*\d{4}$/, "");
}

function SeriesPath(values: number[], maxV: number): {
  line: string;
  lastX: number;
} {
  const n = values.length;
  const span = n > 1 ? 302 / (n - 1) : 0;
  const pts = values.map((v, i) => {
    const x = n > 1 ? 30 + i * span : 180;
    const y = 20 + 140 * (1 - Math.max(0, v) / maxV);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return { line: pts.join(" "), lastX: n > 1 ? 30 + (n - 1) * span : 180 };
}

const GRID_Y = [20, 55, 90, 125, 160];

function PerformanceChart({ detail }: { detail: TeamAdminDetailDto }) {
  const uid = useRef(`tmc${Date.now()}`).current;
  const perf = detail.performance;
  const pts = perf.map((p) => p.points);
  const slv = perf.map((p) => p.solves);
  const maxP = Math.max(...pts, 1);
  const maxS = Math.max(...slv, 1);

  if (perf.length === 0) {
    return (
      <div className="chart-empty">
        No performance data for this team yet.
      </div>
    );
  }

  const p = SeriesPath(pts, maxP);
  const s = SeriesPath(slv, maxS);
  const yTicks = [maxP, maxP * 0.75, maxP * 0.5, maxP * 0.25, 0];
  const xCount = perf.length > 1 ? 6 : 1;
  const xIdx = Array.from({ length: xCount + 1 }, (_, i) =>
    Math.round((i * (perf.length - 1)) / xCount),
  );
  const dotIdx = perf.length > 1 ? perf.map((_, i) => i) : [0];
  const showPts = p.line.startsWith("M");
  const showSlv = s.line.startsWith("M");

  return (
    <div className="chart-wrap">
      <svg viewBox="0 0 340 190" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`${uid}p`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity=".5" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity=".5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="chart-grid">
          {GRID_Y.map((y) => (
            <line key={y} x1="30" y1={y} x2="332" y2={y} />
          ))}
        </g>
        <g className="chart-axis">
          {yTicks.map((v, i) => (
            <text key={i} x="26" y={(GRID_Y[i] ?? 0) + 4} textAnchor="end">
              {shortNum(Math.round(v))}
            </text>
          ))}
        </g>
        <g className="chart-axis">
          {xIdx.map((idx) => (
            <text
              key={idx}
              x={perf.length > 1 ? Math.max(30, 30 + (idx * 302) / (perf.length - 1)) : 180}
              y="180"
              textAnchor="middle"
            >
              {chartLabel(perf[idx]?.date ?? "")}
            </text>
          ))}
        </g>
        {showPts ? (
          <>
            <path className="chart-area points" d={`${p.line} L${p.lastX.toFixed(1)} 160 L30 160 Z`} fill={`url(#${uid}p)`} />
            <path className="chart-line points" d={p.line} />
          </>
        ) : (
          <circle className="chart-dot points" cx={p.lastX} cy="20" r="2.5" />
        )}
        {showSlv ? (
          <>
            <path className="chart-area solves" d={`${s.line} L${s.lastX.toFixed(1)} 160 L30 160 Z`} fill={`url(#${uid}s)`} />
            <path className="chart-line solves" d={s.line} />
          </>
        ) : null}
        {perf.length > 1
          ? dotIdx.map((i, k) => {
              const x = 30 + (i * 302) / (perf.length - 1);
              const y = 20 + 140 * (1 - Math.max(0, pts[i] ?? 0) / maxP);
              return (
                <circle
                  key={k}
                  className="chart-dot points"
                  cx={x.toFixed(1)}
                  cy={y.toFixed(1)}
                  r="2.5"
                />
              );
            })
          : null}
      </svg>
    </div>
  );
}

function ActivityFeed({ detail }: { detail: TeamAdminDetailDto }) {
  if (detail.activity.length === 0) {
    return <div className="empty-list">No recent activity yet.</div>;
  }
  return (
    <div className="activity-list">
      {detail.activity.map((a) => {
        const isSolve = a.type === "solve";
        const color = isSolve ? "#8b5cf6" : "#60a5fa";
        return (
          <div className="act-item" key={a.id}>
            <span
              className="act-ic"
              style={
                {
                  "--ac": color,
                  "--ac-soft": `${color}22`,
                  "--ac-line": `${color}55`,
                } as React.CSSProperties
              }
            >
              <SVG d={isSolve ? FLAG : USERS} size={12} />
            </span>
            <div className="act-body">
              <div className="act-text">
                <b>{a.username}</b>{" "}
                {isSolve ? (
                  <>
                    solved <b>{a.challenge ?? "a challenge"}</b>
                  </>
                ) : (
                  "joined the team"
                )}
              </div>
              <div className="act-meta">
                <span>{relativeTime(a.at)}</span>
                {isSolve ? (
                  <span className="act-pts">+{pointsFmt(a.points)} pts</span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MembersList({ detail }: { detail: TeamAdminDetailDto }) {
  if (detail.members.length === 0) {
    return <div className="empty-list">No members yet.</div>;
  }
  return (
    <div className="members-list">
      {detail.members.map((m) => {
        const isLeader = m.role === "LEADER";
        return (
          <div className="member-row" key={m.userId}>
            <span className={`member-av${isLeader ? " leader" : ""}`}>
              <Avatar name={m.username} seed={m.userId} />
            </span>
            <span className="member-info">
              <span className="member-name">{m.username}</span>
              <span className={`member-role${isLeader ? " leader" : ""}`}>
                {isLeader ? <SVG d={CROWN} size={9} /> : null}
                {isLeader ? "Leader" : "Member"}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TeamDetail({
  detail,
  loading,
  error,
  onEdit,
  onView,
  onManage,
  onRetry,
}: {
  detail: TeamAdminDetailDto | null;
  loading: boolean;
  error: string | null;
  onEdit: (team: TeamAdminDto) => void;
  onView: (team: TeamAdminDto) => void;
  onManage: (team: TeamAdminDto) => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="panel detail-placeholder">
        <svg className="spinner-sm" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity=".25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Loading team…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel detail-placeholder">
        <span className="detail-placeholder-error">{error}</span>
        <button className="btn-sm ghost" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="panel detail-placeholder">
        <SVG d={USERS} size={22} className="detail-placeholder-ic" />
        <span>Select a team to view details</span>
        <span className="detail-placeholder-sub">
          Rankings, members, and activity will show here.
        </span>
      </div>
    );
  }

  const t = detail.team;
  const rankLabel = `#${t.rank}`;
  return (
    <div className="right-col">
      <div className="panel">
        <div className="sel-team-head">
          <span className="sel-team-avatar">
            <Avatar name={t.name} seed={t.id} />
          </span>
          <div className="sel-team-body">
            <div className="sel-team-title-row">
              <span className="sel-team-name">{t.name}</span>
              {t.rank === 1 ? <SVG d={CROWN} size={12} className="sel-team-crown" /> : null}
            </div>
            <div className="sel-team-handle">@{t.slug}</div>
            <div className="sel-team-quote">
              “{t.description && t.description.length > 60
                ? `${t.description.slice(0, 60)}…`
                : t.description || "No tagline yet"}”
            </div>
          </div>
          <span className="rank-badge">
            <SVG d={CROWN} size={9} />
            {rankLabel}
          </span>
        </div>

        <div className="sel-team-tags">
          <span className="sel-tag">#{String(t.id).padStart(3, "0")}</span>
          <span className="sel-tag mono">{t.joinCode}</span>
          <span className="sel-tag">{t.memberCount} members</span>
          <span className="sel-tag">{pointsFmt(t.points)} pts</span>
        </div>

        <div className="sel-team-actions">
          <button className="btn-sm ghost" onClick={() => onView(t)}>
            <SVG d={EYE} size={12} />
            View Team
          </button>
          <button className="btn-sm primary" onClick={() => onEdit(t)}>
            <SVG d={PENCIL} size={12} />
            Manage Team
          </button>
          <button className="btn-icon-sm" aria-label="More" title="More" onClick={() => onManage(t)}>
            <SVG d={KEBAB} size={14} />
          </button>
        </div>

        <div className="sel-stats">
          <div className="sel-stat">
            <span className="sel-stat-ic yellow">
              <SVG d={CROWN} size={12} />
            </span>
            <span className="sel-stat-value">{pointsFmt(t.points)}</span>
            <span className="sel-stat-label">Points</span>
          </div>
          <div className="sel-stat">
            <span className="sel-stat-ic red">
              <SVG d={FLAG} size={12} />
            </span>
            <span className="sel-stat-value">{t.solves}</span>
            <span className="sel-stat-label">Solves</span>
          </div>
          <div className="sel-stat">
            <span className="sel-stat-ic blue">
              <SVG d={USERS} size={12} />
            </span>
            <span className="sel-stat-value">{t.memberCount}</span>
            <span className="sel-stat-label">Members</span>
          </div>
          <div className="sel-stat">
            <span className="sel-stat-ic purple">
              <SVG d={CAL} size={12} />
            </span>
            <span className="sel-stat-value">{monthDay(t.createdAt)}</span>
            <span className="sel-stat-label">Joined</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">
            Team Members ({detail.members.length})
          </span>
          <button className="panel-link" onClick={() => onManage(t)}>
            Manage
            <SVG d={CHEV_R} size={12} />
          </button>
        </div>
        <MembersList detail={detail} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Team Performance</span>
          <button className="select-sm">
            Last 30 Days
            <SVG d={CARET} size={10} />
          </button>
        </div>
        <div className="chart-legend">
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: "#ec4899", boxShadow: "0 0 8px #ec4899" }} />
            Points
          </span>
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: "#3b82f6", boxShadow: "0 0 8px #3b82f6" }} />
            Solves
          </span>
        </div>
        <PerformanceChart detail={detail} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Recent Team Activity</span>
          <button className="panel-link">
            View All
            <SVG d={CHEV_R} size={12} />
          </button>
        </div>
        <ActivityFeed detail={detail} />
      </div>
    </div>
  );
}