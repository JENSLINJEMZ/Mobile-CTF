import type {
  SandboxCategoryPoint,
  SandboxTrendPoint,
} from "@ctf/shared";
import { useMemo } from "react";

/* ------------------------------------------------------------- sparkline */

export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const pts = useMemo(() => {
    if (values.length < 2) {
      return { line: "", area: "" };
    }
    const w = 76;
    const h = 26;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    const step = w / (values.length - 1);
    const coords = values.map((v, i) => {
      const x = i * step;
      const y = 22 - ((v - min) / span) * 18;
      return [x, y] as const;
    });
    const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const area = `${line} L${w} 26 L0 26 Z`;
    return { line, area };
  }, [values]);
  if (!pts.line) return <svg className="kpi-spark" viewBox="0 0 76 26" preserveAspectRatio="none" />;
  return (
    <svg className="kpi-spark" viewBox="0 0 76 26" preserveAspectRatio="none">
      <path d={pts.area} fill={`${color}22`} />
      <path d={pts.line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ----------------------------------------------------------- usage chart */

export function UsageChart({ trends }: { trends: SandboxTrendPoint[] }) {
  const W = 400;
  const X0 = 30;
  const X1 = 375;
  const top = 20;
  const bot = 170;

  const series = useMemo(() => {
    const running = trends.map((t) => t.running);
    const stopped = trends.map((t) => t.stopped);
    const total = trends.map((t) => t.total);
    const max = Math.max(1, ...running, ...stopped, ...total);
    const step = trends.length > 1 ? (X1 - X0) / (trends.length - 1) : 0;
    const px = (v: number) => bot - (v / max) * (bot - top);
    const pts = (arr: number[]) =>
      arr
        .map((v, i) => `${i === 0 ? "M" : "L"}${(X0 + i * step).toFixed(1)} ${px(v).toFixed(1)}`)
        .join(" ");
    return { running: pts(running), stopped: pts(stopped), total: pts(total), max, step };
  }, [trends]);

  const yTicks = useMemo(() => {
    const step = series.max / 4 || 1;
    return [0, 1, 2, 3, 4].map((i) => Math.round(step * i));
  }, [series.max]);

  return (
    <>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} 190`} preserveAspectRatio="none">
          <g className="chart-grid">
            {[20, 60, 100, 140, 170].map((y) => (
              <line key={y} x1={X0} y1={y} x2={390} y2={y} />
            ))}
          </g>
          <g className="chart-axis">
            {yTicks.map((v, i) => (
              <text key={v} x="24" y={20 + i * 40 + 4} textAnchor="end">
                {v}
              </text>
            ))}
            <text x="24" y="174" textAnchor="end">0</text>
          </g>
          <g className="chart-axis">
            {trends.map((t, i) => (
              <text key={t.date} x={X0 + i * series.step} y="186" textAnchor="middle">
                {t.date}
              </text>
            ))}
          </g>
          <path className="chart-line l1" d={series.total} />
          <path className="chart-line l2" d={series.running} />
          <path className="chart-line l3" d={series.stopped} />
          <g>
            {trends.map((t, i) => (
              <circle
                key={`r${t.date}`}
                className="chart-dot l2"
                cx={X0 + i * series.step}
                cy={bot - (t.running / series.max) * (bot - top)}
                r="3"
              />
            ))}
          </g>
        </svg>
      </div>
      <div className="chart-legend">
        <span className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: "#8b5cf6", boxShadow: "0 0 8px #8b5cf6" }} />
          Running
        </span>
        <span className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
          Stopped
        </span>
        <span className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: "#3b82f6", boxShadow: "0 0 8px #3b82f6" }} />
          Total
        </span>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- donut */

export function Donut({
  points,
  total,
}: {
  points: SandboxCategoryPoint[];
  total: number;
}) {
  const C = 2 * Math.PI * 40;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <div className="donut">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1a1a30" strokeWidth="14" />
          {points.map((p) => {
            const len = total > 0 ? (p.value / total) * C : 0;
            const seg = (
              <circle
                key={p.name}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={p.color}
                strokeWidth="14"
                strokeDasharray={`${Math.max(len - 1.5, 0.5)} ${C}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return seg;
          })}
        </svg>
        <div className="donut-center">
          <span className="donut-value">{total}</span>
          <span className="donut-label">Environments</span>
        </div>
      </div>
      <div className="donut-legend">
        {points.map((p) => (
          <div key={p.name} className="donut-item">
            <span className="swatch" style={{ background: p.color }} />
            <span className="name">{p.name}</span>
            <span className="val">{p.value}</span>
            <span className="pct">({total > 0 ? Math.round((p.value / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- ring */

export function Ring({ pct, color, label, title }: {
  pct: number;
  color: string;
  label: string;
  title?: string;
}) {
  const r = 24;
  const C = 2 * Math.PI * r;
  const capped = Math.max(0, Math.min(100, pct));
  return (
    <div className="res-ring" title={title}>
      <div className="ring">
        <svg viewBox="0 0 60 60">
          <circle className="ring-bg" cx="30" cy="30" r={r} />
          <circle
            className="ring-fill"
            cx="30"
            cy="30"
            r={r}
            stroke={color}
            style={{
              strokeDasharray: C,
              strokeDashoffset: C * (1 - capped / 100),
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        </svg>
        <span className="ring-val">{capped}%</span>
      </div>
      <span className="res-label">{label}</span>
    </div>
  );
}