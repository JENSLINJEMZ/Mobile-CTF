import type { SandboxActivityDto } from "@ctf/shared";

import { relativeTime } from "./format";
import { Svg } from "./miniIcons";
import { Icon } from "../../icons";

const D_ARROW_RIGHT =
  "<path d='M5 12h13'/><path d='m13 6 6 6-6 6'/>";

export function ActivityFeed({
  activity,
  live,
}: {
  activity: SandboxActivityDto[];
  live: boolean;
}) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Recent Activity</span>
        <button className="panel-link">
          {live ? "Live" : "Buffer"}
          <Svg d={D_ARROW_RIGHT} size={12} />
        </button>
      </div>
      <div className="activity-list" id="activityList">
        {activity.length === 0 ? (
          <div className="act-empty">
            No sandbox activity yet — environments appear here as they start and stop.
          </div>
        ) : (
          activity.map((a) => (
            <div key={a.id} className="act-item">
              <span
                className="act-ic"
                style={{
                  ["--ac" as string]: a.color,
                  ["--ac-soft" as string]: `${a.color}22`,
                  ["--ac-line" as string]: `${a.color}55`,
                }}
              >
                <span style={{ width: 12, height: 12, display: "inline-flex" }}>
                  <Icon name={a.icon} />
                </span>
              </span>
              <div className="act-body">
                <div
                  className="act-text"
                  dangerouslySetInnerHTML={{ __html: a.text.replace(/`/g, "") }}
                />
                <div className="act-time">{relativeTime(a.time)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}