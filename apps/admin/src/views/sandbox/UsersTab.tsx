import type {
  SandboxContainerDto,
  SandboxContainerStatus,
} from "@ctf/shared";
import { useMemo } from "react";

import { D_USERS, Svg } from "./miniIcons";
import { humanCpu, humanRam, relativeTime } from "./format";
import { Avatar } from "./EnvTable";

interface UserEnv {
  id: string;
  sessionId: string | null;
  status: SandboxContainerStatus;
}

interface UserAgg {
  key: string;
  username: string;
  total: number;
  running: number;
  paused: number;
  stopped: number;
  allocatedCpu: number;
  allocatedRamMb: number;
  peakCpuPct: number | null;
  peakMemPct: number | null;
  lastActive: string | null;
  envs: UserEnv[];
}

function aggregateUsers(containers: SandboxContainerDto[]): UserAgg[] {
  const map = new Map<string, UserAgg>();
  for (const c of containers) {
    const key = c.user ? `${c.user.id}` : "unassigned";
    let agg = map.get(key);
    if (!agg) {
      agg = {
        key,
        username: c.user?.username ?? "Unassigned",
        total: 0,
        running: 0,
        paused: 0,
        stopped: 0,
        allocatedCpu: 0,
        allocatedRamMb: 0,
        peakCpuPct: null,
        peakMemPct: null,
        lastActive: null,
        envs: [],
      };
      map.set(key, agg);
    }
    agg.total += 1;
    if (c.status === "running") agg.running += 1;
    else if (c.status === "paused") agg.paused += 1;
    else agg.stopped += 1;
    agg.allocatedCpu += c.cpu;
    agg.allocatedRamMb += c.ramMb;
    if (c.cpuPct !== null) agg.peakCpuPct = Math.max(agg.peakCpuPct ?? 0, c.cpuPct);
    if (c.memPct !== null) agg.peakMemPct = Math.max(agg.peakMemPct ?? 0, c.memPct);
    if (c.createdAt && (!agg.lastActive || c.createdAt > agg.lastActive)) {
      agg.lastActive = c.createdAt;
    }
    agg.envs.push({ id: c.id, sessionId: c.sessionId, status: c.status });
  }
  return [...map.values()]
    .sort((a, b) => b.running - a.running || b.total - a.total)
    .map((agg) => ({
      ...agg,
      envs: agg.envs.sort((a, b) => {
        const ord: Record<SandboxContainerStatus, number> = {
          running: 0,
          paused: 1,
          created: 2,
          stopped: 3,
        };
        return ord[a.status] - ord[b.status];
      }),
    }));
}

function EnvChip({ env, i }: { env: UserEnv; i: number }) {
  const color =
    env.status === "running"
      ? "#4ade80"
      : env.status === "paused"
        ? "#f5a524"
        : env.status === "created"
          ? "#93c5fd"
          : "#64748b";
  return (
    <span
      className="env-chip"
      title={`${env.sessionId ?? "Standalone"} · ${env.status}`}
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}
    >
      {`env-${env.id}`}
    </span>
  );
}

export function UsersTab({
  containers,
  daemonUp,
}: {
  containers: SandboxContainerDto[];
  daemonUp: boolean;
}) {
  const users = useMemo(() => aggregateUsers(containers), [containers]);
  const runningTotal = users.reduce((s, u) => s + u.running, 0);
  const envTotal = users.reduce((s, u) => s + u.total, 0);

  return (
    <div className="tab-pane">
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Users</span>
          <span className="panel-sub">
            {users.length} user{users.length === 1 ? "" : "s"} · {runningTotal} running / {envTotal} environments
          </span>
        </div>
        <div className="table-wrap border-deep">
          <div className="table-scroll">
            <table className="env-table user-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Environments</th>
                  <th>Allocated</th>
                  <th>Peak Usage</th>
                  <th>Last Active</th>
                  <th>Environment IDs</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">
                      {daemonUp
                        ? "No environments yet — they appear here as players provision sandboxes."
                        : "Sandbox daemon is unreachable — no user activity visible."}
                    </td>
                  </tr>
                ) : (
                  users.map((u, i) => (
                    <tr key={u.key}>
                      <td className="cell-num">{i + 1}</td>
                      <td>
                        <div className="cell-user">
                          <Avatar username={u.username} i={i} />
                          <span className="user-handle">{u.username}</span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-counts">
                          <span className="pill-mini g">{u.running} running</span>
                          {u.paused > 0 ? (
                            <span className="pill-mini y">{u.paused} paused</span>
                          ) : null}
                          {u.stopped > 0 ? (
                            <span className="pill-mini r">{u.stopped} stopped</span>
                          ) : null}
                          <span className="pill-mini plain">{u.total} total</span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-resources">
                          <span className="v">{humanCpu(u.allocatedCpu)}</span>
                          <span className="r">{humanRam(u.allocatedRamMb)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-resources">
                          <span className="v">
                            {u.peakCpuPct !== null ? `${u.peakCpuPct}% CPU` : "—"}
                          </span>
                          <span className="r">
                            {u.peakMemPct !== null ? `${u.peakMemPct}% RAM` : "—"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="cell-uptime">
                          {u.lastActive ? relativeTime(new Date(u.lastActive).getTime()) : "—"}
                        </span>
                      </td>
                      <td>
                        <div className="user-envs">
                          {u.envs.slice(0, 3).map((env, ei) => (
                            <EnvChip key={env.id} env={env} i={ei} />
                          ))}
                          {u.envs.length > 3 ? (
                            <span className="env-chip more">+{u.envs.length - 3} more</span>
                          ) : null}
                        </div>
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
          <Svg d={D_USERS} size={14} />
        </span>
        <span className="blind-text">
          Users are grouped by the account that owns each environment. Peak usage is sampled
          from live container stats; allocation reflects the configured per-env limits.
        </span>
      </div>
    </div>
  );
}