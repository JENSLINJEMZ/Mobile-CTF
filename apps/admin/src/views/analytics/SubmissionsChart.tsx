import type { AnalyticsDayPoint } from "@ctf/shared";
import { useMemo, useState } from "react";
import { numFmt } from "./format";

interface Props {
  days: AnalyticsDayPoint[];
}

export function SubmissionsChart({ days }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (!days || days.length === 0) return null;

    const maxVal = Math.max(
      10,
      ...days.map((d) => Math.max(d.attempts, d.solves, d.attempts - d.solves)),
    );

    const width = 400;
    const height = 180;
    const padX = 45;
    const padRight = 10;
    const padTop = 20;
    const padBottom = 25;

    const usableW = width - padX - padRight;
    const usableH = height - padTop - padBottom;
    const stepX = usableW / Math.max(1, days.length - 1);

    const totalPts: Array<[number, number]> = [];
    const correctPts: Array<[number, number]> = [];
    const incorrectPts: Array<[number, number]> = [];

    days.forEach((d, idx) => {
      const x = padX + idx * stepX;
      const inc = Math.max(0, d.attempts - d.solves);

      const yTot = height - padBottom - (d.attempts / maxVal) * usableH;
      const yCor = height - padBottom - (d.solves / maxVal) * usableH;
      const yInc = height - padBottom - (inc / maxVal) * usableH;

      totalPts.push([x, yTot]);
      correctPts.push([x, yCor]);
      incorrectPts.push([x, yInc]);
    });

    const toPath = (pts: Array<[number, number]>) =>
      pts.reduce(
        (acc, [x, y], i) => (i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`),
        "",
      );

    const totalLine = toPath(totalPts);
    const correctLine = toPath(correctPts);
    const incorrectLine = toPath(incorrectPts);

    const firstX = totalPts[0]![0].toFixed(1);
    const lastX = totalPts[totalPts.length - 1]![0].toFixed(1);
    const baseY = (height - padBottom).toFixed(1);
    const areaPath = `${totalLine} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

    const yTicks = [
      { label: numFmt(maxVal), y: padTop },
      { label: numFmt(Math.round(maxVal * 0.75)), y: padTop + usableH * 0.25 },
      { label: numFmt(Math.round(maxVal * 0.5)), y: padTop + usableH * 0.5 },
      { label: numFmt(Math.round(maxVal * 0.25)), y: padTop + usableH * 0.75 },
      { label: "0", y: height - padBottom },
    ];

    const xTicks = days
      .map((d, i) => ({
        label: d.date.slice(5),
        x: padX + i * stepX,
        origIdx: i,
      }))
      .filter((_, i) => i % 3 === 0 || i === days.length - 1);

    return {
      maxVal,
      totalPts,
      correctPts,
      incorrectPts,
      totalLine,
      correctLine,
      incorrectLine,
      areaPath,
      yTicks,
      xTicks,
      baseY: height - padBottom,
    };
  }, [days]);

  if (!chartData || days.length === 0) {
    return (
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Submissions Over Time</span>
        </div>
        <div className="chart-wrap" style={{ display: "grid", placeItems: "center", color: "var(--text-3)" }}>
          No submission activity recorded yet.
        </div>
      </div>
    );
  }

  const activeIdx = hoverIndex ?? days.length - 1;
  const activeDay = days[activeIdx];
  const activeTotPt = chartData.totalPts[activeIdx];
  const activeCorPt = chartData.correctPts[activeIdx];
  const activeIncPt = chartData.incorrectPts[activeIdx];

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Submissions Over Time</span>
      </div>
      <div className="chart-legend">
        <span className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: "#a78bfa", boxShadow: "0 0 8px #a78bfa" }} />
          Total
        </span>
        <span className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
          Correct
        </span>
        <span className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: "#f87171", boxShadow: "0 0 8px #f87171" }} />
          Incorrect
        </span>
      </div>

      <div
        className="chart-wrap"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {activeDay && activeTotPt ? (
          <div className="chart-tooltip-box">
            <div className="chart-tooltip-date">{activeDay.date}</div>
            <div className="chart-tooltip-row">
              <span className="chart-tooltip-dot" style={{ background: "#a78bfa" }} />
              <span className="chart-tooltip-label">Total</span>
              <span className="chart-tooltip-value">{numFmt(activeDay.attempts)}</span>
            </div>
            <div className="chart-tooltip-row">
              <span className="chart-tooltip-dot" style={{ background: "#4ade80" }} />
              <span className="chart-tooltip-label">Correct</span>
              <span className="chart-tooltip-value">{numFmt(activeDay.solves)}</span>
            </div>
            <div className="chart-tooltip-row">
              <span className="chart-tooltip-dot" style={{ background: "#f87171" }} />
              <span className="chart-tooltip-label">Incorrect</span>
              <span className="chart-tooltip-value">
                {numFmt(Math.max(0, activeDay.attempts - activeDay.solves))}
              </span>
            </div>
          </div>
        ) : null}

        <svg viewBox="0 0 400 180" preserveAspectRatio="none">
          <defs>
            <linearGradient id="subAreaP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <g className="chart-grid">
            {chartData.yTicks.map((t, idx) => (
              <line key={idx} x1="30" y1={t.y} x2="392" y2={t.y} />
            ))}
          </g>

          <g className="chart-axis">
            {chartData.yTicks.map((t, idx) => (
              <text key={idx} x="26" y={t.y + 3} textAnchor="end">
                {t.label}
              </text>
            ))}
            {chartData.xTicks.map((t, idx) => (
              <text key={idx} x={t.x} y="174" textAnchor="middle">
                {t.label}
              </text>
            ))}
          </g>

          <path d={chartData.areaPath} fill="url(#subAreaP)" />
          <path
            className="chart-line"
            d={chartData.totalLine}
            stroke="#a78bfa"
            style={{ filter: "drop-shadow(0 0 4px rgba(167,139,250,.6))" }}
          />
          <path className="chart-line" d={chartData.correctLine} stroke="#4ade80" />
          <path className="chart-line" d={chartData.incorrectLine} stroke="#f87171" />

          {activeTotPt && activeCorPt && activeIncPt ? (
            <>
              <line
                className="chart-tooltip-line"
                x1={activeTotPt[0]}
                y1="20"
                x2={activeTotPt[0]}
                y2={chartData.baseY}
              />
              <circle className="chart-dot" cx={activeTotPt[0]} cy={activeTotPt[1]} r="3.5" fill="#a78bfa" stroke="#0a0a14" />
              <circle className="chart-dot" cx={activeCorPt[0]} cy={activeCorPt[1]} r="3" fill="#4ade80" stroke="#0a0a14" />
              <circle className="chart-dot" cx={activeIncPt[0]} cy={activeIncPt[1]} r="3" fill="#f87171" stroke="#0a0a14" />
            </>
          ) : null}

          {/* Invisible interactive overlay for smooth hover detection */}
          {chartData.totalPts.map(([x], idx) => (
            <rect
              key={idx}
              x={x - 12}
              y={10}
              width={24}
              height={160}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoverIndex(idx)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
