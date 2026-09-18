import type { SubmissionByDayPoint, SubmissionKpiDto } from "@ctf/shared";
import { useId } from "react";

import { donutSegments, numFmt, shortNum, sparkline } from "./format";
import { CHECK, FLAG, SVG, USERS, X } from "../teams/TeamIcons";

type Tone = "purple" | "green" | "red" | "blue";

function Spark({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { area, line } = sparkline(values.length > 0 ? values : [0]);
  return (
    <div className="sub-spark">
      <svg viewBox="0 0 84 28" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`${uid}a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".5" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${uid}a)`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Change({ up, label }: { up: boolean; label: string }) {
  return (
    <span className={`sub-change ${up ? "up" : "down"}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={up ? "M12 19V5" : "M12 5v14"} />
        <path d={up ? "m5 12 7-7 7 7" : "m5 12 7 7 7-7"} />
      </svg>
      {label}
    </span>
  );
}

function Card({
  tone,
  icon,
  value,
  label,
  change,
  spark,
}: {
  tone: Tone;
  icon: string;
  value: string;
  label: string;
  change: { up: boolean; label: string } | null;
  spark: number[];
}) {
  return (
    <div className={`sub-kpi ${tone}`}>
      <div className="sub-kpi-top">
        <span className="sub-kpi-icon">
          <SVG d={icon} size={16} />
        </span>
      </div>
      <div className="sub-kpi-value">{value}</div>
      <div className="sub-kpi-label">{label}</div>
      <div className="sub-kpi-foot">
        {change ? <Change up={change.up} label={change.label} /> : null}
        {spark.length > 1 ? <Spark values={spark} color={toneColor[tone]} /> : null}
      </div>
    </div>
  );
}

const toneColor: Record<Tone, string> = {
  purple: "#a78bfa",
  green: "#4ade80",
  red: "#f87171",
  blue: "#60a5fa",
};

function changeProps(pct: number): { up: boolean; label: string } {
  const up = pct >= 0;
  const abs = `${Math.abs(pct)}%`;
  return { up, label: `${abs} vs 7d` };
}

export function SubmissionKpis({
  kpis,
  byDay,
}: {
  kpis: SubmissionKpiDto;
  byDay: SubmissionByDayPoint[];
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const totalSpark = byDay.map((d) => d.total);
  const correctSpark = byDay.map((d) => d.correct);
  const incorrectSpark = byDay.map((d) => d.total - d.correct);
  const usersSpark = byDay.map((d) => d.users);

  const segs = donutSegments([kpis.correct, kpis.incorrect], 24, 7);
  const cLen = 2 * Math.PI * 24;

  return (
    <div className="sub-kpi-row">
      <Card
        tone="purple"
        icon={FLAG}
        value={numFmt(kpis.total)}
        label="Total Submissions"
        change={changeProps(kpis.totalChangePct)}
        spark={totalSpark}
      />
      <Card
        tone="green"
        icon={CHECK}
        value={numFmt(kpis.correct)}
        label="Correct Submissions"
        change={changeProps(kpis.correctChangePct)}
        spark={correctSpark}
      />
      <Card
        tone="red"
        icon={X}
        value={numFmt(kpis.incorrect)}
        label="Incorrect Submissions"
        change={changeProps(kpis.incorrectChangePct)}
        spark={incorrectSpark}
      />
      <Card
        tone="blue"
        icon={USERS}
        value={numFmt(kpis.uniqueUsers)}
        label="Unique Users"
        change={changeProps(kpis.usersChangePct)}
        spark={usersSpark}
      />

      <div className={`sub-kpi solve-rate`}>
        <div className="sub-solve-donut">
          <svg viewBox="0 0 60 60">
            <defs>
              <linearGradient id={`${uid}p`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
              <linearGradient id={`${uid}r`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
            </defs>
            <circle cx="30" cy="30" r="24" fill="none" stroke="#1a1a30" strokeWidth="7" />
            {segs[1] ? (
              <circle
                cx="30"
                cy="30"
                r="24"
                fill="none"
                stroke={`url(#${uid}r)`}
                strokeWidth="7"
                strokeDasharray={`${segs[1]?.len ?? 0} ${cLen}`}
                strokeDashoffset={segs[1]?.offset ?? 0}
              />
            ) : null}
            {segs[0] ? (
              <circle
                cx="30"
                cy="30"
                r="24"
                fill="none"
                stroke={`url(#${uid}p)`}
                strokeWidth="7"
                strokeDasharray={`${segs[0]?.len ?? 0} ${cLen}`}
                strokeDashoffset={segs[0]?.offset ?? 0}
              />
            ) : null}
          </svg>
          <div className="sub-solve-donut-center">
            <span className="sub-solve-donut-pct">{kpis.solveRatePct}%</span>
          </div>
        </div>
        <div className="sub-solve-body">
          <div className="sub-solve-title">Solve Rate</div>
          <div className="sub-solve-stat-row">
            <span className="sub-solve-stat-swatch" style={{ background: "#8b5cf6" }} />
            <span className="sub-solve-stat-name">Correct</span>
            <span className="sub-solve-stat-val">{kpis.solveRatePct}%</span>
          </div>
          <div className="sub-solve-stat-row">
            <span className="sub-solve-stat-swatch" style={{ background: "#ef4444" }} />
            <span className="sub-solve-stat-name">Incorrect</span>
            <span className="sub-solve-stat-val">{100 - kpis.solveRatePct}%</span>
          </div>
          <div className="sub-solve-foot">
            {shortNum(kpis.correct)} / {shortNum(kpis.total)}
          </div>
        </div>
      </div>
    </div>
  );
}