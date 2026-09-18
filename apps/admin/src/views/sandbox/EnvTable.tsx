import type { SandboxContainerDto } from "@ctf/shared";

import { colorOf, fmtRemaining, fmtUptime, humanCpu, humanRam, statusLabel } from "./format";
import { D_BOX, D_DOTS_V, D_MONITOR, D_STOP, D_TERMINAL, Svg } from "./miniIcons";
import { Icon } from "../../icons";

export function Avatar({ username, i }: { username: string; i: number }) {
  const color = colorOf(username);
  return (
    <span className="user-avatar-sm">
      <svg viewBox="0 0 40 40">
        <defs>
          <linearGradient id={`ug-${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={`${color}66`} />
          </linearGradient>
        </defs>
        <rect width="40" height="40" fill={`url(#ug-${i})`} />
        <text x="20" y="26" textAnchor="middle" fontFamily="Inter" fontSize="18" fontWeight="800" fill="#fff">
          {username.charAt(0).toUpperCase()}
        </text>
      </svg>
    </span>
  );
}

function EnvRow({
  env,
  index,
  onStop,
  stopping,
}: {
  env: SandboxContainerDto;
  index: number;
  onStop: (id: string) => void;
  stopping: string | null;
}) {
  const stopped = env.status === "stopped";
  const avocado = colorOf(env.name);
  const cat = env.image.replace(/^.+[/:]/, "");

  return (
    <tr data-env={env.id}>
      <td className="cell-num">{index + 1}</td>
      <td>
        <div className="cell-env">
          <span
            className="env-cube"
            style={{
              ["--cube-color" as string]: avocado,
              ["--cube-soft" as string]: `${avocado}22`,
              ["--cube-line" as string]: `${avocado}55`,
            }}
          >
            <Svg d={D_BOX} size={16} />
          </span>
          <span className="env-name">
            <span className="id">{`env-${env.id}`}</span>
            <span className="cat">{cat || "sandbox"}</span>
          </span>
        </div>
      </td>
      <td>
        <div className="cell-challenge">
          <span
            className="challenge-icon"
            style={{
              ["--ch-color" as string]: "#a78bfa",
              ["--ch-soft" as string]: "rgba(139,92,246,.14)",
              ["--ch-line" as string]: "rgba(139,92,246,.35)",
            }}
          >
            <span className="ch-ic">
              <span style={{ width: 14, height: 14 }}>
                <Icon name={env.sessionId ? "spawn" : "box"} />
              </span>
            </span>
          </span>
          <span className="challenge-name">{env.sessionId ?? "Standalone"}</span>
        </div>
      </td>
      <td>
        <div className="cell-user">
          <Avatar username={env.user?.username ?? "?"} i={index} />
          <span className="user-handle">{env.user?.username ?? "—"}</span>
        </div>
      </td>
      <td>
        <span className={`status-pill ${env.status}`}>
          <span className="dot" />
          {statusLabel(env.status)}
        </span>
      </td>
      <td>
        <div className="cell-resources">
          <span className="v">{humanCpu(env.cpu)}</span>
          <span className="r">
            {humanRam(env.ramMb)}
            {env.memPct !== null ? ` · ${env.memPct}%` : ""}
          </span>
        </div>
      </td>
      <td>
        {stopped ? (
          <span className="cell-uptime" style={{ color: "var(--text-4)" }}>-</span>
        ) : (
          <span className="cell-uptime">{fmtUptime(env.uptimeSeconds)}</span>
        )}
      </td>
      <td>
        {stopped ? (
          <span className="cell-expires inactive">-</span>
        ) : (
          <span className="cell-expires">{fmtRemaining(env.expiresAt)}</span>
        )}
      </td>
      <td>
        <div className="cell-actions">
          <button className="action-icon term" aria-label="Terminal" title="Open terminal">
            <Svg d={D_TERMINAL} />
          </button>
          <button className="action-icon monitor" aria-label="Monitor" title="Live monitor">
            <Svg d={D_MONITOR} />
          </button>
          <button className="action-icon more" aria-label="More" title="More">
            <Svg d={D_DOTS_V} />
          </button>
          <button
            className="action-icon stop"
            aria-label="Stop"
            title="Stop environment"
            disabled={stopped}
            style={stopped ? { opacity: 0.35, cursor: "not-allowed" } : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onStop(env.id);
            }}
          >
            {stopping === env.id ? <span className="spin" /> : <Svg d={D_STOP} size={13} />}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function EnvTable({
  envs,
  daemonUp,
  onStop,
  stopping,
}: {
  envs: SandboxContainerDto[];
  daemonUp: boolean;
  onStop: (id: string) => void;
  stopping: string | null;
}) {
  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="env-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Environment Name</th>
              <th>Challenge</th>
              <th>User</th>
              <th>Status</th>
              <th>Resources</th>
              <th>Uptime</th>
              <th>Expires In</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody id="envTableBody">
            {envs.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  {daemonUp
                    ? "No environments match the current filters."
                    : "Sandbox daemon is unreachable — no environments visible."}
                </td>
              </tr>
            ) : (
              envs.map((env, i) => (
                <EnvRow key={env.id} env={env} index={i} onStop={onStop} stopping={stopping} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}