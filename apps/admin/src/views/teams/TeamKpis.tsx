import type { TeamAdminDto } from "@ctf/shared";
import { useMemo } from "react";

import { pct, pointsFmt, sparkline } from "./format";
import { CHECK, SVG, TROPHY, USERS } from "./TeamIcons";

export interface TeamKpiValues {
  total: number;
  members: number;
  active: number;
  top: number;
}

type Tone = "purple" | "blue" | "green" | "yellow";

function Spark({
  id,
  values,
  color,
}: {
  id: string;
  values: number[];
  color: string;
}) {
  const { area, line } = sparkline(values);
  return (
    <div className="tm-spark">
      <svg viewBox="0 0 84 28" preserveAspectRatio="none" className="tm-spark-svg">
        <defs>
          <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".55" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {values.length > 1 ? (
          <>
            <path d={area} fill={`url(#${id}a)`} />
            <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <rect x="0" y="12" width="84" height="4" rx="2" fill={color} opacity=".25" />
        )}
      </svg>
    </div>
  );
}

function Card({
  tone,
  icon,
  value,
  label,
  foot,
}: {
  tone: Tone;
  icon: string;
  value: string;
  label: string;
  foot: React.ReactNode;
}) {
  return (
    <div className={`tm-kpi ${tone}`}>
      <div className="tm-kpi-top">
        <span className="tm-kpi-icon">
          <SVG d={icon} size={16} />
        </span>
      </div>
      <div className="tm-kpi-value">{value}</div>
      <div className="tm-kpi-label">{label}</div>
      <div className="tm-kpi-foot">{foot}</div>
    </div>
  );
}

export function TeamKpis({
  teams,
  v,
}: {
  teams: TeamAdminDto[];
  v: TeamKpiValues;
}) {
  const teamGrowth = useMemo(() => {
    const byAge = [...teams].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    let count = 0;
    const out: number[] = [];
    for (const _ of byAge) {
      count += 1;
      out.push(count);
    }
    return out;
  }, [teams]);

  const memberGrowth = useMemo(() => {
    const byAge = [...teams].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    let count = 0;
    const out: number[] = [];
    for (const t of byAge) {
      count += t.memberCount;
      out.push(count);
    }
    return out;
  }, [teams]);

  const activePct = v.total > 0 ? pct(v.active, v.total) : "0%";
  const topPct = v.total > 0 ? pct(v.top, v.total) : "0%";

  return (
    <div className="tm-kpi-row">
      <Card
        tone="purple"
        icon={USERS}
        value={String(v.total)}
        label="Total Teams"
        foot={
          <>
            <span className="tm-kpi-change up">{activePct} active</span>
            {teamGrowth.length > 1 ? (
              <Spark id="tmspk1" values={teamGrowth} color="#a78bfa" />
            ) : null}
          </>
        }
      />
      <Card
        tone="blue"
        icon={USERS}
        value={pointsFmt(v.members)}
        label="Total Members"
        foot={
          <>
            <span className="tm-kpi-change up">{topPct} scored</span>
            {memberGrowth.length > 1 ? (
              <Spark id="tmspk2" values={memberGrowth} color="#60a5fa" />
            ) : null}
          </>
        }
      />
      <Card
        tone="green"
        icon={CHECK}
        value={String(v.active)}
        label="Active Teams"
        foot={
          <span className="tm-kpi-event-badge">
            <span className="d" />
            active now
          </span>
        }
      />
      <Card
        tone="yellow"
        icon={TROPHY}
        value={String(v.top)}
        label="Top Teams"
        foot={
          <span className="tm-kpi-top-foot">
            <SVG d={TROPHY} size={10} />
            &gt; 1,000 pts
          </span>
        }
      />
    </div>
  );
}