import type {
  TerminalCrashEvent,
  TerminalExitEvent,
  TerminalOutputEvent,
  TerminalSessionStatus,
  TerminalSessionDto,
} from "@ctf/shared";
import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";

import { prisma } from "@ctf/database";
import { ApiError } from "../middleware/errors";
import { env } from "../config/env";
import { stripAnsi } from "../utils/ansi";
import { logger } from "../utils/logger";
import { DockerSandboxRuntime } from "./sandbox/dockerRuntime";
import { scanDestructiveInput } from "./sandbox/destructiveGuard";
import type { SandboxRuntime } from "./sandbox/types";

export const terminalEvents = new EventEmitter();

function toDto(row: {
  id: string;
  status: TerminalSessionStatus;
  ttlSeconds: number;
  createdAt: Date;
  expiresAt: Date;
  closedAt: Date | null;
  crashReason: string | null;
}): TerminalSessionDto {
  return {
    id: row.id,
    status: row.status,
    ttlSeconds: row.ttlSeconds,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    crashReason: row.crashReason,
  };
}

function sessionId(): string {
  return `tm_${randomBytes(16).toString("hex")}`;
}

let runtime: SandboxRuntime = new DockerSandboxRuntime();

/**
 * Swap the backing sandbox runtime (tests inject a fake; server keeps docker).
 */
export function configureSandboxRuntime(next: SandboxRuntime): void {
  runtime = next;
}

export function getSandboxRuntime(): SandboxRuntime {
  return runtime;
}

async function assertSandboxAvailable(): Promise<void> {
  if (env.sandboxEnabled && !(await runtime.isAvailable())) {
    throw new ApiError(
      503,
      "SANDBOX_UNAVAILABLE",
      "Sandbox runtime is not available",
    );
  }
}

export async function createTerminalSession(
  userId: number,
): Promise<TerminalSessionDto> {
  await assertSandboxAvailable();

  const activeCount = await prisma.terminalSession.count({
    where: { userId, status: { in: ["CREATING", "RUNNING"] } },
  });
  if (activeCount >= env.terminalMaxActive) {
    throw new ApiError(
      429,
      "SESSION_LIMIT",
      "Terminal session limit reached; close one first",
    );
  }

  const now = Date.now();
  const row = await prisma.terminalSession.create({
    data: {
      id: sessionId(),
      userId,
      status: "CREATING",
      ttlSeconds: env.terminalTtlSeconds,
      expiresAt: new Date(now + env.terminalTtlSeconds * 1000),
    },
  });

  try {
    const instance = await runtime.create(row.id);
    const containerId = instance.containerId;

    wireOutputStream(row.id, instance.stream);

    const updated = await prisma.terminalSession.update({
      where: { id: row.id },
      data: { status: "RUNNING", containerId },
    });

    observeExit(row.id, instance.exited);

    return toDto(updated);
  } catch (err) {
    logger.error(
      { err, sessionId: row.id },
      "failed to start terminal sandbox",
    );
    await prisma.terminalSession.update({
      where: { id: row.id },
      data: { status: "FAILED", closedAt: new Date() },
    });
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      502,
      "SANDBOX_START_FAILED",
      "Could not start sandbox container",
    );
  }
}

function wireOutputStream(
  sessionIdValue: string,
  stream: NodeJS.ReadableStream,
): void {
  stream.on("data", (chunk: Buffer | string) => {
    const text = stripAnsi(
      Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk,
      env.terminalMaxOutput,
    );
    if (text)
      terminalEvents.emit("output", {
        sessionId: sessionIdValue,
        data: text,
      } satisfies TerminalOutputEvent);
  });
}

function observeExit(
  sessionIdValue: string,
  exited: Promise<number | null>,
): void {
  exited
    .then((code) => handleContainerExit(sessionIdValue, code))
    .catch((err) => {
      logger.error({ err, sessionId: sessionIdValue }, "sandbox exited with error");
      return handleContainerExit(sessionIdValue, null);
    });
}

async function handleContainerExit(
  sessionIdValue: string,
  code: number | null,
): Promise<void> {
  const current = await prisma.terminalSession.findUnique({
    where: { id: sessionIdValue },
  });
  if (!current) return;
  // A guard-triggered crash already updated the row and emitted
  // `terminal:crash` in crashTerminalSession; do not overwrite or double-report.
  if (current.status === "CRASHED") return;
  if (current.status === "CREATING" || current.status === "RUNNING") {
    await prisma.terminalSession.update({
      where: { id: sessionIdValue },
      data: { status: "CLOSED", closedAt: new Date() },
    });
  }
  terminalEvents.emit("exit", {
    sessionId: sessionIdValue,
    code,
  } satisfies TerminalExitEvent);
}

export async function listTerminalSessions(
  userId: number,
): Promise<TerminalSessionDto[]> {
  const rows = await prisma.terminalSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map(toDto);
}

export async function getTerminalSession(
  userId: number,
  id: string,
): Promise<TerminalSessionDto> {
  const row = await prisma.terminalSession.findFirst({ where: { id, userId } });
  if (!row) throw new ApiError(404, "NOT_FOUND", "Terminal session not found");
  return toDto(row);
}

export async function closeTerminalSession(
  userId: number,
  id: string,
): Promise<TerminalSessionDto> {
  const row = await prisma.terminalSession.findFirst({ where: { id, userId } });
  if (!row) throw new ApiError(404, "NOT_FOUND", "Terminal session not found");
  if (row.status === "CREATING" || row.status === "RUNNING") {
    if (row.containerId) {
      await runtime.kill(row.containerId).catch((err) => {
        logger.warn(
          { err, containerId: row.containerId },
          "kill on close failed",
        );
      });
    }
  }
  const updated = await prisma.terminalSession.update({
    where: { id },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  return toDto(updated);
}

export async function sendTerminalInput(
  userId: number,
  id: string,
  data: string,
): Promise<void> {
  const row = await prisma.terminalSession.findFirst({ where: { id, userId } });
  if (!row) throw new ApiError(404, "NOT_FOUND", "Terminal session not found");
  if (row.status !== "RUNNING" || !row.containerId) {
    throw new ApiError(
      409,
      "SESSION_NOT_RUNNING",
      "Terminal session is not running",
    );
  }

  const threat = scanDestructiveInput(data);
  if (threat) {
    await crashTerminalSession(
      userId,
      id,
      `destructive command fenced: ${threat.reason}`,
    );
    throw new ApiError(
      409,
      "SANDBOX_CRASHED",
      "Destructive command blocked — sandbox destroyed; press Reassemble",
    );
  }

  await runtime.write(row.containerId, data);
}

/**
 * Tear down a running sandbox after the destructive-command guard fires.
 * Marks the session CRASHED (with the reason) *before* killing the container so
 * the exit-wait handler cannot race it into CLOSED, then broadcasts the crash.
 */
export async function crashTerminalSession(
  userId: number,
  id: string,
  reason: string,
): Promise<TerminalSessionDto> {
  const row = await prisma.terminalSession.findFirst({ where: { id, userId } });
  if (!row) throw new ApiError(404, "NOT_FOUND", "Terminal session not found");
  if (row.status !== "RUNNING" || !row.containerId) {
    throw new ApiError(
      409,
      "SESSION_NOT_RUNNING",
      "Terminal session is not running",
    );
  }

  await prisma.terminalSession.update({
    where: { id },
    data: { status: "CRASHED", crashReason: reason, closedAt: new Date() },
  });

  terminalEvents.emit("output", {
    sessionId: id,
    data: `\n>> ${reason}\n>> sandbox destroyed — press Reassemble to rebuild a fresh container.\n`,
  } satisfies TerminalOutputEvent);
  terminalEvents.emit("crash", {
    sessionId: id,
    reason,
  } satisfies TerminalCrashEvent);

  const containerId = row.containerId;
  await runtime.kill(containerId).catch((err) => {
    logger.warn({ err, sessionId: id }, "kill on crash failed");
  });

  const updated = await prisma.terminalSession.findUnique({ where: { id } });
  if (!updated) throw new ApiError(404, "NOT_FOUND", "Terminal session not found");
  return toDto(updated);
}

/**
 * Reconstruct a fresh container for a dead session (CRASHED or FAILED) without
 * minting a new session id: reassemble → RUNNING again. Output keeps streaming
 * to the same socket room because the session id is unchanged.
 */
export async function reassembleTerminalSession(
  userId: number,
  id: string,
): Promise<TerminalSessionDto> {
  const row = await prisma.terminalSession.findFirst({ where: { id, userId } });
  if (!row) throw new ApiError(404, "NOT_FOUND", "Terminal session not found");
  if (row.status !== "CRASHED" && row.status !== "FAILED") {
    throw new ApiError(
      409,
      "SESSION_NOT_DEAD",
      "Only crashed or failed sessions can be reassembled",
    );
  }

  try {
    const instance = await runtime.create(id);
    const containerId = instance.containerId;

    wireOutputStream(id, instance.stream);
    observeExit(id, instance.exited);

    const updated = await prisma.terminalSession.update({
      where: { id },
      data: {
        status: "RUNNING",
        containerId,
        crashReason: null,
        closedAt: null,
        expiresAt: new Date(Date.now() + row.ttlSeconds * 1000),
      },
    });

    terminalEvents.emit("output", {
      sessionId: id,
      data: "\n>> sandbox reassembled — fresh container ready.\n",
    } satisfies TerminalOutputEvent);

    logger.info({ sessionId: id, containerId }, "sandbox container reassembled");
    return toDto(updated);
  } catch (err) {
    logger.error(
      { err, sessionId: id },
      "failed to reassemble terminal sandbox",
    );
    throw new ApiError(
      502,
      "SANDBOX_REASSEMBLE_FAILED",
      "Could not reassemble sandbox container",
    );
  }
}

/**
 * Expiry sweep: closes containers whose session has outlived its TTL.
 * Returns how many sessions were expired.
 */
export async function expireTerminalSessions(): Promise<number> {
  const now = new Date();
  const due = await prisma.terminalSession.findMany({
    where: { status: { in: ["CREATING", "RUNNING"] }, expiresAt: { lt: now } },
  });

  let expired = 0;
  for (const row of due) {
    // Mark first so the container-exit handler (which sees the DB row) cannot
    // overwrite EXPIRED with CLOSED when it fires after the kill below.
    await prisma.terminalSession.update({
      where: { id: row.id },
      data: { status: "EXPIRED", closedAt: now },
    });
    if (row.containerId) {
      await runtime.kill(row.containerId).catch((err) => {
        logger.warn({ err, sessionId: row.id }, "kill on expiry failed");
      });
    }
    expired += 1;
  }
  if (expired > 0) logger.info({ expired }, "expired terminal sessions");
  return expired;
}
