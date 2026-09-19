import type { AnalyticsChallengeRow } from "@ctf/shared";
import { numFmt } from "./format";
import { CHEVRON_DOWN, FLAG_ICON } from "./icons";

interface Props {
  challenges: AnalyticsChallengeRow[];
}

const PALETTE = ["#ef4444", "#60a5fa", "#a78bfa", "#4ade80", "#f97316", "#facc15"];

export function TopChallengesList({ challenges }: Props) {
  const topList = challenges.slice(0, 5);

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Top Challenges</span>
        <button className="select-sm">
          By Solves{" "}
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

      <div className="top-list">
        {topList.length > 0 ? (
          topList.map((c, idx) => {
            const color = PALETTE[idx % PALETTE.length] ?? "#a78bfa";
            return (
              <div key={c.id} className="top-row">
                <span className="top-rank">{idx + 1}</span>
                <span
                  className="top-icon"
                  style={{
                    backgroundColor: `${color}22`,
                    borderColor: `${color}55`,
                    color,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dangerouslySetInnerHTML={{ __html: FLAG_ICON }}
                  />
                </span>
                <span className="top-name" title={c.title}>
                  {c.title}
                </span>
                <span className="top-count">{numFmt(c.solvedCount)}</span>
              </div>
            );
          })
        ) : (
          <div style={{ color: "var(--text-3)", fontSize: 11, padding: "8px 0" }}>
            No challenges available.
          </div>
        )}
      </div>
    </div>
  );
}
