import type { AnalyticsUserGrowthPoint } from "@ctf/shared";
import { useMemo } from "react";
import { compactNum } from "./format";

interface Props {
  data?: AnalyticsUserGrowthPoint[];
}

export function UserGrowthChart({ data }: Props) {
  const chart = useMemo(() => {
    if (!data || data.length === 0) return null;

    const width = 400;
    const height = 180;
    const padX = 35;
    const padRight = 10;
    const padTop = 20;
    const padBottom = 25;

    const usableW = width - padX - padRight;
    const usableH = height - padTop - padBottom;
    const stepX = usableW / Math.max(1, data.length - 1);

    const maxTotal = Math.max(10, ...data.map((d) => d.total));
    const maxNew = Math.max(5, ...data.map((d) => d.newUsers));

    const totalPts: Array<[number, number]> = [];
    const newPts: Array<[number, number]> = [];

    data.forEach((d, idx) => {
      const x = padX + idx * stepX;
      const yTot = height - padBottom - (d.total / maxTotal) * usableH;
      // Scale new users to visually occupy bottom half
      const yNew = height - padBottom - (d.newUsers / maxNew) * (usableH * 0.45);

      totalPts.push([x, yTot]);
      newPts.push([x, yNew]);
    });

    const toPath = (pts: Array<[number, number]>) =>
      pts.reduce(
        (acc, [x, y], i) => (i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`),
        "",
      );

    const totalLine = toPath(totalPts);
    const newLine = toPath(newPts);

    const firstX = totalPts[0]![0].toFixed(1);
    const lastX = totalPts[totalPts.length - 1]![0].toFixed(1);
    const baseY = (height - padBottom).toFixed(1);
    const areaPath = `${totalLine} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;

    const yTicks = [
      { label: compactNum(maxTotal), y: padTop },
      { label: compactNum(Math.round(maxTotal * 0.75)), y: padTop + usableH * 0.25 },
      { label: compactNum(Math.round(maxTotal * 0.5)), y: padTop + usableH * 0.5 },
      { label: compactNum(Math.round(maxTotal * 0.25)), y: padTop + usableH * 0.75 },
      { label: "0", y: height - padBottom },
    ];

    const xTicks = data
      .map((d, i) => ({
        label: d.date.slice(5),
        x: padX + i * stepX,
      }))
      .filter((_, i) => i % 3 === 0 || i === data.length - 1);

    return {
      totalLine,
      newLine,
      areaPath,
      totalPts,
      newPts,
      yTicks,
      xTicks,
    };
  }, [data]);

  if (!chart || !data || data.length === 0) {
    return (
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">User Growth</span>
        </div>
        <div className="chart-wrap" style={{ display: "grid", placeItems: "center", color: "var(--text-3)" }}>
          No user growth data available.
        </div>
      </div>
    );
  }

  const lastTotal = chart.totalPts[chart.totalPts.length - 1];
  const lastNew = chart.newPts[chart.newPts.length - 1];

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">User Growth</span>
      </div>

      <div className="chart-legend">
        <span className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: "#a78bfa", boxShadow: "0 0 8px #a78bfa" }} />
          Total Users
        </span>
        <span className="chart-legend-item">
          <span className="chart-legend-dot" style={{ background: "#60a5fa", boxShadow: "0 0 8px #60a5fa" }} />
          New Users
        </span>
      </div>

      <div className="chart-wrap">
        <svg viewBox="0 0 400 180" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ugP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <g className="chart-grid">
            {chart.yTicks.map((t, idx) => (
              <line key={idx} x1="30" y1={t.y} x2="392" y2={t.y} />
            ))}
          </g>

          <g className="chart-axis">
            {chart.yTicks.map((t, idx) => (
              <text key={idx} x="26" y={t.y + 4} textAnchor="end">
                {t.label}
              </text>
            ))}
            {chart.xTicks.map((t, idx) => (
              <text key={idx} x={t.x} y="174" textAnchor="middle">
                {t.label}
              </text>
            ))}
          </g>

          <path d={chart.areaPath} fill="url(#ugP)" />
          <path
            className="chart-line"
            d={chart.totalLine}
            stroke="#a78bfa"
            style={{ filter: "drop-shadow(0 0 4px rgba(167,139,250,.6))" }}
          />
          <path className="chart-line" d={chart.newLine} stroke="#60a5fa" />

          {lastTotal ? (
            <circle className="chart-dot" cx={lastTotal[0]} cy={lastTotal[1]} r="3" fill="#a78bfa" stroke="#0a0a14" />
          ) : null}
          {lastNew ? (
            <circle className="chart-dot" cx={lastNew[0]} cy={lastNew[1]} r="3" fill="#60a5fa" stroke="#0a0a14" />
          ) : null}
        </svg>
      </div>
    </div>
  );
}
