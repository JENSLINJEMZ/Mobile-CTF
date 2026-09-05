import { prisma } from '@ctf/database';
import { Role } from '@ctf/shared';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { authenticate, requireRole } from '../src/middleware/auth';
import { errorHandler } from '../src/middleware/errors';
import { authService } from '../src/services/auth';

const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
let serial = 0;

async function makeUser(role: Role) {
  serial += 1;
  const email = `${role.toLowerCase()}-${suffix}-${serial}@example.com`;
  const username = `${role.toLowerCase()}-${suffix.slice(-6)}-${serial}`;
  await authService.register({ email, username, password: 'password123' });
  await prisma.user.update({ where: { email }, data: { role } });
  const login = await authService.login({ email, password: 'password123' });
  return login;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.get('/protected', authenticate, (_req, res) => res.json({ ok: true, role: _req.user!.role }));
  app.get(
    '/admin-only',
    authenticate,
    requireRole(Role.ADMIN),
    (_req, res) => res.json({ ok: true }),
  );
  app.get(
    '/staff-only',
    authenticate,
    requireRole(Role.ADMIN, Role.MODERATOR),
    (_req, res) => res.json({ ok: true }),
  );
  app.use(errorHandler);
  return app;
}

beforeAll(async () => {
  await prisma.$disconnect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('authenticate middleware', () => {
  const api = request(buildApp());

  it('rejects requests without a token', async () => {
    const res = await api.get('/protected');
    expect(res.status).toBe(401);
  });

  it('rejects malformed tokens', async () => {
    const res = await api.get('/protected').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });

  it('accepts a valid token and exposes the user', async () => {
    const { tokens } = await makeUser(Role.USER);
    const res = await api.get('/protected').set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.role).toBe('USER');
  });
});

describe('requireRole middleware', () => {
  const api = request(buildApp());

  it('grants access to an ADMIN on an admin-only route', async () => {
    const { tokens } = await makeUser(Role.ADMIN);
    const res = await api.get('/admin-only').set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(res.status).toBe(200);
  });

  it('denies a USER on an admin-only route (403)', async () => {
    const { tokens } = await makeUser(Role.USER);
    const res = await api.get('/admin-only').set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('grants access on a multi-role route to a MODERATOR', async () => {
    const { tokens } = await makeUser(Role.MODERATOR);
    const res = await api.get('/staff-only').set('Authorization', `Bearer ${tokens.accessToken}`);
    expect(res.status).toBe(200);
  });

  it('denies an unauthenticated request before role checks (401)', async () => {
    const res = await api.get('/admin-only');
    expect(res.status).toBe(401);
  });
});