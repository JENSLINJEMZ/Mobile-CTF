import type { AnalyticsRolePoint } from "@ctf/shared";
import { useMemo } from "react";
import { numFmt } from "./format";
import { CHEVRON_DOWN } from "./icons";

interface Props {
  roles?: AnalyticsRolePoint[];
  totalUsers: number;
}

export function UserRolePanel({ roles, totalUsers }: Props) {
  const segments = useMemo(() => {
    if (!roles || roles.length === 0) return [];

    const C = 251.33; // 2 * pi * 40
    let offset = 0;

    return roles.map((r) => {
      const segLen = (r.pct / 100) * C;
      const strokeDasharray = `${segLen.toFixed(2)} ${C.toFixed(2)}`;
      const strokeDashoffset = (-offset).toFixed(2);
      offset += segLen;
      return {
        ...r,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [roles]);

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Registered Users by Role</span>
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
            <span className="donut-value">{numFmt(totalUsers)}</span>
            <span className="donut-label">Users</span>
          </div>
        </div>

        <div className="cat-legend">
          {roles && roles.length > 0 ? (
            roles.map((r, idx) => (
              <div key={idx} className="legend-row">
                <span className="swatch" style={{ background: r.color }} />
                <span className="n">{r.label}</span>
                <span className="count">{r.count}</span>
                <span className="pct">({r.pct}%)</span>
              </div>
            ))
          ) : (
            <div style={{ color: "var(--text-3)", fontSize: 11 }}>
              No users yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}