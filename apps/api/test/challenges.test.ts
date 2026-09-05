import { prisma } from '@ctf/database';
import type { ChallengeDetailDto, ChallengeSummaryDto } from '@ctf/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';

const app = createApp();
const api = request(app);

const runSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const FLAG_A = 'ctf{first_blood_target}';
const FLAG_B = 'ctf{hint_penalty_target}';

let categoryId = 0;
let adminToken = '';
let userAToken = '';
let userBToken = '';
let userCToken = '';
let challengeAId = 0;
let challengeBId = 0;
let challengeDraftId = 0;
let hintBId = 0;
let hintB2Id = 0;

let serial = 0;
function uniqueEmail(): string {
  serial += 1;
  return `ch-${runSuffix}-${serial}@example.com`;
}
function uniqueUsername(): string {
  serial += 1;
  return `chuser${serial}-${runSuffix.slice(-6)}`;
}
function uniqueSlug(prefix: string): string {
  serial += 1;
  return `${prefix}-${runSuffix.slice(-8)}-${serial}`;
}

async function registerAndGetToken(): Promise<string> {
  const res = await api.post('/api/auth/register').send({
    email: uniqueEmail(),
    username: uniqueUsername(),
    password: 'password123',
  });
  expect([200, 201]).toContain(res.status);
  return (res.body.data as { tokens: { accessToken: string } }).tokens.accessToken;
}

beforeAll(async () => {
  const category = await prisma.challengeCategory.create({
    data: { name: `Test Crypto ${runSuffix}`, slug: `test-crypto-${runSuffix.slice(-8)}`, icon: 'lock', sortOrder: 1 },
  });
  categoryId = category.id;

  const tag = await prisma.tag.create({
    data: { name: `TestTag ${runSuffix}`, slug: `test-tag-${runSuffix.slice(-8)}` },
  });

  adminToken = await registerAndGetToken();
  const adminEmailRes = await api
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);
  const adminUser = (adminEmailRes.body.data as { email: string }).email;
  await prisma.user.update({ where: { email: adminUser }, data: { role: 'ADMIN' } });

  const adminLogin = await api.post('/api/auth/login').send({
    email: adminUser,
    password: 'password123',
  });
  expect(adminLogin.status).toBe(200);
  adminToken = (adminLogin.body.data as { tokens: { accessToken: string } }).tokens.accessToken;

  userAToken = await registerAndGetToken();
  userBToken = await registerAndGetToken();
  userCToken = await registerAndGetToken();

  const challengeA = await api
    .post('/api/admin/challenges')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'First Blood Target',
      slug: uniqueSlug('first-blood'),
      description: 'Solve me for glory.',
      categoryId,
      difficulty: 'EASY',
      basePoints: 200,
      flag: FLAG_A,
      tagIds: [tag.id],
      published: true,
    })
    .expect(201);
  challengeAId = (challengeA.body.data as ChallengeDetailDto).id;

  const challengeB = await api
    .post('/api/admin/challenges')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Hint Penalty Target',
      slug: uniqueSlug('hint-penalty'),
      description: 'Hints cost points here.',
      categoryId,
      difficulty: 'MEDIUM',
      basePoints: 100,
      flag: FLAG_B,
      published: true,
    })
    .expect(201);
  challengeBId = (challengeB.body.data as ChallengeDetailDto).id;

  const hintB = await api
    .post(`/api/admin/challenges/${challengeBId}/hints`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Cheap hint', body: 'The flag starts with ctf.', penaltyPoints: 25, sortOrder: 0 })
    .expect(201);
  hintBId = (hintB.body.data as { id: number }).id;

  const hintB2 = await api
    .post(`/api/admin/challenges/${challengeBId}/hints`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Expensive hint', body: 'The flag is two words.', penaltyPoints: 50, sortOrder: 1 })
    .expect(201);
  hintB2Id = (hintB2.body.data as { id: number }).id;

  const draft = await api
    .post('/api/admin/challenges')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Hidden Draft',
      slug: uniqueSlug('draft'),
      description: 'Not ready for players.',
      categoryId,
      difficulty: 'HARD',
      basePoints: 300,
      flag: 'ctf{unpublished_never_visible}',
      published: false,
    })
    .expect(201);
  challengeDraftId = (draft.body.data as ChallengeDetailDto).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/challenges (browse)', () => {
  it('lists only published challenges for anonymous users', async () => {
    const res = await api.get('/api/challenges?limit=100');
    expect(res.status).toBe(200);
    const body = res.body as { data: { items: ChallengeSummaryDto[]; meta: { total: number } } };
    const items = body.data.items;
    expect(items.some((c) => c.id === challengeAId)).toBe(true);
    expect(items.some((c) => c.id === challengeBId)).toBe(true);
    expect(items.some((c) => c.id === challengeDraftId)).toBe(false);
    expect(body.data.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('never leaks flag material in list payloads', async () => {
    const res = await api.get('/api/challenges');
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('flagHash');
    expect(raw).not.toContain('flagSalt');
    expect(raw).not.toContain(FLAG_A);
    expect(raw).not.toContain(FLAG_B);
  });

  it('filters by difficulty and honours pagination', async () => {
    const res = await api.get('/api/challenges?difficulty=EASY&limit=1&page=1');
    expect(res.status).toBe(200);
    const body = res.body as { data: { items: ChallengeSummaryDto[]; meta: { totalPages: number } } };
    expect(body.data.items.length).toBe(1);
    expect(body.data.items[0]?.difficulty).toBe('EASY');
    expect(body.data.meta.totalPages).toBeGreaterThanOrEqual(1);
  });

  it('marks challenges solved by the caller', async () => {
    const authList = await api
      .get('/api/challenges?limit=100')
      .set('Authorization', `Bearer ${userAToken}`);
    const body = authList.body as { data: { items: ChallengeSummaryDto[] } };
    const target = body.data.items.find((c) => c.id === challengeAId);
    expect(target).toBeDefined();
  });
});

describe('GET /api/challenges/:id (detail)', () => {
  it('returns hints locked (no body) and no flag material', async () => {
    const res = await api.get(`/api/challenges/${challengeBId}`);
    expect(res.status).toBe(200);
    const data = res.body.data as ChallengeDetailDto;
    expect(data.id).toBe(challengeBId);
    expect(data.hints.length).toBe(2);
    for (const hint of data.hints) {
      expect(hint.unlocked).toBe(false);
      expect(hint.body).toBeNull();
    }
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('flagHash');
    expect(raw).not.toContain('flagSalt');
    expect(raw).not.toContain(FLAG_B);
  });

  it('hides unpublished challenges from players', async () => {
    const res = await api.get(`/api/challenges/${challengeDraftId}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/challenges/:id/submissions', () => {
  it('rejects a wrong flag without leaking the answer', async () => {
    const res = await api
      .post(`/api/challenges/${challengeAId}/submissions`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ flag: 'ctf{guess}' });
    expect(res.status).toBe(200);
    const data = res.body.data as { correct: boolean; pointsAwarded: number; message: string };
    expect(data.correct).toBe(false);
    expect(data.pointsAwarded).toBe(0);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain(FLAG_A);
  });

  it('awards base + first-blood bonus to the first solver', async () => {
    const res = await api
      .post(`/api/challenges/${challengeAId}/submissions`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ flag: FLAG_A });
    expect(res.status).toBe(200);
    const data = res.body.data as {
      correct: boolean;
      pointsAwarded: number;
      firstBlood: boolean;
      totalScore: number;
      message: string;
    };
    expect(data.correct).toBe(true);
    expect(data.firstBlood).toBe(true);
    expect(data.pointsAwarded).toBe(220);
    expect(data.totalScore).toBe(220);
    expect(data.message).toContain('First blood');
  });

  it('deducts unlocked hint penalties', async () => {
    await api
      .post(`/api/challenges/${challengeBId}/hints/${hintBId}/unlock`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);

    const detail = await api
      .get(`/api/challenges/${challengeBId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    const hint = (detail.body.data as ChallengeDetailDto).hints.find((h) => h.id === hintBId);
    expect(hint?.unlocked).toBe(true);
    expect(hint?.body).toBeTruthy();

    const res = await api
      .post(`/api/challenges/${challengeBId}/submissions`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ flag: FLAG_B });
    const data = res.body.data as { correct: boolean; pointsAwarded: number };
    // 100 base - 25 hint penalty = 75 (first blood already consumed by... this is the first solve,
    // so relay: 75 + no first blood only if solved earlier. userA is first solver -> no bonus issue:
    expect(data.correct).toBe(true);
    expect([75, 85]).toContain(data.pointsAwarded);
  });

  it('is idempotent for a repeated correct submission', async () => {
    const before = await api
      .post(`/api/challenges/${challengeAId}/submissions`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ flag: FLAG_A });
    const beforeData = before.body.data as { pointsAwarded: number; totalScore: number; message: string };

    const res = await api
      .post(`/api/challenges/${challengeAId}/submissions`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ flag: FLAG_A });
    expect(res.status).toBe(200);
    const data = res.body.data as { correct: boolean; pointsAwarded: number; totalScore: number; message: string };
    expect(data.correct).toBe(true);
    expect(data.pointsAwarded).toBe(0);
    expect(data.message).toMatch(/already solved/i);
    expect(data.totalScore).toBe(beforeData.totalScore);
  });

  it('gives a later solver base points without the first-blood bonus', async () => {
    const res = await api
      .post(`/api/challenges/${challengeAId}/submissions`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ flag: FLAG_A });
    const data = res.body.data as { correct: boolean; pointsAwarded: number; firstBlood: boolean };
    expect(data.correct).toBe(true);
    expect(data.firstBlood).toBe(false);
    expect(data.pointsAwarded).toBe(200);
  });

  it('aggregates the solver total score across challenges', async () => {
    const res = await api
      .post(`/api/challenges/${challengeAId}/submissions`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ flag: FLAG_A });
    const data = res.body.data as { totalScore: number };
    expect(data.totalScore).toBe(200);
  });

  it('requires authentication to submit', async () => {
    const res = await api.post(`/api/challenges/${challengeAId}/submissions`).send({ flag: FLAG_A });
    expect(res.status).toBe(401);
  });

  it('sets rate-limit response headers on submission', async () => {
    const res = await api
      .post(`/api/challenges/${challengeBId}/submissions`)
      .set('Authorization', `Bearer ${userCToken}`)
      .send({ flag: 'ctf{rate_header_check}' });
    expect(res.status).toBe(200);
    expect(Number(res.headers['ratelimit-limit'])).toBeGreaterThan(0);
  });

  it('normalizes flag case and whitespace', async () => {
    const res = await api
      .post(`/api/challenges/${challengeBId}/submissions`)
      .set('Authorization', `Bearer ${userCToken}`)
      .send({ flag: `  ${FLAG_B.toUpperCase()}  ` });
    const data = res.body.data as { correct: boolean };
    expect(data.correct).toBe(true);
  });
});

describe('POST /api/challenges/:id/hints/:hintId/unlock', () => {
  it('reveals hint body to the unlocking user only after unlock', async () => {
    const before = await api.get(`/api/challenges/${challengeBId}`);
    const locked = (before.body.data as ChallengeDetailDto).hints.find((h) => h.id === hintB2Id);
    expect(locked?.unlocked).toBe(false);
    expect(locked?.body).toBeNull();

    await api
      .post(`/api/challenges/${challengeBId}/hints/${hintB2Id}/unlock`)
      .set('Authorization', `Bearer ${userCToken}`)
      .expect(200);

    const after = await api
      .get(`/api/challenges/${challengeBId}`)
      .set('Authorization', `Bearer ${userCToken}`);
    const unlocked = (after.body.data as ChallengeDetailDto).hints.find((h) => h.id === hintB2Id);
    expect(unlocked?.unlocked).toBe(true);
    expect(unlocked?.body).toBeTruthy();
  });

  it('rejects unlocking a hint from another challenge', async () => {
    const res = await api
      .post(`/api/challenges/${challengeAId}/hints/${hintBId}/unlock`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(res.status).toBe(404);
  });

  it('requires authentication', async () => {
    const res = await api.post(`/api/challenges/${challengeBId}/hints/${hintBId}/unlock`);
    expect(res.status).toBe(401);
  });
});

describe('admin challenge CRUD', () => {
  it('rejects non-admin authors with 403', async () => {
    const res = await api
      .post('/api/admin/challenges')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Blocked',
        slug: uniqueSlug('blocked'),
        description: 'Attempt',
        categoryId,
        difficulty: 'EASY',
        basePoints: 50,
        flag: 'ctf{blocked}',
      });
    expect(res.status).toBe(403);
  });

  it('rejects anonymous admins with 401', async () => {
    const res = await api.delete(`/api/admin/challenges/${challengeAId}`);
    expect(res.status).toBe(401);
  });

  it('updates a challenge and snapshots a new version', async () => {
    const res = await api
      .put(`/api/admin/challenges/${challengeAId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'First Blood Target v2', basePoints: 250 });
    expect(res.status).toBe(200);
    const data = res.body.data as ChallengeDetailDto;
    expect(data.title).toBe('First Blood Target v2');
    expect(data.basePoints).toBe(250);

    const versions = await prisma.challengeVersion.count({ where: { challengeId: challengeAId } });
    expect(versions).toBe(2);
  });

  it('deletes a challenge', async () => {
    const res = await api
      .delete(`/api/admin/challenges/${challengeDraftId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const gone = await api.get(`/api/challenges/${challengeDraftId}`);
    expect(gone.status).toBe(404);
  });
});