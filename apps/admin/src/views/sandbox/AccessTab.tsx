import type { SandboxLimitsDto } from "@ctf/shared";

import { LimitsPanel } from "./LimitsPanel";
import { SecurityPanel } from "./SecurityPanel";
import { D_LOCK, Svg } from "./miniIcons";

export function AccessTab({ limits }: { limits: SandboxLimitsDto | null }) {
  return (
    <div className="tab-pane">
      <div className="grid-2col">
        <LimitsPanel limits={limits} />
        <SecurityPanel />
      </div>
      <div className="blind-row">
        <span className="blind-ic">
          <Svg d={D_LOCK} size={14} />
        </span>
        <span className="blind-text">
          Limits are enforced per container at the Docker engine level — CPU shares, memory,
          and PID constraints are hard caps, not soft guidance. Isolation policies are baked
          into the sandbox image.
        </span>
      </div>
    </div>
  );
}