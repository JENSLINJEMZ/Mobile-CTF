import type { SubmissionOverviewDto } from "@ctf/shared";
import { useId } from "react";

import { challengeProfile, donutSegments } from "./format";
import { Avatar } from "../teams/TeamIcons";

function BarRow({
  rank,
  name,
  count,
  max,
  avatar,
  handle,
}: {
  rank: number;
  name: string;
  count: number;
  max: number;
  avatar?: React.ReactNode;
  handle?: string;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="tu-row">
      <span className="tu-rank">{rank}</span>
      {avatar}
      <span className="tu-name">{name}</span>
      <div className="tu-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="tu-count">{count.toLocaleString("en-US")}</span>
      {handle ? <span className="tu-handle">{handle}</span> : null}
    </div>
  );
}

export function SubmissionPanels({
  overview,
}: {
  overview: SubmissionOverviewDto;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { status, topTeams, topUsers } = overview;

  const maxTeams = Math.max(...topTeams.map((t) => t.count), 1);
  const maxUsers = Math.max(...topUsers.map((u) => u.count), 1);

  const segs = donutSegments([status.correct, status.incorrect], 40, 12);
  const cLen = 2 * Math.PI * 40;

  return (
    <div className="sub-bottom-row">
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Top Teams by Submissions</span>
        </div>
        <div className="tu-list">
          {topTeams.length > 0 ? (
            topTeams.map((t, i) => (
              <BarRow
                key={t.teamId}
                rank={i + 1}
                name={t.name}
                count={t.count}
                max={maxTeams}
                avatar={
                  <span className="tu-av">
                    <Avatar name={t.name} seed={t.teamId} />
                  </span>
                }
              />
            ))
          ) : (
            <div className="panel-empty">No team submissions yet</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Top Users by Submissions</span>
        </div>
        <div className="tu-list">
          {topUsers.length > 0 ? (
            topUsers.map((u, i) => (
              <BarRow
                key={u.userId}
                rank={i + 1}
                name={u.username}
                count={u.count}
                max={maxUsers}
                handle={`@${u.username}`}
              />
            ))
          ) : (
            <div className="panel-empty">No submissions recorded yet</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Submission Status</span>
        </div>
        <div className="status-wrap">
          <div className="donut">
            <svg viewBox="0 0 100 100">
              <defs>
                <linearGradient id={`${uid}g1`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
                <linearGradient id={`${uid}g2`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1a1a30" strokeWidth="12" />
              {segs[0] ? (
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={`url(#${uid}g1)`}
                  strokeWidth="12"
                  strokeDasharray={`${segs[0]?.len ?? 0} ${cLen}`}
                  strokeDashoffset={segs[0]?.offset ?? 0}
                />
              ) : null}
              {segs[1] ? (
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={`url(#${uid}g2)`}
                  strokeWidth="12"
                  strokeDasharray={`${segs[1]?.len ?? 0} ${cLen}`}
                  strokeDashoffset={segs[1]?.offset ?? 0}
                />
              ) : null}
            </svg>
            <div className="donut-center">
              <span className="donut-value">{status.total.toLocaleString("en-US")}</span>
              <span className="donut-label">Submissions</span>
            </div>
          </div>
          <div className="donut-legend">
            <div className="legend-row">
              <span className="swatch" style={{ background: "#22c55e" }} />
              <span className="n">Correct</span>
              <span className="pct">
                {status.total > 0
                  ? `${Math.round((status.correct / status.total) * 1000) / 10}%`
                  : "0%"}
              </span>
            </div>
            <div className="legend-row">
              <span className="swatch" style={{ background: "#ef4444" }} />
              <span className="n">Incorrect</span>
              <span className="pct">
                {status.total > 0
                  ? `${Math.round((status.incorrect / status.total) * 1000) / 10}%`
                  : "0%"}
              </span>
            </div>
            <div className="legend-row totals">
              <span className="n dim">Correct</span>
              <span className="pct dim">{status.correct.toLocaleString("en-US")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TopChallenges({
  overview,
}: {
  overview: SubmissionOverviewDto;
}) {
  return (
    <div className="top-challenges-list">
      {overview.topChallenges.length > 0 ? (
        overview.topChallenges.map((c, i) => {
          const prof = challengeProfile(c.title);
          return (
            <div key={c.challengeId} className="tc-row">
              <span className="tc-rank">{i + 1}</span>
              <span
                className="tc-icon"
                style={
                  {
                    "--ch": prof.color,
                    "--ch-bg": `${prof.color}22`,
                    "--ch-line": `${prof.color}55`,
                  } as React.CSSProperties
                }
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <g dangerouslySetInnerHTML={{ __html: prof.d }} />
                </svg>
              </span>
              <span className="tc-name">{c.title}</span>
              <span className="tc-count">
                {c.count.toLocaleString("en-US")}
                <span className="pct">({c.pct}%)</span>
              </span>
            </div>
          );
        })
      ) : (
        <div className="panel-empty">No challenge submissions yet</div>
      )}
    </div>
  );
}