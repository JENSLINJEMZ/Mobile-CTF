import { createServer, type Server as HttpServer } from 'node:http';

import { prisma } from '@ctf/database';
import type {
  CreateTerminalSessionResponse,
  ListTerminalSessionsResponse,
  TerminalExitEvent,
  TerminalOutputEvent,
} from '@ctf/shared';
import { io as createClient, type Socket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { FakeSandboxRuntime } from '../src/services/sandbox/fakeRuntime';
import {
  closeTerminalSession,
  configureSandboxRuntime,
  createTerminalSession,
  expireTerminalSessions,
} from '../src/services/terminalSessions';
import { attachSocket } from '../src/websocket/leaderboard';

const app = createApp();
const api = request(app);

const runSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const fakeRuntime = new FakeSandboxRuntime();

let server: HttpServer;
let port = 0;
let tokenA = '';
let userIdA = 0;
let tokenB = '';
let userIdB = 0;

let serial = 0;
function uniqueEmail(): string {
  serial += 1;
  return `tm-${runSuffix}-${serial}@example.com`;
}
function uniqueUsername(): string {
  serial += 1;
  return `tmuser${serial}-${runSuffix.slice(-6)}`;
}

async function register(): Promise<{ token: string; userId: number }> {
  const res = await api.post('/api/auth/register').send({
    email: uniqueEmail(),
    username: uniqueUsername(),
    password: 'password123',
  });
  expect(res.status).toBe(201);
  const body = res.body.data as { user: { id: number }; tokens: { accessToken: string } };
  return { token: body.tokens.accessToken, userId: body.user.id };
}

async function createSessionViaApi(token: string): Promise<string> {
  const res = await api.post('/api/terminal/sessions').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(201);
  return (res.body.data as CreateTerminalSessionResponse).session.id;
}

async function closeAllFor(userId: number): Promise<void> {
  const active = await prisma.terminalSession.findMany({
    where: { userId, status: { in: ['CREATING', 'RUNNING'] } },
  });
  for (const session of active) {
    await closeTerminalSession(userId, session.id).catch(() => undefined);
  }
}

function once(socket: Socket, event: string, timeoutMs = 4000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timed out waiting for "${event}"`));
    }, timeoutMs);
    const handler = (payload: unknown) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, handler);
  });
}

function emitWithAck(
  socket: Socket,
  event: string,
  payload: unknown,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve, reject) => {
    socket.timeout(4000).emit(
      event,
      payload,
      (err: Error | null, reply?: { ok: boolean; error?: string }) => {
        if (err) reject(err);
        else resolve(reply ?? { ok: false });
      },
    );
  });
}

async function connectAuthed(): Promise<Socket> {
  const socket = createClient(`http://127.0.0.1:${port}/terminal`, {
    transports: ['websocket'],
    auth: { token: tokenA },
  });
  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve());
    socket.on('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error('terminal socket never connected')), 4000);
  });
  return socket;
}

beforeAll(async () => {
  configureSandboxRuntime(fakeRuntime);
  const regA = await register();
  tokenA = regA.token;
  userIdA = regA.userId;
  const regB = await register();
  tokenB = regB.token;
  userIdB = regB.userId;

  server = createServer(app);
  attachSocket(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as { port: number }).port;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await prisma.$disconnect();
});

describe('POST /api/terminal/sessions', () => {
  it('requires authentication', async () => {
    const res = await api.post('/api/terminal/sessions');
    expect(res.status).toBe(401);
  });

  it('creates a running session bound to the user', async () => {
    const res = await api.post('/api/terminal/sessions').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(201);
    const session = (res.body.data as CreateTerminalSessionResponse).session;
    expect(session.id).toMatch(/^tm_[0-9a-f]{32}$/);
    expect(session.status).toBe('RUNNING');
    expect(session.ttlSeconds).toBe(1800);
    expect(session.closedAt).toBeNull();

    const row = await prisma.terminalSession.findUnique({ where: { id: session.id } });
    expect(row?.userId).toBe(userIdA);
    expect(row?.status).toBe('RUNNING');
    expect(row?.containerId).toMatch(/^fake-/);
  });

  it('rejects when the user hits the active-session limit', async () => {
    const second = await api.post('/api/terminal/sessions').set('Authorization', `Bearer ${tokenA}`);
    expect(second.status).toBe(201);

    const third = await api.post('/api/terminal/sessions').set('Authorization', `Bearer ${tokenA}`);
    expect(third.status).toBe(429);
    expect(third.body.error?.code).toBe('SESSION_LIMIT');

    await closeAllFor(userIdA);
  });
});

describe('GET /api/terminal/sessions', () => {
  it('lists only the caller’s sessions (newest first)', async () => {
    const res = await api.get('/api/terminal/sessions').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const sessions = (res.body.data as ListTerminalSessionsResponse).sessions;
    for (let i = 1; i < sessions.length; i += 1) {
      const prev = sessions[i - 1];
      const current = sessions[i];
      if (prev && current) {
        expect(prev.createdAt >= current.createdAt).toBe(true);
      }
    }
  });

  it('does not leak another user’s sessions', async () => {
    const res = await api.get('/api/terminal/sessions').set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    const sessions = (res.body.data as ListTerminalSessionsResponse).sessions;
    expect(sessions.every((s) => s.id.startsWith('tm_'))).toBe(true);
    expect(sessions.length).toBe(0);
  });
});

describe('DELETE /api/terminal/sessions/:id', () => {
  it('closes a session owned by the caller and kills its container', async () => {
    const sessionId = await createSessionViaApi(tokenB);
    const row = await prisma.terminalSession.findUnique({ where: { id: sessionId } });

    const before = fakeRuntime.killCalls.length;
    const res = await api
      .delete(`/api/terminal/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.data.session.status).toBe('CLOSED');
    expect(res.body.data.session.closedAt).not.toBeNull();
    expect(fakeRuntime.killCalls.length).toBe(before + 1);
    expect(fakeRuntime.killCalls).toContain(row?.containerId);
  });

  it('returns 404 for a session owned by someone else', async () => {
    const sessionId = await createSessionViaApi(tokenA);
    const res = await api
      .delete(`/api/terminal/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
    await closeAllFor(userIdA);
  });

  it('returns 400 for a malformed session id', async () => {
    const res = await api
      .delete('/api/terminal/sessions/not-a-session-id')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
  });
});

describe('terminal WebSocket (/terminal)', () => {
  beforeAll(async () => {
    await closeAllFor(userIdA);
  });

  it('rejects anonymous sockets', async () => {
    const anon = createClient(`http://127.0.0.1:${port}/terminal`, {
      transports: ['websocket'],
    });
    await new Promise<void>((resolve, reject) => {
      anon.on('connect_error', (err) => {
        expect(err.message).toBe('unauthorized');
        resolve();
      });
      anon.on('connect', () => reject(new Error('anonymous terminal socket connected')));
      setTimeout(() => reject(new Error('anonymous terminal socket never errored')), 4000);
    });
    anon.close();
  });

  it('rejects input before joining, and joining an unknown session', async () => {
    const socket = await connectAuthed();

    const noJoin = await emitWithAck(socket, 'terminal:input', {
      sessionId: `tm_${'a'.repeat(32)}`,
      data: 'ls\n',
    });
    expect(noJoin.ok).toBe(false);
    expect(noJoin.error).toContain('join the session first');

    const unknown = await emitWithAck(socket, 'terminal:join', {
      sessionId: `tm_${'b'.repeat(32)}`,
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.error).toMatch(/not found/i);

    socket.close();
  });

  it('relays input to the container and output back to the room', async () => {
    const sessionId = await createSessionViaApi(tokenA);
    const socket = await connectAuthed();

    const join = await emitWithAck(socket, 'terminal:join', { sessionId });
    expect(join.ok).toBe(true);

    const outputPromise = once(socket, 'terminal:output');
    const inputAck = await emitWithAck(socket, 'terminal:input', { sessionId, data: 'whoami\n' });
    expect(inputAck.ok).toBe(true);

    const event = (await outputPromise) as TerminalOutputEvent;
    expect(event.sessionId).toBe(sessionId);
    expect(event.data).toContain('whoami\n');

    socket.close();
    await closeAllFor(userIdA);
  });

  it('broadcasts terminal:exit when the container shell exits', async () => {
    const sessionId = await createSessionViaApi(tokenA);
    const socket = await connectAuthed();

    const join = await emitWithAck(socket, 'terminal:join', { sessionId });
    expect(join.ok).toBe(true);

    const exitPromise = once(socket, 'terminal:exit');
    fakeRuntime.exit(sessionId, 0);
    const event = (await exitPromise) as TerminalExitEvent;
    expect(event.sessionId).toBe(sessionId);
    expect(event.code).toBe(0);

    const row = await prisma.terminalSession.findUnique({ where: { id: sessionId } });
    expect(row?.status).toBe('CLOSED');
    socket.close();
  });
});

describe('expiry sweep', () => {
  it('expires and kills sessions past their TTL', async () => {
    await closeAllFor(userIdA);
    const session = await createTerminalSession(userIdA);
    await prisma.terminalSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const row = await prisma.terminalSession.findUnique({ where: { id: session.id } });

    const before = fakeRuntime.killCalls.length;
    const expired = await expireTerminalSessions();
    expect(expired).toBeGreaterThanOrEqual(1);
    expect(fakeRuntime.killCalls.slice(before)).toContain(row?.containerId);

    const after = await prisma.terminalSession.findUnique({ where: { id: session.id } });
    expect(after?.status).toBe('EXPIRED');
    expect(after?.closedAt).not.toBeNull();
  });
});