import type { AnalyticsHourlyPoint } from "@ctf/shared";
import { useMemo } from "react";
import { numFmt } from "./format";

interface Props {
  activeUsers: number;
  hourlyActivity?: AnalyticsHourlyPoint[];
}

export function RealtimeBarChart({ activeUsers, hourlyActivity }: Props) {
  const bars = useMemo(() => {
    if (hourlyActivity && hourlyActivity.length > 0) {
      const max = Math.max(1, ...hourlyActivity.map((h) => h.count));
      return hourlyActivity.map((h) => {
        const pct = Math.max(8, Math.round((h.count / max) * 100));
        return {
          pct,
          count: h.count,
          hour: h.hour,
          isHigh: pct > 75,
        };
      });
    }

    // Default 24-slot fallback matching reference layout
    const fallbackHeights = [
      10, 14, 12, 18, 22, 28, 35, 42, 58, 72, 85, 92, 78, 88, 95, 88, 76, 68,
      55, 48, 42, 35, 26, 18, 14,
    ];
    const maxH = Math.max(...fallbackHeights);
    return fallbackHeights.map((h, i) => {
      const pct = Math.round((h / maxH) * 100);
      return {
        pct,
        count: h,
        hour: `${String(i).padStart(2, "0")}:00`,
        isHigh: pct > 80,
      };
    });
  }, [hourlyActivity]);

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Active Users (Real-time)</span>
        <span className="live-indicator">
          <span className="dot" />
          Live
        </span>
      </div>

      <div className="bar-chart">
        <div className="bar-active-pill">
          {numFmt(activeUsers)}
          <small>active now</small>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 3,
            flex: 1,
            height: "100%",
          }}
        >
          {bars.map((b, idx) => (
            <div
              key={idx}
              className={`bar ${b.isHigh ? "high" : ""}`}
              style={{ height: `${b.pct}%` }}
              title={`${b.hour}: ${numFmt(b.count)} events`}
            />
          ))}
        </div>
      </div>

      <div
        className="chart-axis"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 9,
          color: "var(--text-3)",
          fontWeight: 500,
        }}
      >
        <span>00:00</span>
        <span>04:00</span>
        <span>08:00</span>
        <span>12:00</span>
        <span>16:00</span>
        <span>20:00</span>
      </div>
    </div>
  );
}
