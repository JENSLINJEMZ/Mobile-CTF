import type { SandboxResourcesDto, SandboxHostDto } from "@ctf/shared";

import { humanBytes } from "./format";
import { Ring } from "./charts";
import type { LiveState } from "./useSandboxLive";

export function ResourceRings({
  resources,
  host,
  live,
}: {
  resources: SandboxResourcesDto | null;
  host: SandboxHostDto | null;
  live: LiveState;
}) {
  const res = resources;
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Resource Overview</span>
        {host ? <span className="res-host">{host.name}</span> : null}
        {live === "live" ? <span className="tag-live">LIVE</span> : null}
      </div>
      {host ? (
        <div className="res-host-line">
          <span className="res-host-name">{host.name}</span>
          <span className="res-host-detail">
            {host.os} · {host.cores} cores · {humanBytes(host.memTotalBytes)} RAM · Docker {host.dockerApiVersion}
          </span>
        </div>
      ) : null}
      <div className="res-grid">
        <Ring
          pct={res?.cpu.pct ?? 0}
          color="#8b5cf6"
          label="CPU"
          title={res?.cpu.load !== undefined ? `Load avg: ${res.cpu.load}` : undefined}
        />
        <Ring pct={res?.memory.pct ?? 0} color="#3b82f6" label="Memory" />
        <Ring pct={res?.storage.pct ?? 0} color="#22c55e" label="Storage" />
        <Ring
          pct={(res?.network.rxBytes ?? 0) + (res?.network.txBytes ?? 0) > 0 ? 4 : 0}
          color="#eab308"
          label="Network"
          title="Sandbox containers run with no external network"
        />
      </div>
    </div>
  );
}