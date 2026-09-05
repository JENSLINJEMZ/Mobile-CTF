import type { TerminalExitEvent, TerminalOutputEvent, TerminalSessionStatus, TerminalSessionDto } from '@ctf/shared';
import { randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';

import { prisma } from '@ctf/database';
import { ApiError } from '../middleware/errors';
import { env } from '../config/env';
import { stripAnsi } from '../utils/ansi';
import { logger } from '../utils/logger';
import { DockerSandboxRuntime } from './sandbox/dockerRuntime';
import type { SandboxRuntime } from './sandbox/types';

export const terminalEvents = new EventEmitter();

function toDto(row: {
  id: string;
  status: TerminalSessionStatus;
  ttlSeconds: number;
  createdAt: Date;
  expiresAt: Date;
  closedAt: Date | null;
}): TerminalSessionDto {
  return {
    id: row.id,
    status: row.status,
    ttlSeconds: row.ttlSeconds,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
  };
}

function sessionId(): string {
  return `tm_${randomBytes(16).toString('hex')}`;
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
    throw new ApiError(503, 'SANDBOX_UNAVAILABLE', 'Sandbox runtime is not available');
  }
}

export async function createTerminalSession(userId: number): Promise<TerminalSessionDto> {
  await assertSandboxAvailable();

  const activeCount = await prisma.terminalSession.count({
    where: { userId, status: { in: ['CREATING', 'RUNNING'] } },
  });
  if (activeCount >= env.terminalMaxActive) {
    throw new ApiError(429, 'SESSION_LIMIT', 'Terminal session limit reached; close one first');
  }

  const now = Date.now();
  const row = await prisma.terminalSession.create({
    data: {
      id: sessionId(),
      userId,
      status: 'CREATING',
      ttlSeconds: env.terminalTtlSeconds,
      expiresAt: new Date(now + env.terminalTtlSeconds * 1000),
    },
  });

  try {
    const instance = await runtime.create(row.id);
    const containerId = instance.containerId;

    await wipStream(instance);

    const updated = await prisma.terminalSession.update({
      where: { id: row.id },
      data: { status: 'RUNNING', containerId },
    });

    instance.exited
      .then((code) => handleContainerExit(row.id, code))
      .catch((err) => {
        logger.error({ err, sessionId: row.id }, 'sandbox exited with error');
        return handleContainerExit(row.id, null);
      });

    return toDto(updated);
  } catch (err) {
    logger.error({ err, sessionId: row.id }, 'failed to start terminal sandbox');
    await prisma.terminalSession.update({
      where: { id: row.id },
      data: { status: 'FAILED', closedAt: new Date() },
    });
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, 'SANDBOX_START_FAILED', 'Could not start sandbox container');
  }

  async function wipStream(instance: { stream: NodeJS.ReadableStream }): Promise<void> {
    instance.stream.on('data', (chunk: Buffer | string) => {
      const text = stripAnsi(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk, env.terminalMaxOutput);
      if (text) terminalEvents.emit('output', { sessionId: row.id, data: text } satisfies TerminalOutputEvent);
    });
  }
}

async function handleContainerExit(sessionIdValue: string, code: number | null): Promise<void> {
  const current = await prisma.terminalSession.findUnique({ where: { id: sessionIdValue } });
  if (current && (current.status === 'CREATING' || current.status === 'RUNNING')) {
    await prisma.terminalSession.update({
      where: { id: sessionIdValue },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }
  terminalEvents.emit('exit', { sessionId: sessionIdValue, code } satisfies TerminalExitEvent);
}

export async function listTerminalSessions(userId: number): Promise<TerminalSessionDto[]> {
  const rows = await prisma.terminalSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return rows.map(toDto);
}

export async function getTerminalSession(userId: number, id: string): Promise<TerminalSessionDto> {
  const row = await prisma.terminalSession.findFirst({ where: { id, userId } });
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Terminal session not found');
  return toDto(row);
}

export async function closeTerminalSession(userId: number, id: string): Promise<TerminalSessionDto> {
  const row = await prisma.terminalSession.findFirst({ where: { id, userId } });
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Terminal session not found');
  if (row.status === 'CREATING' || row.status === 'RUNNING') {
    if (row.containerId) {
      await runtime.kill(row.containerId).catch((err) => {
        logger.warn({ err, containerId: row.containerId }, 'kill on close failed');
      });
    }
  }
  const updated = await prisma.terminalSession.update({
    where: { id },
    data: { status: 'CLOSED', closedAt: new Date() },
  });
  return toDto(updated);
}

export async function sendTerminalInput(userId: number, id: string, data: string): Promise<void> {
  const row = await prisma.terminalSession.findFirst({ where: { id, userId } });
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Terminal session not found');
  if (row.status !== 'RUNNING' || !row.containerId) {
    throw new ApiError(409, 'SESSION_NOT_RUNNING', 'Terminal session is not running');
  }
  await runtime.write(row.containerId, data);
}

/**
 * Expiry sweep: closes containers whose session has outlived its TTL.
 * Returns how many sessions were expired.
 */
export async function expireTerminalSessions(): Promise<number> {
  const now = new Date();
  const due = await prisma.terminalSession.findMany({
    where: { status: { in: ['CREATING', 'RUNNING'] }, expiresAt: { lt: now } },
  });

  let expired = 0;
  for (const row of due) {
    // Mark first so the container-exit handler (which sees the DB row) cannot
    // overwrite EXPIRED with CLOSED when it fires after the kill below.
    await prisma.terminalSession.update({
      where: { id: row.id },
      data: { status: 'EXPIRED', closedAt: now },
    });
    if (row.containerId) {
      await runtime.kill(row.containerId).catch((err) => {
        logger.warn({ err, sessionId: row.id }, 'kill on expiry failed');
      });
    }
    expired += 1;
  }
  if (expired > 0) logger.info({ expired }, 'expired terminal sessions');
  return expired;
}