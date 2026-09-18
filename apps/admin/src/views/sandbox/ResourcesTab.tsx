import type {
  SandboxCategoryPoint,
  SandboxHostDto,
  SandboxResourcesDto,
  SandboxTrendPoint,
} from "@ctf/shared";
import { useMemo, type ReactNode } from "react";

import { humanBytes } from "./format";
import { Donut, UsageChart } from "./charts";
import { D_CPU, D_DRIVE, D_MEM, D_NET, Svg } from "./miniIcons";

function StatTile({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="res-stat-tile">
      <span
        className="res-stat-ic"
        style={{
          ["--rs" as string]: color,
          background: `${color}14`,
          borderColor: `${color}40`,
          color,
        }}
      >
        {icon}
      </span>
      <div className="res-stat-text">
        <span className="res-stat-value" style={{ color }}>{value}</span>
        <span className="res-stat-label">{label}</span>
        <span className="res-stat-sub">{sub}</span>
      </div>
    </div>
  );
}

export function ResourcesTab({
  resources,
  trends,
  categories,
  total,
  host,
}: {
  resources: SandboxResourcesDto | null;
  trends: SandboxTrendPoint[];
  categories: SandboxCategoryPoint[];
  total: number;
  host: SandboxHostDto | null;
}) {
  const netTotal = useMemo(
    () => (resources?.network.rxBytes ?? 0) + (resources?.network.txBytes ?? 0),
    [resources],
  );

  return (
    <div className="tab-pane">
      <div className="bottom-row">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Usage Trends</span>
            <button className="select-sm">Last 7 Days</button>
          </div>
          <UsageChart trends={trends} />
        </div>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Environments by User</span>
          </div>
          <Donut points={categories} total={total} />
        </div>
      </div>

      <div className="res-summary-strip">
        <StatTile
          icon={<Svg d={D_CPU} size={14} />}
          label="CPU Load"
          value={`${resources?.cpu.load ?? 0} (${resources?.cpu.pct ?? 0}%)`}
          sub={`${host?.cores ?? 1} cores on ${host?.name ?? "host"}`}
          color="#8b5cf6"
        />
        <StatTile
          icon={<Svg d={D_MEM} size={14} />}
          label="Memory Used"
          value={humanBytes(resources?.memory.used ?? 0)}
          sub={`of ${humanBytes(resources?.memory.total ?? 0)} (${resources?.memory.pct ?? 0}%)`}
          color="#3b82f6"
        />
        <StatTile
          icon={<Svg d={D_DRIVE} size={14} />}
          label="Storage (NAS)"
          value={humanBytes(resources?.storage.used ?? 0)}
          sub={`of ${humanBytes(resources?.storage.total ?? 0)} (${resources?.storage.pct ?? 0}%)`}
          color="#22d3ee"
        />
        <StatTile
          icon={<Svg d={D_NET} size={14} />}
          label="Network Total"
          value={humanBytes(netTotal)}
          sub={`${humanBytes(resources?.network.rxBytes ?? 0)} inbound · ${humanBytes(resources?.network.txBytes ?? 0)} outbound`}
          color="#4ade80"
        />
      </div>
    </div>
  );
}