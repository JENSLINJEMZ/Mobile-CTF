import type {
  SandboxContainerDto,
  SandboxResourcesDto,
} from "@ctf/shared";
import { useMemo } from "react";

import { humanBytes } from "./format";
import { D_BOX, D_ISOLATE, D_NET, Svg } from "./miniIcons";

function NetworkTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: string;
}) {
  return (
    <div className="net-tile">
      <span className="net-tile-label">{label}</span>
      <span className="net-tile-value" style={{ color: tone }}>
        {value || "0 B"}
      </span>
      {sub ? <span className="net-tile-sub">{sub}</span> : null}
    </div>
  );
}

export function NetworkTab({
  resources,
  containers,
  daemonUp,
}: {
  resources: SandboxResourcesDto | null;
  containers: SandboxContainerDto[];
  daemonUp: boolean;
}) {
  const net = resources?.network ?? { rxBytes: 0, txBytes: 0 };
  const totalBytes = (net.rxBytes ?? 0) + (net.txBytes ?? 0);

  const traffic = useMemo(() => {
    const rx = containers.reduce((s, c) => s + c.rxBytes, 0);
    const tx = containers.reduce((s, c) => s + c.txBytes, 0);
    return { rx, tx };
  }, [containers]);

  const isolated = containers.length === 0 || containers.every((c) => c.networkMode === "none");
  const linked = containers.filter((c) => c.networkMode !== "none" && c.ipAddress);

  return (
    <div className="tab-pane">
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Network</span>
          <span className={`net-mode-chip ${isolated ? "iso" : "live"}`}>
            <Svg d={isolated ? D_ISOLATE : D_NET} size={12} />
            {isolated ? "Isolated — no external network" : "Networked"}
          </span>
        </div>

        <div className="net-summary">
          <NetworkTile
            label="Inbound"
            value={humanBytes(net.rxBytes)}
            sub="bytes received by containers"
            tone="#22d3ee"
          />
          <NetworkTile
            label="Outbound"
            value={humanBytes(net.txBytes)}
            sub="bytes sent by containers"
            tone="#a78bfa"
          />
          <NetworkTile
            label="Total"
            value={humanBytes(totalBytes)}
            sub="cumulative since last snapshot"
            tone="#c4b5fd"
          />
          <NetworkTile
            label="Live Traffic"
            value={humanBytes(traffic.rx + traffic.tx)}
            sub={`${containers.length} tracked containers`}
            tone="#4ade80"
          />
        </div>

        <div className="table-wrap border-deep">
          <div className="table-scroll">
            <table className="env-table net-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Environment</th>
                  <th>Network Mode</th>
                  <th>IP Address</th>
                  <th>Exposed Port</th>
                  <th>Inbound (RX)</th>
                  <th>Outbound (TX)</th>
                </tr>
              </thead>
              <tbody>
                {containers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">
                      {daemonUp
                        ? "No environments running — network activity appears here once players provision sandboxes."
                        : "Sandbox daemon is unreachable — no network activity visible."}
                    </td>
                  </tr>
                ) : (
                  containers.map((c, i) => (
                    <tr key={c.id}>
                      <td className="cell-num">{i + 1}</td>
                      <td>
                        <div className="cell-env">
                          <span className="net-env-cube">
                            <Svg d={D_BOX} size={14} />
                          </span>
                          <span className="env-name">
                            <span className="id">{`env-${c.id}`}</span>
                            <span className="cat">{c.sessionId ?? "Standalone"}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`net-badge ${c.networkMode === "none" ? "iso" : "link"}`}>
                          {c.networkMode === "none"
                            ? "Isolated (none)"
                            : c.networkMode || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="cell-uptime">{c.ipAddress ?? "—"}</span>
                      </td>
                      <td>
                        <span className="cell-uptime">{c.exportPort ?? "—"}</span>
                      </td>
                      <td>
                        <span className="net-bytes rx">{humanBytes(c.rxBytes)}</span>
                      </td>
                      <td>
                        <span className="net-bytes tx">{humanBytes(c.txBytes)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="blind-row">
        <span className="blind-ic">
          <Svg d={isolated ? D_ISOLATE : D_NET} size={14} />
        </span>
        <span className="blind-text">
          {isolated
            ? "Sandbox images are created with NetworkMode \u201cnone\u201d, so each environment is cut off from the host and the outside world \u2014 traffic counters stay at zero by policy, not by accident."
            : `${linked.length} environment${linked.length === 1 ? "" : "s"} connected to a shared network. Inbound/outbound counters are sampled from live container stats.`}
        </span>
      </div>
    </div>
  );
}