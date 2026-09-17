import { APP_VERSION, type SystemStatusDto } from "@ctf/shared";
import { prisma } from "@ctf/database";
import { readdir, stat, statfsSync } from "node:fs";
import { cpus, freemem, loadavg, totalmem } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { checkPostgres, checkRedis } from "./dependencies";
import { DockerSandboxRuntime } from "./sandbox/dockerRuntime";
import { getSandboxRuntime } from "./terminalSessions";
import { storageDir } from "./fileAssets";

const readdirAsync = promisify(readdir);
const statAsync = promisify(stat);

async function dirSize(root: string): Promise<number> {
  let total = 0;
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdirAsync(dir, { withFileTypes: true }).catch(
      () => [],
    );
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const s = await statAsync(full).catch(() => null);
        if (s) total += s.size;
      }
    }
  };
  await walk(root);
  return total;
}

function humanBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export async function getSystemStatus(): Promise<SystemStatusDto> {
  const dir = await storageDir();

  const [db, redis, sandbox, docker, challengeBytes, uploadBytes] =
    await Promise.all([
      checkPostgres(),
      checkRedis(),
      getSandboxRuntime()
        .isAvailable()
        .then(
          (ok) => ({
            ok,
            runtime: getSandboxRuntime().type,
          }),
          () => ({ ok: false, runtime: getSandboxRuntime().type }),
        ),
      new DockerSandboxRuntime().isAvailable().then(
        (ok) => ok,
        () => false,
      ),
      prisma.attachment.aggregate({ _sum: { sizeBytes: true } }),
      prisma.fileAsset.aggregate({ _sum: { sizeBytes: true } }),
    ]);

  const fs = statfsSync(dir);
  const diskTotal = fs.blocks * fs.bsize;
  const diskUsed = (fs.blocks - fs.bfree) * fs.bsize;

  const storedBytes = await dirSize(dir);
  const memTotal = totalmem();
  const memUsed = memTotal - freemem();
  const lv = loadavg();
  const cpu = cpus();

  const services: SystemStatusDto["services"] = [
    { key: "database", ok: db, detail: db ? "Connected" : "Unreachable" },
    { key: "redis", ok: redis, detail: redis ? "PONG" : "Unreachable" },
    {
      key: "docker",
      ok: docker,
      detail: docker ? "Daemon reachable" : "Daemon offline",
    },
    {
      key: "sandbox",
      ok: sandbox.ok,
      detail: `${sandbox.runtime}${sandbox.ok ? " ready" : " unavailable"}`,
    },
    { key: "fileStorage", ok: true, detail: `${humanBytes(storedBytes)} stored` },
    { key: "proxy", ok: false, detail: "Not configured" },
    { key: "mail", ok: false, detail: "Not configured" },
  ];

  const challenge = Number(challengeBytes._sum.sizeBytes ?? 0);
  const uploads = Number(uploadBytes._sum.sizeBytes ?? 0);
  const others = Math.max(diskUsed - challenge - uploads, 0);
  const buckets: SystemStatusDto["storage"]["buckets"] = [
    { name: "Challenge Files", bytes: challenge, color: "#a855f7" },
    { name: "User Uploads", bytes: uploads, color: "#22d3ee" },
    { name: "Logs", bytes: 0, color: "#22c55e" },
    { name: "Others", bytes: others, color: "#ec4899" },
  ];

  return {
    checkedAt: new Date().toISOString(),
    services,
    resources: {
      cpuCount: cpu.length,
      cpuModel: cpu[0]?.model ?? "unknown",
      load1: Number((lv[0] ?? 0).toFixed(2)),
      load5: Number((lv[1] ?? 0).toFixed(2)),
      load15: Number((lv[2] ?? 0).toFixed(2)),
      memoryTotalBytes: memTotal,
      memoryUsedBytes: memUsed,
      processRssBytes: process.memoryUsage().rss,
      uptimeSeconds: Math.round(process.uptime()),
      version: APP_VERSION,
    },
    storage: {
      path: dir,
      usedBytes: diskUsed,
      totalBytes: diskTotal,
      buckets,
    },
  };
}