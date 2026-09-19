import type { AnnouncementOverviewDto } from "@ctf/shared";

import { relativeTime } from "../submissions/format";
import { anDate } from "./format";
import { MEGA, PIN } from "./icons";
import { Avatar, CAL, CHEV_R, SVG, USERS } from "../teams/TeamIcons";

function StatTile({
  icon,
  color,
  value,
  label,
  change,
}: {
  icon: string;
  color: string;
  value: string;
  label: string;
  change: number;
}) {
  return (
    <div className="an-stat-tile">
      <div className="an-stat-top">
        <span
          className="an-stat-icon"
          style={
            {
              "--stc": color,
              "--stc-bg": `${color}24`,
              "--stc-line": `${color}59`,
            } as React.CSSProperties
          }
        >
          <SVG d={icon} size={12} />
        </span>
      </div>
      <div className="an-stat-value">{value}</div>
      <div className="an-stat-label">{label}</div>
      <span className={`an-stat-change ${change >= 0 ? "up" : "down"}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={change >= 0 ? "M12 19V5" : "M12 5v14"} />
          <path d={change >= 0 ? "m5 12 7-7 7 7" : "m5 12 7 7 7-7"} />
        </svg>
        {Math.abs(change)}%
      </span>
    </div>
  );
}

export function AnnouncementRail({
  overview,
}: {
  overview: AnnouncementOverviewDto;
}) {
  const { kpis, recent } = overview;

  return (
    <div className="right-col">
      {/* Statistics */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Announcement Statistics</span>
          <button className="select-sm" type="button">
            Live Snapshot
            <SVG d={CHEV_R} size={10} />
          </button>
        </div>
        <div className="an-stats-grid">
          <StatTile
            icon={MEGA}
            color="#a78bfa"
            value={kpis.total.toLocaleString("en-US")}
            label="Total Announcements"
            change={kpis.totalChangePct}
          />
          <StatTile
            icon={PIN}
            color="#4ade80"
            value={kpis.pinned.toLocaleString("en-US")}
            label="Pinned"
            change={kpis.pinnedChangePct}
          />
          <StatTile
            icon={CAL}
            color="#60a5fa"
            value={kpis.last7.toLocaleString("en-US")}
            label="Last 7 Days"
            change={kpis.last7ChangePct}
          />
          <StatTile
            icon={USERS}
            color="#f87171"
            value={kpis.authors.toLocaleString("en-US")}
            label="Update Authors"
            change={kpis.authorsChangePct}
          />
        </div>
      </div>

      {/* Recent activity */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Recent Activity</span>
          <a href="#" className="panel-link">
            View All
            <SVG d={CHEV_R} size={12} />
          </a>
        </div>
        <div className="an-recent-list">
          {recent.length > 0 ? (
            recent.map((r) => (
              <div key={r.id} className="an-recent-row">
                <span className="an-recent-av">
                  <Avatar name={r.username} seed={r.id} />
                </span>
                <span className="an-recent-body">
                  <span className="an-recent-title">
                    {r.title}
                    {r.pinned ? <span className="an-recent-pin">Pinned</span> : null}
                  </span>
                  <span className="an-recent-meta">by @{r.username}</span>
                </span>
                <span className="an-recent-time" title={anDate(r.createdAt)}>
                  {relativeTime(r.createdAt)}
                </span>
              </div>
            ))
          ) : (
            <div className="panel-empty">No announcements yet</div>
          )}
        </div>
      </div>
    </div>
  );
}