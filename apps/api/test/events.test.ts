import { prisma } from '@ctf/database';
import type {
  ChallengeDetailDto,
  EventChallengeDto,
  EventLeaderboardResponse,
  EventSummaryDto,
} from '@ctf/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';

const app = createApp();
const api = request(app);

const runSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const FLAG_0 = 'ctf{event_gate_0}';
const FLAG_1 = 'ctf{event_gate_1}';

let serial = 0;
function uniqueEmail(tag: string): string {
  serial += 1;
  return `ev-${tag}-${runSuffix}-${serial}@example.com`;
}
function uniqueUsername(tag: string): string {
  serial += 1;
  return `ev${tag}${serial}-${runSuffix.slice(-6)}`;
}
function uniqueSlug(tag: string): string {
  serial += 1;
  return `ev-${tag}-${runSuffix.slice(-8)}-${serial}`;
}

async function register(
  tag: string,
): Promise<{ token: string; userId: number; username: string; email: string }> {
  const username = uniqueUsername(tag);
  const email = uniqueEmail(tag);
  const res = await api.post('/api/auth/register').send({
    email,
    username,
    password: 'password123',
  });
  expect(res.status).toBe(201);
  const body = res.body.data as {
    user: { id: number; username: string; email: string };
    tokens: { accessToken: string };
  };
  return { token: body.tokens.accessToken, userId: body.user.id, username: body.user.username, email: body.user.email };
}

let categoryId = 0;
let adminToken = '';
let userAToken = '';
let userBToken = '';
let userBId = 0;

const ch: number[] = [];
let eventRunning = 0;
let eventDraft = 0;
let eventScheduled = 0;
let eventEnded = 0;

function hourOffset(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

async function createPublishedChallenge(
  token: string,
  title: string,
  flag: string,
): Promise<number> {
  serial += 1;
  const res = await api
    .post('/api/admin/challenges')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title,
      slug: uniqueSlug('ch'),
      description: 'An event challenge.',
      categoryId,
      difficulty: 'EASY',
      basePoints: 100,
      flag,
      published: true,
    })
    .expect(201);
  return (res.body.data as ChallengeDetailDto).id;
}

async function addEventChallenge(
  challengeId: number,
  unlock: Record<string, unknown> | null,
): Promise<number> {
  const res = await api
    .post(`/api/admin/events/${eventRunning}/challenges`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ challengeId, unlock })
    .expect(201);
  return (res.body.data as EventChallengeDto).id;
}

beforeAll(async () => {
  const category = await prisma.challengeCategory.create({
    data: {
      name: `Test Events ${runSuffix}`,
      slug: `test-events-${runSuffix.slice(-8)}`,
      icon: 'calendar',
      sortOrder: 1,
    },
  });
  categoryId = category.id;

  const admin = await register('admin');
  await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
  const login = await api.post('/api/auth/login').send({ email: admin.email, password: 'password123' }).expect(200);
  adminToken = (login.body.data as { tokens: { accessToken: string } }).tokens.accessToken;

  const userA = await register('A');
  userAToken = userA.token;
  const userB = await register('B');
  userBToken = userB.token;
  userBId = userB.userId;

  ch.push(await createPublishedChallenge(adminToken, `Event Gate 0 ${runSuffix}`, FLAG_0));
  ch.push(await createPublishedChallenge(adminToken, `Event Gate 1 ${runSuffix}`, FLAG_1));
  ch.push(await createPublishedChallenge(adminToken, `Event Gate 2 ${runSuffix}`, 'ctf{event_gate_2}'));
  ch.push(await createPublishedChallenge(adminToken, `Event Gate 3 ${runSuffix}`, 'ctf{event_gate_3}'));

  const ev = await api
    .post('/api/admin/events')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      slug: uniqueSlug('run'),
      title: `Running Event ${runSuffix}`,
      description: 'A live competition.',
      startsAt: hourOffset(-3_600_000),
      endsAt: hourOffset(24 * 3_600_000),
      status: 'RUNNING',
    })
    .expect(201);
  eventRunning = (ev.body.data as EventSummaryDto).id;

  await addEventChallenge(ch[0]!, null);

  const unlockPrereq = addEventChallenge(ch[1]!, { type: 'PREREQUISITE', requireChallengeIds: [ch[0]!] });
  const unlockScore = addEventChallenge(ch[2]!, { type: 'SCORE', minScore: 110 });
  const unlockFuture = addEventChallenge(ch[3]!, { type: 'TIME', unlockAt: hourOffset(2 * 3_600_000) });

  const badRule = await api
    .post(`/api/admin/events/${eventRunning}/challenges`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ challengeId: ch[3]!, unlock: { type: 'TIME' } })
    .expect(400);
  void badRule;

  await Promise.all([unlockPrereq, unlockScore, unlockFuture]);

  const draft = await api
    .post('/api/admin/events')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      slug: uniqueSlug('draft'),
      title: `Draft Event ${runSuffix}`,
      description: 'Hidden draft.',
      startsAt: hourOffset(3_600_000),
      endsAt: hourOffset(24 * 3_600_000),
      status: 'DRAFT',
    })
    .expect(201);
  eventDraft = (draft.body.data as EventSummaryDto).id;

  const scheduled = await api
    .post('/api/admin/events')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      slug: uniqueSlug('sched'),
      title: `Scheduled Event ${runSuffix}`,
      description: 'Coming soon.',
      startsAt: hourOffset(3_600_000),
      endsAt: hourOffset(24 * 3_600_000),
    })
    .expect(201);
  eventScheduled = (scheduled.body.data as EventSummaryDto).id;

  const ended = await api
    .post('/api/admin/events')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      slug: uniqueSlug('ended'),
      title: `Ended Event ${runSuffix}`,
      description: 'Finished.',
      startsAt: hourOffset(-48 * 3_600_000),
      endsAt: hourOffset(-24 * 3_600_000),
      status: 'ENDED',
    })
    .expect(201);
  eventEnded = (ended.body.data as EventSummaryDto).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('event lifecycle', () => {
  it('lists events with time-derived status', async () => {
    const res = await api.get('/api/events').expect(200);
    const items = (res.body.data as { items: EventSummaryDto[] }).items;
    const running = items.find((e) => e.id === eventRunning);
    expect(running?.status).toBe('RUNNING');
    expect(items.find((e) => e.id === eventDraft)?.status).toBe('DRAFT');
    expect(items.find((e) => e.id === eventScheduled)?.status).toBe('SCHEDULED');
    expect(items.find((e) => e.id === eventEnded)?.status).toBe('ENDED');
  });

  it('filters by scope', async () => {
    const running = await api.get('/api/events?scope=running').expect(200);
    const upcoming = await api.get('/api/events?scope=upcoming').expect(200);
    const ended = await api.get('/api/events?scope=ended').expect(200);
    const runItems = (running.body.data as { items: EventSummaryDto[] }).items;
    const upItems = (upcoming.body.data as { items: EventSummaryDto[] }).items;
    const endItems = (ended.body.data as { items: EventSummaryDto[] }).items;
    expect(runItems.some((e) => e.id === eventRunning)).toBe(true);
    expect(runItems.some((e) => e.id === eventScheduled)).toBe(false);
    expect(upItems.some((e) => e.id === eventScheduled)).toBe(true);
    expect(endItems.some((e) => e.id === eventEnded)).toBe(true);
    expect(endItems.some((e) => e.id === eventDraft)).toBe(false);
  });

  it('only allows registration while scheduled or running', async () => {
    await api.post(`/api/events/${eventDraft}/join`).set('Authorization', `Bearer ${userBToken}`).expect(400);
    await api.post(`/api/events/${eventScheduled}/join`).set('Authorization', `Bearer ${userBToken}`).expect(200);
    await api.post(`/api/events/${eventEnded}/join`).set('Authorization', `Bearer ${userBToken}`).expect(400);
    await api.post(`/api/events/${eventRunning}/join`).set('Authorization', `Bearer ${userBToken}`).expect(200);
  });

  it('returns 404 for unknown events', async () => {
    await api.get('/api/events/999999999').expect(404);
  });
});

describe('event unlock gating', () => {
  it('locks everything for anonymous / non-registered viewers', async () => {
    const res = await api.get(`/api/events/${eventRunning}/challenges`).expect(200);
    const items = res.body.data as EventChallengeDto[];
    expect(items).toHaveLength(4);
    for (const item of items) {
      expect(item.locked).toBe(true);
      expect(item.lockedReason).toBe('join_required');
    }
  });

  it('gates the challenge list via ?event=', async () => {
    const res = await api
      .get(`/api/challenges?event=${eventRunning}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);
    const items = res.body.data.items as {
      id: number;
      locked: boolean;
      lockedReason: string | null;
    }[];
    expect(items).toHaveLength(4);
    expect(items.every((c) => c.locked && c.lockedReason === 'join_required')).toBe(true);
  });

  it('blocks challenge detail and submissions before joining', async () => {
    const detail = await api
      .get(`/api/challenges/${ch[0]}?event=${eventRunning}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(403);
    expect(detail.body.error.code).toBe('LOCKED');

    const submit = await api
      .post(`/api/challenges/${ch[0]}/submissions?event=${eventRunning}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ flag: FLAG_0 })
      .expect(403);
    expect(submit.body.error.code).toBe('LOCKED');
  });

  it('unlocks per viewer state after joining', async () => {
    await api.post(`/api/events/${eventRunning}/join`).set('Authorization', `Bearer ${userAToken}`).expect(200);

    const res = await api.get(`/api/events/${eventRunning}/challenges`).set('Authorization', `Bearer ${userAToken}`).expect(200);
    const items = res.body.data as EventChallengeDto[];
    const bySlug = new Map(items.map((i) => [i.challengeId, i]));

    expect(bySlug.get(ch[0]!)?.locked).toBe(false);
    expect(bySlug.get(ch[1]!)?.lockedReason).toBe('prerequisite');
    expect(bySlug.get(ch[2]!)?.lockedReason).toBe('score');
    expect(bySlug.get(ch[3]!)?.lockedReason).toBe('time_lock');
  });

  it('updates gating as the user solves challenges', async () => {
    const solve0 = await api
      .post(`/api/challenges/${ch[0]}/submissions?event=${eventRunning}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ flag: FLAG_0 })
      .expect(200);
    expect(solve0.body.data.pointsAwarded).toBe(110);

    const res = await api.get(`/api/events/${eventRunning}/challenges`).set('Authorization', `Bearer ${userBToken}`).expect(200);
    const items = res.body.data as EventChallengeDto[];
    const byChallengeId = new Map(items.map((i) => [i.challengeId, i]));
    expect(byChallengeId.get(ch[1]!)?.locked).toBe(false);
    expect(byChallengeId.get(ch[2]!)?.locked).toBe(false);
    expect(byChallengeId.get(ch[3]!)?.lockedReason).toBe('time_lock');

    await api
      .post(`/api/challenges/${ch[1]}/submissions?event=${eventRunning}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ flag: FLAG_1 })
      .expect(200);
  });

  it('keeps time-locked challenges locked until their unlock time', async () => {
    const detail = await api
      .get(`/api/challenges/${ch[3]}?event=${eventRunning}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(403);
    expect(detail.body.error.code).toBe('LOCKED');
    expect(detail.body.error.message).toMatch(/unlocks later/i);
  });

  it('treats drafts, scheduled and ended events as fully locked', async () => {
    const draftChallenges = await api.get(`/api/events/${eventDraft}/challenges`).expect(200);
    const schedChallenges = await api.get(`/api/events/${eventScheduled}/challenges`).expect(200);
    const endedChallenges = await api.get(`/api/events/${eventEnded}/challenges`).expect(200);
    for (const list of [draftChallenges, schedChallenges, endedChallenges]) {
      const items = list.body.data as EventChallengeDto[];
      expect(items).toHaveLength(0);
    }
  });

  it('locks again after leaving the event', async () => {
    await api.post(`/api/events/${eventRunning}/leave`).set('Authorization', `Bearer ${userBToken}`).expect(200);
    const res = await api.get(`/api/events/${eventRunning}/challenges`).set('Authorization', `Bearer ${userBToken}`).expect(200);
    const items = res.body.data as EventChallengeDto[];
    expect(items.every((i) => i.locked && i.lockedReason === 'join_required')).toBe(true);
  });
});

describe('event leaderboard', () => {
  it('records solves and ranks participants', async () => {
    await api.post(`/api/events/${eventRunning}/join`).set('Authorization', `Bearer ${userBToken}`).expect(200);
    await api
      .post(`/api/challenges/${ch[2]}/submissions?event=${eventRunning}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ flag: 'ctf{event_gate_2}' })
      .expect(200);

    const res = await api
      .get(`/api/events/${eventRunning}/leaderboard`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(200);
    const data = res.body.data as EventLeaderboardResponse;
    expect(data.scope).toBe('participants');
    expect(data.me?.score).toBe(330);
    const mine = data.entries.find((e) => e.id === userBId);
    expect(mine?.score).toBe(330);
    expect(mine?.rank).toBe(data.me?.rank);
  });

  it('requires auth for the leaderboard', async () => {
    await api.get(`/api/events/${eventRunning}/leaderboard`).expect(401);
  });
});

describe('admin event endpoints', () => {
  it('lists all events including drafts for admins', async () => {
    const res = await api
      .get('/api/admin/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const items = (res.body.data as { items: EventSummaryDto[] }).items;
    expect(items.find((e) => e.id === eventDraft)?.status).toBe('DRAFT');
  });

  it('rejects non-admins', async () => {
    await api.get('/api/admin/events').set('Authorization', `Bearer ${userAToken}`).expect(403);
  });

  it('updates and removes event challenges', async () => {
    const list = await api.get(`/api/events/${eventRunning}/challenges`).set('Authorization', `Bearer ${userAToken}`).expect(200);
    const items = list.body.data as EventChallengeDto[];
    const locked = items.find((i) => i.challengeId === ch[3]!);
    expect(locked).toBeTruthy();

    const updated = await api
      .patch(`/api/admin/event-challenges/${locked!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ unlock: { type: 'ALWAYS' } })
      .expect(200);
    expect((updated.body.data as EventChallengeDto).unlockRule?.type).toBe('ALWAYS');

    const cleared = await api
      .patch(`/api/admin/event-challenges/${locked!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ unlock: null })
      .expect(200);
    expect((cleared.body.data as EventChallengeDto).unlockRule).toBeNull();

    await api
      .delete(`/api/admin/event-challenges/${locked!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('updates and deletes events', async () => {
    const updated = await api
      .patch(`/api/admin/events/${eventDraft}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: `Renamed Draft ${runSuffix}` })
      .expect(200);
    expect((updated.body.data as EventSummaryDto).title).toContain('Renamed Draft');

    await api
      .delete(`/api/admin/events/${eventDraft}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await api.get(`/api/events/${eventDraft}`).expect(404);
  });
});

describe('announcements API', () => {
  it('lists empty announcements for anonymous users', async () => {
    const res = await api.get('/api/announcements?limit=5').expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('lets admins create, update and delete announcements', async () => {
    const created = await api
      .post('/api/admin/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: `Notice ${runSuffix}`, body: 'Event starts soon.', pinned: true })
      .expect(201);
    const id = (created.body.data as { id: number }).id;

    const list = await api.get('/api/announcements').expect(200);
    const items = list.body.data as { id: number; title: string; pinned: boolean }[];
    expect(items.some((a) => a.id === id && a.pinned)).toBe(true);

    await api
      .patch(`/api/admin/announcements/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pinned: false })
      .expect(200);

    await api
      .delete(`/api/admin/announcements/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('blocks non-admins from writing announcements', async () => {
    await api
      .post('/api/admin/announcements')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ title: 'No', body: 'No' })
      .expect(403);
  });
});