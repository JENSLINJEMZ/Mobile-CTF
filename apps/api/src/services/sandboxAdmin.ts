import type {
  SandboxActivityDto,
  SandboxCategoryPoint,
  SandboxContainerDto,
  SandboxHostDto,
  SandboxKpisDto,
  SandboxLimitsDto,
  SandboxResourcesDto,
  SandboxSnapshot,
  SandboxTrendPoint,
} from "@ctf/shared";
import { prisma } from "@ctf/database";
import type { ContainerInfo, ContainerStats } from "dockerode";
import { EventEmitter } from "node:events";
import { statfsSync } from "node:fs";
import { cpus, freemem, loadavg, totalmem } from "node:os";

import { env } from "../config/env";
import { logger } from "../utils/logger";
import { storageDir } from "./fileAssets";
import { createDockerClient } from "./sandbox/dockerRuntime";
import { getNasMetrics, parseDockerInfo } from "./sandbox/nasMetrics";

const SESSION_NAME_PREFIX = "ctf-tm-";
const ACTIVITY_LIMIT = 40;
const TREND_DAYS = 7;
const CATEGORY_COLORS = [
  "#a78bfa",
  "#60a5fa",
  "#f472b6",
  "#4ade80",
  "#22d3ee",
  "#fb923c",
  "#facc15",
  "#f87171",
];

const docker = createDockerClient();

const activityBus = new EventEmitter();

let ring: SandboxActivityDto[] = [];
let ringSequence = 0;
let activityWatchStarted = false;
let lastUserByContainer = new Map<string, string>();

function shortId(full: string): string {
  return full.slice(0, 10);
}

function toStatus(state: string): SandboxContainerDto["status"] {
  if (state === "running") return "running";
  if (state === "paused") return "paused";
  if (state === "created" || state === "restarting") return "created";
  return "stopped";
}

/* --------------------------------------------------------------------------
 * CPU% sampling — cumulative counters deltaed between snapshots.
 * ------------------------------------------------------------------------- */
interface CpuSample {
  cpuTotal: number;
  sysTotal: number;
  cores: number;
  at: number;
}
const cpuSamples = new Map<string, CpuSample>();

function cpuPercent(
  containerId: string,
  stats: ContainerStats | undefined,
): number | null {
  if (!stats?.cpu_stats) return null;
  const prev = cpuSamples.get(containerId);
  const cur: CpuSample = {
    cpuTotal: stats.cpu_stats.cpu_usage.total_usage,
    sysTotal: stats.cpu_stats.system_cpu_usage,
    cores:
      stats.cpu_stats.cpu_usage.percpu_usage?.length ??
      stats.cpu_stats.online_cpus ??
      1,
    at: Date.now(),
  };
  cpuSamples.set(containerId, cur);
  if (!prev) return null;
  const dtCpu = cur.cpuTotal - prev.cpuTotal;
  const dtSys = cur.sysTotal - prev.sysTotal;
  if (dtSys <= 0 || dtCpu < 0) return null;
  return Number(((dtCpu / dtSys) * cur.cores * 100).toFixed(1));
}

/* --------------------------------------------------------------------------
 * Docker event watch → recent activity (started / stopped / paused …).
 * ------------------------------------------------------------------------- */
function describeActivity(raw: {
  Action: string;
  id: string;
  Actor?: { Attributes?: { name?: string } };
}): { text: string; icon: string; color: string } {
  const name =
    (raw.Actor?.Attributes?.name ?? "").replace(/^\//, "") ?? "";
  const containerId =
    raw.Actor?.Attributes?.name && name
      ? shortId(name.replace(SESSION_NAME_PREFIX, "")) || raw.id.slice(0, 10)
      : raw.id.slice(0, 10);
  const tag = `env-${containerId}`;
  const user = name ? lastUserByContainer.get(name) ?? null : null;
  switch (raw.Action) {
    case "create":
      return {
        text: user
          ? `${user} created environment ${tag}`
          : `Environment ${tag} created`,
        icon: "plus",
        color: "#3b82f6",
      };
    case "start":
      return {
        text: user
          ? `${user} started environment ${tag}`
          : `Environment ${tag} started`,
        icon: "spawn",
        color: "#22c55e",
      };
    case "pause":
      return {
        text: user
          ? `${user} paused environment ${tag}`
          : `Environment ${tag} paused`,
        icon: "minus",
        color: "#eab308",
      };
    case "die":
    case "stop":
    case "kill":
      return {
        text: user
          ? `${user} stopped environment ${tag}`
          : `Environment ${tag} stopped`,
        icon: "box",
        color: "#ef4444",
      };
    default:
      return {
        text: `Environment ${tag} ${raw.Action}`,
        icon: "docker",
        color: "#8b5cf6",
      };
  }
}

function pushActivity(item: SandboxActivityDto): void {
  ring = [...ring.slice(-(ACTIVITY_LIMIT - 1)), item];
  activityBus.emit("activity", item);
}

export function startSandboxEventWatch(): void {
  if (activityWatchStarted) return;
  activityWatchStarted = true;
  void watchOnce();
}

async function watchOnce(): Promise<void> {
  try {
    const filters = JSON.stringify({
      type: ["container"],
      event: ["create", "start", "pause", "stop", "die", "kill"],
    });
    const stream = await docker.getEvents({ filters });
    stream.on("data", (chunk: Buffer) => {
      try {
        const raw = JSON.parse(chunk.toString("utf8")) as {
          Action: string;
          id: string;
          Actor?: { Attributes?: { name?: string } };
        };
        const name = String(raw.Actor?.Attributes?.name ?? "").replace(
          /^\//,
          "",
        );
        if (!name.startsWith(SESSION_NAME_PREFIX)) return;
        const { text, icon, color } = describeActivity(raw);
        pushActivity({
          id: `${raw.id}-${ringSequence++}`,
          time: Date.now(),
          text,
          color,
          icon,
        });
      } catch {
        /* ignore malformed event frame */
      }
    });
    stream.on("close", () => {
      setTimeout(() => void watchOnce(), 5000);
    });
    stream.on("error", (err) => {
      logger.warn({ err }, "sandbox event stream error; reconnecting");
      setTimeout(() => void watchOnce(), 5000);
    });
  } catch (err) {
    logger.warn({ err }, "sandbox event watch unavailable; will retry");
    setTimeout(() => void watchOnce(), 15_000);
  }
}

/* --------------------------------------------------------------------------
 * Snapshot
 * ------------------------------------------------------------------------- */
function activeCounts(containers: SandboxContainerDto[]): {
  running: number;
  stopped: number;
  paused: number;
} {
  let running = 0;
  let stopped = 0;
  let paused = 0;
  for (const c of containers) {
    if (c.status === "running") running += 1;
    else if (c.status === "paused") paused += 1;
    else stopped += 1;
  }
  return { running, stopped, paused };
}

async function buildTrends(): Promise<SandboxTrendPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - (TREND_DAYS - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.terminalSession.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, closedAt: true },
  });

  const days: SandboxTrendPoint[] = [];
  for (let i = 0; i < TREND_DAYS; i += 1) {
    const start = new Date(since);
    start.setDate(start.getDate() + i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const dayRows = rows.filter(
      (r) => r.createdAt >= start && r.createdAt < end,
    );
    const running = dayRows.filter(
      (r) => r.closedAt === null || r.closedAt >= end,
    ).length;
    const stopped = dayRows.filter(
      (r) => r.closedAt !== null && r.closedAt < end,
    ).length;
    days.push({
      date: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      running,
      stopped,
      total: Math.max(
        running + stopped,
        dayRows.length,
      ),
    });
  }
  return days;
}

async function buildKpis(
  containers: SandboxContainerDto[],
  storage: { usedBytes: number; totalBytes: number },
): Promise<SandboxKpisDto> {
  const { running, stopped, paused } = activeCounts(containers);
  const liveSessionUsers = new Set<number>();
  for (const c of containers) {
    if (c.user) liveSessionUsers.add(c.user.id);
  }

  const closed = await prisma.terminalSession.findMany({
    where: { closedAt: { not: null } },
    select: { createdAt: true, closedAt: true },
    orderBy: { closedAt: "desc" },
    take: 50,
  });
  const totalMinutes =
    closed.length > 0
      ? closed.reduce(
          (sum, r) =>
            sum + (r.closedAt!.getTime() - r.createdAt.getTime()) / 60000,
          0,
        )
      : 0;
  const avgSessionMinutes =
    closed.length > 0 ? Math.round(totalMinutes / closed.length) : 0;

  return {
    running,
    stopped,
    paused,
    total: containers.length,
    activeUsers: liveSessionUsers.size,
    storageUsedBytes: storage.usedBytes,
    storageTotalBytes: storage.totalBytes,
    avgSessionMinutes,
  };
}

export async function getSandboxSnapshot(): Promise<SandboxSnapshot> {
  const at = new Date();

  let daemonUp = true;
  let info: ContainerInfo[] = [];
  try {
    info = await docker.listContainers({ all: true });
  } catch (err) {
    daemonUp = false;
    logger.warn({ err }, "sandbox daemon list failed");
  }

  const sandboxContainers = info.filter(
    (c) =>
      c.Image === env.sandboxImage ||
      c.Names.some((n) => n.includes(SESSION_NAME_PREFIX)),
  );

  const sessions = await prisma.terminalSession.findMany({
    where: { containerId: { not: null } },
    select: {
      id: true,
      containerId: true,
      expiresAt: true,
      createdAt: true,
      user: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const sessionByContainerId = new Map(
    sessions.map((s) => [s.containerId, s]),
  );
  const sessionByName = new Map(
    sessions.map((s) => [`${SESSION_NAME_PREFIX}${s.id}`, s]),
  );

  const upUserByContainer = new Map<string, string>();
  for (const s of sessions) {
    const u = s.user;
    if (u && s.containerId)
      upUserByContainer.set(`${SESSION_NAME_PREFIX}${s.id}`, u.username);
  }
  lastUserByContainer = upUserByContainer;

  const containers: SandboxContainerDto[] = [];
  let netRxBytes = 0;
  let netTxBytes = 0;
  for (const c of sandboxContainers) {
    const name = (c.Names[0] ?? c.Id).replace(/^\//, "");
    const slug = name.startsWith(SESSION_NAME_PREFIX)
      ? name.slice(SESSION_NAME_PREFIX.length)
      : null;
    const session = slug
      ? (sessionByName.get(name) ??
        sessionByContainerId.get(c.Id))
      : sessionByContainerId.get(c.Id);
    const user = session?.user
      ? { id: session.user.id, username: session.user.username }
      : null;

    const nets = c.NetworkSettings?.Networks ?? {};
    const netTypes = Object.keys(nets);
    const firstNet = netTypes[0];
    const networkMode = c.HostConfig?.NetworkMode || (netTypes.length ? netTypes.join("+") : "none");
    const ipAddress =
      firstNet !== undefined && nets[firstNet]?.IPAddress
        ? nets[firstNet].IPAddress
        : null;
    const exposed = (c.Ports ?? []).find((p) => p.PublicPort != null);
    const exportPort = exposed
      ? `${exposed.PrivatePort}/${exposed.Type} → ${exposed.IP || "0.0.0.0"}:${exposed.PublicPort}`
      : null;

    let cpuPct: number | null = null;
    let memBytes: number | null = null;
    let memPct: number | null = null;
    let rxBytes = 0;
    let txBytes = 0;

    if (c.State === "running") {
      try {
        const stats = (await docker
          .getContainer(c.Id)
          .stats({ stream: false })) as unknown as ContainerStats;
        cpuPct = cpuPercent(c.Id, stats);
        memBytes = stats.memory_stats?.usage ?? null;
        const memLimit = stats.memory_stats?.limit ?? 0;
        if (memLimit > 0 && memBytes !== null) {
          memPct = Number(((memBytes / memLimit) * 100).toFixed(1));
        }
        if (stats.networks) {
          for (const iface of Object.values(stats.networks)) {
            rxBytes += iface.rx_bytes ?? 0;
            txBytes += iface.tx_bytes ?? 0;
          }
        }
        netRxBytes += rxBytes;
        netTxBytes += txBytes;
      } catch {
        cpuPct = null;
        memBytes = null;
        memPct = null;
      }
    }

    containers.push({
      id: shortId(c.Id),
      sessionId: session?.id ?? null,
      name: slug ?? c.Id.slice(0, 12),
      image: c.Image,
      status: toStatus(c.State),
      state: c.State,
      user,
      cpu: env.sandboxCpus,
      ramMb: env.sandboxMemoryMb,
      cpuPct,
      memBytes,
      memPct,
      uptimeSeconds:
        c.State === "running" ? Math.max(0, (at.getTime() / 1000) - c.Created) : null,
      createdAt:
        c.Created > 0 ? new Date(c.Created * 1000).toISOString() : null,
      expiresAt: session?.expiresAt.toISOString() ?? null,
      networkMode,
      ipAddress,
      rxBytes,
      txBytes,
      exportPort,
    });
  }

  const dir = await storageDir();
  const fs = statfsSync(dir);
  const storageTotal = fs.blocks * fs.bsize;
  const storageUsed = (fs.blocks - fs.bfree) * fs.bsize;

  const load = loadavg();
  const memTotal = totalmem();
  const memUsed = memTotal - freemem();
  const cores = cpus().length;

  // Live stats come from the NAS that hosts the sandbox engine.
  const nas = daemonUp ? await getNasMetrics() : null;
  let nasInfo: ReturnType<typeof parseDockerInfo> | null = null;
  if (daemonUp) {
    try {
      nasInfo = parseDockerInfo((await docker.info()) as Record<string, unknown>);
    } catch {
      nasInfo = null;
    }
  }

  const storageUsedBytes = nas?.storageUsedBytes ?? storageUsed;
  const storageTotalBytes = nas?.storageTotalBytes ?? storageTotal;
  const memTotalBytes = nas?.memTotalBytes ?? memTotal;
  const memUsedBytes = nas?.memUsedBytes ?? memUsed;
  const cpuLoad = nas?.cpuLoad ?? load[0] ?? 0;
  const cpuCores = nasInfo?.cores ?? cores;

  const { running, stopped, paused } = activeCounts(containers);
  const usersSet = new Set<number>();
  for (const c of containers) if (c.user) usersSet.add(c.user.id);

  const trends = await buildTrends();

  const categoryMap = new Map<string, number>();
  for (const c of containers) {
    const key = c.user?.username ?? "Unassigned";
    categoryMap.set(key, (categoryMap.get(key) ?? 0) + 1);
  }
  let paletteIndex = 0;
  const categories: SandboxCategoryPoint[] = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({
      name,
      value,
      color:
        CATEGORY_COLORS[paletteIndex++ % CATEGORY_COLORS.length] ?? "#a78bfa",
    }));

  const kpis = daemonUp
    ? await buildKpis(containers, { usedBytes: storageUsedBytes, totalBytes: storageTotalBytes })
    : {
        running,
        stopped,
        paused,
        total: containers.length,
        activeUsers: usersSet.size,
        storageUsedBytes,
        storageTotalBytes,
        avgSessionMinutes: 0,
      };

  const resources: SandboxResourcesDto = {
    cpu: {
      load: Number(cpuLoad.toFixed(2)),
      cores: cpuCores,
      pct: Math.max(
        0,
        Math.min(100, Math.round((cpuLoad / cpuCores) * 100)),
      ),
    },
    memory: {
      used: memUsedBytes,
      total: memTotalBytes,
      pct: Math.max(0, Math.round((memUsedBytes / memTotalBytes) * 100)),
    },
    storage: {
      used: storageUsedBytes,
      total: storageTotalBytes,
      pct: Math.max(
        0,
        Math.round((storageUsedBytes / storageTotalBytes) * 100),
      ),
    },
    network: { rxBytes: netRxBytes, txBytes: netTxBytes },
  };

  const host: SandboxHostDto | null = nasInfo
    ? {
        name: nasInfo.name,
        os: nasInfo.os,
        arch: nasInfo.arch,
        product: nasInfo.product,
        cores: nasInfo.cores,
        memTotalBytes: nasInfo.memTotalBytes,
        dockerRootDir: nasInfo.dockerRootDir,
        dockerApiVersion: nasInfo.serverVersion,
      }
    : null;

  const limits: SandboxLimitsDto = {
    image: env.sandboxImage,
    maxCpuPerEnv: env.sandboxCpus,
    maxRamPerEnvMb: env.sandboxMemoryMb,
    maxConcurrent: env.sandboxCreateConcurrency,
    pidsLimit: env.sandboxPidsLimit,
    sessionTimeoutSeconds: env.terminalTtlSeconds,
  };

  return {
    at: new Date().toISOString(),
    daemonUp,
    host,
    kpis,
    containers,
    resources,
    trends,
    categories,
    activity: [...ring].reverse(),
    limits,
  };
}

export function onSandboxActivity(
  listener: (item: SandboxActivityDto) => void,
): void {
  activityBus.on("activity", listener);
}

/** Force-stop a sandbox container; missing/already-stopped containers are a
 * no-op so admin actions are idempotent against a live daemon. */
export async function stopSandboxContainer(
  containerId: string,
  runtime: { kill(containerId: string): Promise<void> },
): Promise<void> {
  await runtime.kill(containerId);
}