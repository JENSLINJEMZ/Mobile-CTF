import type { SandboxLimitsDto } from "@ctf/shared";

import { humanCpu, humanRam } from "./format";
import { D_CLOCK, D_CPU, D_DRIVE, D_MEM, D_USERS, Svg } from "./miniIcons";

export function LimitsPanel({ limits }: { limits: SandboxLimitsDto | null }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Resource Allocation Limits</span>
        <button className="edit-btn" title="Configured by server defaults">
          Edit
        </button>
      </div>
      <div className="limits-list">
        <div className="limit-item">
          <span
            className="limit-ic"
            style={{
              ["--lc" as string]: "#22c55e",
              ["--lc-soft" as string]: "rgba(34,197,94,.14)",
              ["--lc-line" as string]: "rgba(34,197,94,.3)",
            }}
          >
            <Svg d={D_CPU} />
          </span>
          <span className="limit-label">Max CPU per Environment</span>
          <span className="limit-value">{humanCpu(limits?.maxCpuPerEnv ?? 0.5)}</span>
        </div>
        <div className="limit-item">
          <span
            className="limit-ic"
            style={{
              ["--lc" as string]: "#3b82f6",
              ["--lc-soft" as string]: "rgba(59,130,246,.14)",
              ["--lc-line" as string]: "rgba(59,130,246,.3)",
            }}
          >
            <Svg d={D_MEM} />
          </span>
          <span className="limit-label">Max RAM per Environment</span>
          <span className="limit-value">{humanRam(limits?.maxRamPerEnvMb ?? 64)}</span>
        </div>
        <div className="limit-item">
          <span
            className="limit-ic"
            style={{
              ["--lc" as string]: "#8b5cf6",
              ["--lc-soft" as string]: "rgba(139,92,246,.14)",
              ["--lc-line" as string]: "rgba(139,92,246,.3)",
            }}
          >
            <Svg d={D_DRIVE} />
          </span>
          <span className="limit-label">Image</span>
          <span className="limit-value">{limits?.image.replace(/^.+[/:]/, "") ?? "ctf-sandbox"}</span>
        </div>
        <div className="limit-item">
          <span
            className="limit-ic"
            style={{
              ["--lc" as string]: "#a78bfa",
              ["--lc-soft" as string]: "rgba(167,139,250,.14)",
              ["--lc-line" as string]: "rgba(167,139,250,.3)",
            }}
          >
            <Svg d={D_USERS} size={14} />
          </span>
          <span className="limit-label">Max Concurrent Environments</span>
          <span className="limit-value">{limits?.maxConcurrent ?? 4}</span>
        </div>
        <div className="limit-item">
          <span
            className="limit-ic"
            style={{
              ["--lc" as string]: "#22d3ee",
              ["--lc-soft" as string]: "rgba(34,211,238,.14)",
              ["--lc-line" as string]: "rgba(34,211,238,.3)",
            }}
          >
            <Svg d={D_CLOCK} />
          </span>
          <span className="limit-label">Session Timeout (TTL)</span>
          <span className="limit-value">
            {limits ? `${Math.round(limits.sessionTimeoutSeconds / 3600)} hours` : "2 hours"}
          </span>
        </div>
      </div>
    </div>
  );
}