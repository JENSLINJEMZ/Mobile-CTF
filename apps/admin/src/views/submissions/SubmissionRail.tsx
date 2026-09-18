import type { SubmissionOverviewDto } from "@ctf/shared";
import { useId } from "react";

import { chartLabel, relativeTime } from "./format";
import { TopChallenges } from "./SubmissionPanels";
import { Avatar, CHECK, SVG, CHEV_R } from "../teams/TeamIcons";

const W = 340;
const H = 180;
const PAD_L = 30;
const PAD_R = 8;
const PAD_T = 20;
const PAD_B = 16;

function SeriesPath(
  values: number[],
  max: number,
): { area: string; line: string; pts: { x: number; y: number }[] } {
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;
  const pts = values.map((v, i) => ({
    x: PAD_L + (values.length > 1 ? i * step : 0),
    y: PAD_T + innerH - (max > 0 ? (v / max) * innerH : 0),
  }));
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const last = pts.at(-1) ?? { x: PAD_L, y: PAD_T };
  const area = `${line} L${last.x.toFixed(1)} ${H - PAD_B} L${PAD_L} ${H - PAD_B} Z`;
  return { area, line, pts };
}

export function SubmissionRail({
  overview,
}: {
  overview: SubmissionOverviewDto;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { byDay, status, recentCorrect } = overview;

  const maxTotal = Math.max(...byDay.map((d) => d.total), 1);
  const series = SeriesPath(byDay.map((d) => d.total), maxTotal);
  const seriesCorrect = SeriesPath(byDay.map((d) => d.correct), maxTotal);
  const maxTick = Math.ceil(maxTotal / 4) * 4 || 4;
  const ticks = [maxTick, maxTick * 0.75, maxTick * 0.5, maxTick * 0.25, 0];

  const labelIdx = [0, 2, 4, 6, 8, 10, 13];
  const dotIdx = [0, 2, 4, 5, 7, 9, 10, 12, 13];

  return (
    <div className="right-col">
      {/* Solve Rate card */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Solve Rate</span>
        </div>
        <div className="solve-card">
          <div className="solve-card-donut">
            <svg viewBox="0 0 100 100">
              <defs>
                <linearGradient id={`${uid}r1`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
                <linearGradient id={`${uid}r2`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1a1a30" strokeWidth="12" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={`url(#${uid}r2)`}
                strokeWidth="12"
                strokeDasharray={`${(status.incorrect / Math.max(status.total, 1)) * 251.33} 251.33`}
                strokeDashoffset="0"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={`url(#${uid}r1)`}
                strokeWidth="12"
                strokeDasharray={`${(status.correct / Math.max(status.total, 1)) * 251.33} 251.33`}
                strokeDashoffset={-((status.incorrect / Math.max(status.total, 1)) * 251.33)}
              />
            </svg>
            <div className="solve-card-center">
              <span className="solve-card-pct">
                {status.total > 0
                  ? `${Math.round((status.correct / status.total) * 1000) / 10}%`
                  : "0%"}
              </span>
              <span className="solve-card-sub">solve rate</span>
            </div>
          </div>
          <div className="solve-card-body">
            <div className="solve-card-title">
              {status.correct.toLocaleString("en-US")} / {status.total.toLocaleString("en-US")}
            </div>
            <div className="solve-stat">
              <span className="solve-stat-swatch" style={{ background: "#8b5cf6" }} />
              <span className="solve-stat-name">Correct</span>
              <span className="solve-stat-pct">
                {status.total > 0
                  ? `${Math.round((status.correct / status.total) * 1000) / 10}%`
                  : "0%"}
              </span>
            </div>
            <div className="solve-stat">
              <span className="solve-stat-swatch" style={{ background: "#ef4444" }} />
              <span className="solve-stat-name">Incorrect</span>
              <span className="solve-stat-pct">
                {status.total > 0
                  ? `${Math.round((status.incorrect / status.total) * 1000) / 10}%`
                  : "0%"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions Over Time */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Submissions Over Time</span>
          <button className="select-sm" type="button">
            Last 14 Days
            <SVG d={CHEV_R} size={10} />
          </button>
        </div>
        <div className="chart-legend">
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: "#ec4899", boxShadow: "0 0 8px #ec4899" }} />
            Total
          </span>
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: "#60a5fa", boxShadow: "0 0 8px #60a5fa" }} />
            Correct
          </span>
        </div>
        <div className="chart-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id={`${uid}ap`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" stopOpacity=".5" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`${uid}ab`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity=".5" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g className="chart-grid">
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={i} x1={PAD_L} y1={PAD_T + i * ((H - PAD_T - PAD_B) / 4)} x2={W - PAD_R} y2={PAD_T + i * ((H - PAD_T - PAD_B) / 4)} />
              ))}
            </g>
            <g className="chart-axis">
              {ticks.map((t, i) => (
                <text key={i} x={PAD_L - 4} y={PAD_T + i * ((H - PAD_T - PAD_B) / 4) + 3} textAnchor="end">
                  {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
                </text>
              ))}
            </g>
            <g className="chart-axis">
              {labelIdx.map((i) => (
                <text
                  key={i}
                  x={PAD_L + (i / 13) * (W - PAD_L - PAD_R)}
                  y={H - 4}
                  textAnchor="middle"
                >
                  {chartLabel(byDay[i]?.date ?? "")}
                </text>
              ))}
            </g>
            <path className="chart-area total" d={series.area} />
            <path className="chart-line total" d={series.line} />
            <path className="chart-area correct" d={seriesCorrect.area} />
            <path className="chart-line correct" d={seriesCorrect.line} />
            <g>
              {dotIdx.map((i) => (
                <circle
                  key={i}
                  className="chart-dot total"
                  cx={series.pts[i]?.x ?? 0}
                  cy={series.pts[i]?.y ?? 0}
                  r="2.5"
                />
              ))}
            </g>
          </svg>
        </div>
      </div>

      {/* Top Challenges by Submissions */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Top Challenges by Submissions</span>
          <a href="#" className="panel-link">
            View All
            <SVG d={CHEV_R} size={12} />
          </a>
        </div>
        <TopChallenges overview={overview} />
      </div>

      {/* Recent Correct Submissions */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Recent Correct Submissions</span>
          <a href="#" className="panel-link">
            View All
            <SVG d={CHEV_R} size={12} />
          </a>
        </div>
        <div className="recent-list">
          {recentCorrect.length > 0 ? (
            recentCorrect.map((r) => (
              <div key={r.id} className="recent-row">
                <span className="recent-check">
                  <SVG d={CHECK} size={11} />
                </span>
                <span className="recent-av">
                  <Avatar name={r.username} seed={r.userId} />
                </span>
                <span className="recent-name">@{r.username}</span>
                <span className="recent-challenge">{r.challenge}</span>
                <span className="recent-time">{relativeTime(r.time)}</span>
              </div>
            ))
          ) : (
            <div className="panel-empty">No correct submissions yet</div>
          )}
        </div>
      </div>
    </div>
  );
}