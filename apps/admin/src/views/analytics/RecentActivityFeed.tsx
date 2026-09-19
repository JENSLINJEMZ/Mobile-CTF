import type { AnalyticsRecentActivityRow } from "@ctf/shared";
import { EXTERNAL_LINK, FLAG_ICON } from "./icons";

interface Props {
  activity?: AnalyticsRecentActivityRow[];
  onViewAll?: () => void;
}

export function RecentActivityFeed({ activity, onViewAll }: Props) {
  const list = activity ?? [];

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Recent Activity</span>
        {onViewAll ? (
          <button
            type="button"
            className="panel-link"
            onClick={onViewAll}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            View All{" "}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: EXTERNAL_LINK }}
            />
          </button>
        ) : (
          <span className="panel-sub">Live Solves</span>
        )}
      </div>

      <div className="activity-list">
        {list.length > 0 ? (
          list.map((a) => (
            <div key={a.id} className="act-item">
              <span
                className="act-ic"
                style={{
                  backgroundColor: `${a.color}22`,
                  borderColor: `${a.color}55`,
                  color: a.color,
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
              <div className="act-body">
                <div
                  className="act-text"
                  dangerouslySetInnerHTML={{ __html: a.text }}
                />
                <div className="act-meta">
                  <span className="act-time">{a.time}</span>
                  {a.pts ? <span className="act-pts">{a.pts}</span> : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ color: "var(--text-3)", fontSize: 11, padding: "8px 0" }}>
            No recent activity recorded.
          </div>
        )}
      </div>
    </div>
  );
}
