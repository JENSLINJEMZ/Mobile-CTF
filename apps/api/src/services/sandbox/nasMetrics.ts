import { readFileSync } from "node:fs";
import { Client, type ClientChannel, type ConnectConfig } from "ssh2";

import { env } from "../../config/env";
import { logger } from "../../utils/logger";

/**
 * Live host metrics from the NAS that runs the user-sandbox Docker engine.
 * CPU load / memory come from /proc, storage from the filesystem that hosts
 * Docker's data root — all read over SSH (key-based). Values are cached so a
 * 3s snapshot cadence does not hammer the NAS.
 */

export interface NasMetrics {
  cpuLoad: number | null;
  memUsedBytes: number | null;
  memTotalBytes: number | null;
  storageUsedBytes: number | null;
  storageTotalBytes: number | null;
}

const CPU_TTL_MS = 4_000;
const DISK_TTL_MS = 15_000;

interface CpuCache {
  cpuLoad: number | null;
  memUsedBytes: number | null;
  memTotalBytes: number | null;
  at: number;
}

let cpuCache: CpuCache | null = null;
let diskCache: { used: number; total: number } | null = null;
let lastDiskFetchAt = 0;

export function sshRun(command: string, timeoutMs = 10_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const config: ConnectConfig = {
      host: env.sandboxNasSshHost,
      port: env.sandboxNasSshPort,
      username: env.sandboxNasSshUser,
      privateKey: readFileSync(env.sandboxNasSshIdentity),
      readyTimeout: 8_000,
      keepaliveInterval: 0,
    };

    const conn = new Client();
    let timer: NodeJS.Timeout | null = setTimeout(() => {
      conn.end();
      reject(new Error("NAS SSH timed out"));
    }, timeoutMs);

    const done = (err: string | null, out?: string) => {
      if (timer) clearTimeout(timer);
      timer = null;
      conn.end();
      if (err) reject(new Error(err));
      else resolve(out ?? "");
    };

    conn
      .on("ready", () => {
        conn.exec(command, (execErr: Error | undefined, stream: ClientChannel) => {
          if (execErr) {
            done(execErr.message);
            return;
          }
          let out = "";
          let errOut = "";
          stream.on("close", (code: number | null) => {
            if (code !== 0 && errOut.trim()) done(errOut.trim());
            else done(null, out);
          });
          stream.on("data", (d: Buffer) => {
            out += d.toString("utf8");
          });
          stream.stderr.on("data", (d: Buffer) => {
            errOut += d.toString("utf8");
          });
        });
      })
      .on("error", (e: Error) => done(e.message))
      .connect(config);
  });
}

const METRICS_CMD = [
  "ROOT=$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo /)",
  'echo "L=$(awk \'{print $1}\' /proc/loadavg 2>/dev/null || echo 0)"',
  'echo "T=$(awk \'/^MemTotal:/{print $2}\' /proc/meminfo 2>/dev/null || echo 0)"',
  'echo "A=$(awk \'/^MemAvailable:/{print $2}\' /proc/meminfo 2>/dev/null || echo 0)"',
  'FS=$(stat -fc "%b %S %f" "$ROOT" 2>/dev/null || echo "0 1 0")',
  'echo "FS=$FS"',
].join(" && ");

function parseKv(lines: string[], k: string): number | null {
  const line = lines.find((l) => l.startsWith(`${k}=`));
  const val = line ? line.slice(k.length + 1).trim() : "";
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

async function fetchNasUsage(): Promise<NasMetrics | null> {
  try {
    const raw = await sshRun(METRICS_CMD);
    const lines = raw.split("\n");

    const cpuLoad = parseKv(lines, "L");
    const memTotalKb = parseKv(lines, "T");
    const memAvailKb = parseKv(lines, "A");
    const fsMatch = raw.match(/FS=(\d+) (\d+) (\d+)/);
    const [blocks, blockSize, freeBlocks] = (fsMatch?.slice(1) ?? []).map(
      Number,
    );

    const memTotalBytes = memTotalKb !== null ? memTotalKb * 1024 : null;
    const memAvailBytes = memAvailKb !== null ? memAvailKb * 1024 : null;

    return {
      cpuLoad,
      memUsedBytes:
        memTotalBytes !== null && memAvailBytes !== null
          ? memTotalBytes - memAvailBytes
          : null,
      memTotalBytes,
      storageUsedBytes:
        blocks && blockSize && freeBlocks
          ? (blocks - freeBlocks) * blockSize
          : null,
      storageTotalBytes: blocks && blockSize ? blocks * blockSize : null,
    };
  } catch (err) {
    logger.warn({ err }, "NAS host metrics unavailable");
    return null;
  }
}

export async function getNasMetrics(): Promise<NasMetrics | null> {
  const now = Date.now();

  if (
    cpuCache &&
    diskCache &&
    now - cpuCache.at < CPU_TTL_MS &&
    now - lastDiskFetchAt < DISK_TTL_MS
  ) {
    return {
      cpuLoad: cpuCache.cpuLoad,
      memUsedBytes: cpuCache.memUsedBytes,
      memTotalBytes: cpuCache.memTotalBytes,
      storageUsedBytes: diskCache.used,
      storageTotalBytes: diskCache.total,
    };
  }

  const fresh = await fetchNasUsage();
  if (!fresh) return null;

  cpuCache = {
    cpuLoad: fresh.cpuLoad,
    memUsedBytes: fresh.memUsedBytes,
    memTotalBytes: fresh.memTotalBytes,
    at: now,
  };
  if (fresh.storageTotalBytes !== null && fresh.storageUsedBytes !== null) {
    diskCache = {
      used: fresh.storageUsedBytes,
      total: fresh.storageTotalBytes,
    };
    lastDiskFetchAt = now;
  }

  return fresh;
}

export interface NasDockerInfo {
  name: string;
  os: string;
  osType: string;
  arch: string;
  product: string;
  cores: number;
  memTotalBytes: number;
  dockerRootDir: string;
  serverVersion: string;
}

export function parseDockerInfo(info: Record<string, unknown>): NasDockerInfo {
  return {
    name: String(info.Name ?? "unknown"),
    os: String(info.OperatingSystem ?? "unknown"),
    osType: String(info.OsType ?? "linux"),
    arch: String(info.Architecture ?? "unknown"),
    product: String(info.OSType ?? "Docker"),
    cores: Number(info.NCPU ?? 0),
    memTotalBytes: Number(info.MemTotal ?? 0),
    dockerRootDir: String(info.DockerRootDir ?? "/var/lib/docker"),
    serverVersion: String(info.ServerVersion ?? "unknown"),
  };
}