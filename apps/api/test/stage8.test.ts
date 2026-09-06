import { prisma } from "@ctf/database";
import type {
  AchievementDto,
  BookmarkDto,
  NoteDto,
  SubmitFlagResponse,
} from "@ctf/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { ensureAchievementDefinitions } from "../src/services/achievements";

const app = createApp();
const api = request(app);

const runSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
let serial = 0;

function uniqueEmail(): string {
  serial += 1;
  return `s8-${runSuffix}-${serial}@example.com`;
}
function uniqueUsername(): string {
  serial += 1;
  return `s8user${serial}-${runSuffix.slice(-6)}`;
}
function uniqueSlug(prefix: string): string {
  serial += 1;
  return `${prefix}-${runSuffix.slice(-8)}-${serial}`;
}

async function register(): Promise<{ token: string; userId: number }> {
  const username = uniqueUsername();
  const res = await api.post("/api/auth/register").send({
    email: uniqueEmail(),
    username,
    password: "password123",
  });
  expect([200, 201]).toContain(res.status);
  const data = res.body.data as {
    user: { id: number };
    tokens: { accessToken: string };
  };
  return { token: data.tokens.accessToken, userId: data.user.id };
}

beforeAll(async () => {
  serial = 0;
  await ensureAchievementDefinitions();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("notes sync", () => {
  let userId = 0;
  let token = "";

  beforeAll(async () => {
    ({ token, userId } = await register());
  });

  it("rejects unauthenticated access", async () => {
    await api.get("/api/notes").expect(401);
  });

  it("syncs upserts and lists notes (LWW by updatedAt)", async () => {
    const newer = new Date(Date.now() - 1000).toISOString();
    const older = new Date(Date.now() - 20_000).toISOString();

    const first = await api
      .post("/api/notes/sync")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            clientKey: "note-key-a",
            title: "Alpha",
            body: "Hello",
            deleted: false,
            updatedAt: older,
          },
        ],
      })
      .expect(200);
    expect(
      (first.body.data as { serverItems: NoteDto[] }).serverItems,
    ).toHaveLength(1);

    const staleUpdate = await api
      .post("/api/notes/sync")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            clientKey: "note-key-a",
            title: "STALE",
            body: "should be ignored",
            deleted: false,
            updatedAt: older,
          },
        ],
      })
      .expect(200);
    const staleItems = (staleUpdate.body.data as { serverItems: NoteDto[] })
      .serverItems;
    expect(staleItems[0]?.title).toBe("Alpha");

    const freshUpdate = await api
      .post("/api/notes/sync")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            clientKey: "note-key-a",
            title: "Beta",
            body: "updated",
            deleted: false,
            updatedAt: newer,
          },
        ],
      })
      .expect(200);
    const freshItems = (freshUpdate.body.data as { serverItems: NoteDto[] })
      .serverItems;
    expect(freshItems[0]?.title).toBe("Beta");

    const list = await api
      .get("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect((list.body.data as NoteDto[]).map((n) => n.clientKey)).toContain(
      "note-key-a",
    );
    expect(userId).toBeGreaterThan(0);
  });

  it("soft-deletes a note so it leaves the active list", async () => {
    await api
      .delete("/api/notes/note-key-a")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const list = await api
      .get("/api/notes")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect((list.body.data as NoteDto[]).map((n) => n.clientKey)).not.toContain(
      "note-key-a",
    );
  });
});

describe("idempotent flag submission", () => {
  let adminToken = "";
  let categoryId = 0;
  let challengeId = 0;
  const FLAG = "ctf{idempotent_dn}";
  let token = "";
  let userId = 0;

  beforeAll(async () => {
    await ensureAchievementDefinitions();

    const category = await prisma.challengeCategory.create({
      data: {
        name: `S8 Cat ${runSuffix}`,
        slug: `s8-cat-${runSuffix.slice(-8)}`,
        icon: "lock",
        sortOrder: 1,
      },
    });
    categoryId = category.id;

    const admin = await register();
    const me = await api
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);
    const adminEmail = (me.body.data as { email: string }).email;
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "ADMIN" },
    });
    const login = await api
      .post("/api/auth/login")
      .send({ email: adminEmail, password: "password123" });
    adminToken = (login.body.data as { tokens: { accessToken: string } }).tokens
      .accessToken;

    const created = await api
      .post("/api/admin/challenges")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Idempotency Target",
        slug: uniqueSlug("idem"),
        description: "One solve.",
        categoryId,
        difficulty: "EASY",
        basePoints: 100,
        flag: FLAG,
        published: true,
      })
      .expect(201);
    challengeId = (created.body.data as { id: number }).id;

    ({ token, userId } = await register());
  });

  it("returns stored outcome on duplicate idempotency key (no double points)", async () => {
    const key = `solve-${runSuffix}`;
    const first = await api
      .post(`/api/challenges/${challengeId}/submissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ flag: FLAG, idempotencyKey: key })
      .expect(200);
    const firstData = first.body.data as SubmitFlagResponse;
    expect(firstData.correct).toBe(true);
    expect(firstData.pointsAwarded).toBeGreaterThan(0);

    const firstScore = firstData.totalScore;

    const dup = await api
      .post(`/api/challenges/${challengeId}/submissions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ flag: FLAG, idempotencyKey: key })
      .expect(200);
    const dupData = dup.body.data as SubmitFlagResponse;
    expect(dupData.correct).toBe(true);
    expect(dupData.pointsAwarded).toBe(0);

    const tried = await prisma.submissionAttempt.findMany({
      where: { userId },
    });
    const withKey = tried.filter((t) => t.idempotencyKey === key);
    expect(withKey).toHaveLength(1);
    expect(dupData.totalScore).toBe(firstScore);
  });
});

describe("bookmarks", () => {
  let adminToken = "";
  let categoryId = 0;
  let challengeId = 0;
  let token = "";

  beforeAll(async () => {
    const category = await prisma.challengeCategory.create({
      data: {
        name: `S8 BM ${runSuffix}`,
        slug: `s8-bm-${runSuffix.slice(-8)}`,
        icon: "pin",
        sortOrder: 1,
      },
    });
    categoryId = category.id;

    const admin = await register();
    const me = await api
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);
    const adminEmail = (me.body.data as { email: string }).email;
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "ADMIN" },
    });
    const login = await api
      .post("/api/auth/login")
      .send({ email: adminEmail, password: "password123" });
    adminToken = (login.body.data as { tokens: { accessToken: string } }).tokens
      .accessToken;

    const created = await api
      .post("/api/admin/challenges")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Bookmark Target",
        slug: uniqueSlug("bm"),
        description: "Pin me.",
        categoryId,
        difficulty: "EASY",
        basePoints: 50,
        flag: "ctf{bookmark_bm}",
        published: true,
      })
      .expect(201);
    challengeId = (created.body.data as { id: number }).id;

    token = (await register()).token;
  });

  it("adds, lists, and marks bookmarkedByMe on the challenge detail", async () => {
    const added = await api
      .post(`/api/bookmarks/${challengeId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const bookmark = added.body.data as BookmarkDto;
    expect(bookmark.challengeId).toBe(challengeId);
    expect(bookmark.solvedByMe).toBe(false);

    const list = await api
      .get("/api/bookmarks")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(
      (list.body.data as { items: BookmarkDto[] }).items.map(
        (b) => b.challengeId,
      ),
    ).toContain(challengeId);

    const detail = await api
      .get(`/api/challenges/${challengeId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(
      (detail.body.data as { bookmarkedByMe: boolean }).bookmarkedByMe,
    ).toBe(true);
  });

  it("removes a bookmark", async () => {
    await api
      .delete(`/api/bookmarks/${challengeId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const list = await api
      .get("/api/bookmarks")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect((list.body.data as { items: BookmarkDto[] }).items.length).toBe(0);
  });
});

describe("achievements", () => {
  let token = "";
  let userId = 0;

  beforeAll(async () => {
    ({ token, userId } = await register());
  });

  it("lists definitions with earnedAt null for a fresh user", async () => {
    const res = await api
      .get("/api/achievements")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const data = res.body.data as {
      items: AchievementDto[];
      earnedCount: number;
    };
    expect(data.earnedCount).toBe(0);
    expect(data.items.length).toBeGreaterThanOrEqual(9);
    expect(data.items.every((i) => i.earnedAt === null)).toBe(true);
  });

  it("grants CURATOR after adding a bookmark", async () => {
    const cat = await prisma.challengeCategory.create({
      data: {
        name: `S8 AC ${runSuffix}`,
        slug: `s8-ac-${runSuffix.slice(-8)}`,
        icon: "medal",
        sortOrder: 1,
      },
    });
    const admin = await register();
    const me = await api
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${admin.token}`)
      .expect(200);
    const adminEmail = (me.body.data as { email: string }).email;
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "ADMIN" },
    });
    const login = await api
      .post("/api/auth/login")
      .send({ email: adminEmail, password: "password123" });
    const adminToken = (login.body.data as { tokens: { accessToken: string } })
      .tokens.accessToken;

    const created = await api
      .post("/api/admin/challenges")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Achievement Target",
        slug: uniqueSlug("ach"),
        description: "Bookmark grant.",
        categoryId: cat.id,
        difficulty: "EASY",
        basePoints: 50,
        flag: "ctf{ach_bm}",
        published: true,
      })
      .expect(201);
    const challengeId = (created.body.data as { id: number }).id;

    await api
      .post(`/api/bookmarks/${challengeId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const res = await api
      .get("/api/achievements")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const data = res.body.data as {
      items: AchievementDto[];
      earnedCount: number;
    };
    const curator = data.items.find((i) => i.code === "CURATOR");
    expect(curator?.earnedAt).toBeTruthy();
    expect(data.earnedCount).toBe(1);
    expect(userId).toBeGreaterThan(0);
  });
});
