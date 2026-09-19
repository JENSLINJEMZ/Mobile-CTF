import type { AnalyticsHeatmapCell } from "@ctf/shared";
import { numFmt } from "./format";

interface Props {
  cells?: AnalyticsHeatmapCell[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ActivityHeatmap({ cells }: Props) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Activity Heatmap (Users)</span>
      </div>

      <div className="heatmap">
        <div className="hm-days">
          {DAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="hm-body">
          <div className="hm-hours">
            <span>0</span>
            <span>6</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>

          <div className="hm-grid">
            {cells && cells.length > 0
              ? cells.map((c, idx) => {
                  const levelClass = c.level > 0 ? `l${c.level}` : "";
                  const hourStart = c.hour * 2;
                  const hourEnd = hourStart + 2;
                  return (
                    <div
                      key={idx}
                      className={`hm-cell ${levelClass}`}
                      title={`${DAYS[c.day]} ${String(hourStart).padStart(2, "0")}:00 - ${String(hourEnd).padStart(2, "0")}:00: ${numFmt(c.count)} submissions`}
                    />
                  );
                })
              : Array.from({ length: 84 }).map((_, idx) => (
                  <div key={idx} className="hm-cell" />
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
