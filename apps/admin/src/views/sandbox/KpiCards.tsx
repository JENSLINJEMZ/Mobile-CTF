import type { SandboxSnapshot } from "@ctf/shared";

import { humanBytes } from "./format";
import { D_ARROW, D_BOX, D_CLOCK, D_DRIVE, D_STOP, D_USERS, Svg } from "./miniIcons";
import { Sparkline } from "./charts";
import type { LiveState } from "./useSandboxLive";

export function KpiCards({
  snap,
  live,
  sparkRunning,
  sparkStopped,
  sparkTotal,
}: {
  snap: SandboxSnapshot | null;
  live: LiveState;
  sparkRunning: number[];
  sparkStopped: number[];
  sparkTotal: number[];
}) {
  const kpis = snap?.kpis;

  return (
    <div className="kpi-row">
      <div className="kpi running">
        <div className="kpi-top">
          <span className="kpi-icon">
            <Svg d={D_BOX} size={17} />
          </span>
          <span className={`live-chip ${live}`}>
            {live === "live" ? "LIVE" : live === "connecting" ? "…" : "OFFLINE"}
          </span>
        </div>
        <div className="kpi-value">{kpis?.running ?? 0}</div>
        <div className="kpi-label">Running</div>
        <div className="kpi-foot">
          <span className="kpi-change up">
            <Svg d={D_ARROW} size={10} />
            {live === "live" ? "live" : "—"}
          </span>
          <Sparkline values={sparkRunning} color="#8b5cf6" />
        </div>
      </div>

      <div className="kpi stopped">
        <div className="kpi-top">
          <span className="kpi-icon">
            <Svg d={D_STOP} size={15} />
          </span>
        </div>
        <div className="kpi-value">{kpis?.stopped ?? 0}</div>
        <div className="kpi-label">Stopped</div>
        <div className="kpi-foot">
          <span className="kpi-change down">
            <Svg d={D_ARROW} size={10} style={{ transform: "rotate(180deg)" }} />
            7d
          </span>
          <Sparkline values={sparkStopped} color="#ef4444" />
        </div>
      </div>

      <div className="kpi users">
        <div className="kpi-top">
          <span className="kpi-icon">
            <Svg d={D_USERS} size={17} />
          </span>
        </div>
        <div className="kpi-value">{kpis?.activeUsers ?? 0}</div>
        <div className="kpi-label">Active Users</div>
        <div className="kpi-foot">
          <span className="kpi-change up">
            <Svg d={D_ARROW} size={10} />
            live
          </span>
          <Sparkline values={sparkTotal} color="#3b82f6" />
        </div>
      </div>

      <div className="kpi storage">
        <div className="kpi-top">
          <span className="kpi-icon">
            <Svg d={D_DRIVE} size={17} />
          </span>
        </div>
        <div className="kpi-value">
          {kpis ? humanBytes(kpis.storageTotalBytes) : "0"}
        </div>
        <div className="kpi-label">Storage (NAS)</div>
        <div className="kpi-foot">
          <span className="kpi-change up">
            <Svg d={D_ARROW} size={10} />
            {kpis ? `${Math.round((kpis.storageUsedBytes / Math.max(kpis.storageTotalBytes, 1)) * 100)}%` : "—"}
          </span>
          <Sparkline values={sparkStopped} color="#3b82f6" />
        </div>
      </div>

      <div className="kpi session">
        <div className="kpi-top">
          <span className="kpi-icon">
            <Svg d={D_CLOCK} size={17} />
          </span>
        </div>
        <div className="kpi-value">
          {kpis ? `${(kpis.avgSessionMinutes / 60).toFixed(1)}` : "0"}
        </div>
        <div className="kpi-label">Avg. Session Time (hours)</div>
        <div className="kpi-foot">
          <span className="kpi-change up">
            <Svg d={D_ARROW} size={10} />
            sessions
          </span>
          <Sparkline values={sparkRunning} color="#22c55e" />
        </div>
      </div>
    </div>
  );
}