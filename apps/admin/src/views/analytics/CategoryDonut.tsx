import type { AnalyticsCategoryPoint } from "@ctf/shared";
import { useMemo } from "react";
import { numFmt } from "./format";
import { CHEVRON_DOWN } from "./icons";

interface Props {
  categories?: AnalyticsCategoryPoint[];
  totalChallenges: number;
}

export function CategoryDonut({ categories, totalChallenges }: Props) {
  const segments = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    const C = 251.33; // 2 * pi * 40
    let offset = 0;

    return categories.map((cat) => {
      const segLen = (cat.pct / 100) * C;
      const strokeDasharray = `${segLen.toFixed(2)} ${C.toFixed(2)}`;
      const strokeDashoffset = (-offset).toFixed(2);
      offset += segLen;
      return {
        ...cat,
        strokeDasharray,
        strokeDashoffset,
        color: cat.color,
      };
    });
  }, [categories]);

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Challenge Category Distribution</span>
        <button className="select-sm">
          By Count{" "}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            dangerouslySetInnerHTML={{ __html: CHEVRON_DOWN }}
          />
        </button>
      </div>

      <div className="cat-wrap">
        <div className="donut">
          <svg viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#1a1a30"
              strokeWidth="14"
            />
            {segments.map((seg, idx) => (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={seg.color}
                strokeWidth="14"
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
              />
            ))}
          </svg>

          <div className="donut-center">
            <span className="donut-value">{numFmt(totalChallenges)}</span>
            <span className="donut-label">Challenges</span>
          </div>
        </div>

        <div className="cat-legend">
          {categories && categories.length > 0 ? (
            categories.map((c, idx) => (
              <div key={idx} className="legend-row">
                <span className="swatch" style={{ background: c.color }} />
                <span className="n">{c.name}</span>
                <span className="count">{c.count}</span>
                <span className="pct">({c.pct}%)</span>
              </div>
            ))
          ) : (
            <div style={{ color: "var(--text-3)", fontSize: 11 }}>
              No categories defined.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
