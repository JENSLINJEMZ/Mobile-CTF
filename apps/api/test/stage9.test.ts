import { prisma } from "@ctf/database";
import type {
  ChallengeDetailDto,
  FileDto,
  AuditLogDto,
  NotificationDto,
} from "@ctf/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app";

const app = createApp();
const api = request(app);

const runSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
let serial = 0;

function uniqueEmail(tag: string): string {
  serial += 1;
  return `s9-${tag}-${runSuffix}-${serial}@example.com`;
}
function uniqueUsername(tag: string): string {
  serial += 1;
  return `s9${tag}${serial}-${runSuffix.slice(-6)}`;
}
function uniqueSlug(tag: string): string {
  serial += 1;
  return `s9-${tag}-${runSuffix.slice(-8)}-${serial}`;
}

async function register(
  tag: string,
): Promise<{ token: string; userId: number; username: string; email: string }> {
  const username = uniqueUsername(tag);
  const email = uniqueEmail(tag);
  const res = await api.post("/api/auth/register").send({
    email,
    username,
    password: "password123",
  });
  expect(res.status).toBe(201);
  const body = res.body.data as {
    user: { id: number; username: string; email: string };
    tokens: { accessToken: string };
  };
  return {
    token: body.tokens.accessToken,
    userId: body.user.id,
    username: body.user.username,
    email: body.user.email,
  };
}

async function promoteAndRelogin(
  account: { email: string; userId: number },
  role: "AUTHOR" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN",
): Promise<string> {
  await prisma.user.update({ where: { id: account.userId }, data: { role } });
  const login = await api
    .post("/api/auth/login")
    .send({ email: account.email, password: "password123" })
    .expect(200);
  return (login.body.data as { tokens: { accessToken: string } }).tokens
    .accessToken;
}

describe("stage9 admin dashboard & file service", () => {
  let adminToken = "";
  let authorToken = "";
  let moderatorToken = "";
  let userToken = "";
  let adminId = 0;
  let authorId = 0;
  let moderatorId = 0;
  let userId = 0;
  let categoryId = 0;
  const createdChallengeIds: number[] = [];

  async function uploadFile(token: string, opts: {
    name?: string;
    contentType?: string;
    body?: Buffer;
  } = {}): Promise<FileDto> {
    const res = await api
      .post("/api/admin/files")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", opts.body ?? Buffer.from("stage9 file contents"), {
        filename: opts.name ?? "evidence.txt",
        contentType: opts.contentType ?? "text/plain",
      });
    expect(res.status).toBe(201);
    return res.body.data as FileDto;
  }

  beforeAll(async () => {
    serial = 0;
    const category = await prisma.challengeCategory.create({
      data: {
        name: `Stage9 ${runSuffix}`,
        slug: `stage9-${runSuffix.slice(-8)}`,
        icon: "shield",
        sortOrder: 1,
      },
    });
    categoryId = category.id;

    const adminAcct = await register("admin");
    adminId = adminAcct.userId;
    adminToken = await promoteAndRelogin(adminAcct, "ADMIN");

    const authorAcct = await register("author");
    authorId = authorAcct.userId;
    authorToken = await promoteAndRelogin(authorAcct, "AUTHOR");

    const modAcct = await register("mod");
    moderatorId = modAcct.userId;
    moderatorToken = await promoteAndRelogin(modAcct, "MODERATOR");

    const userAcct = await register("user");
    userId = userAcct.userId;
    userToken = userAcct.token;
  });

  afterAll(async () => {
    await prisma.fileAsset
      .deleteMany({ where: {} })
      .catch(() => undefined);
    await prisma.challenge.deleteMany({
      where: { id: { in: createdChallengeIds } },
    }).catch(() => undefined);
    await prisma.$disconnect();
  });

  describe("RBAC permission matrix", () => {
    it("blocks USER from every staff area", async () => {
      await api
        .get("/api/admin/audit-log")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
      await api
        .post("/api/admin/challenges")
        .set("Authorization", `Bearer ${userToken}`)
        .send({})
        .expect(403);
      await api
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });

    it("lets AUTHOR manage content but not users/audit/events", async () => {
      const auth = { Authorization: `Bearer ${authorToken}` };
      await api
        .get("/api/admin/users")
        .set(auth)
        .expect(403);
      await api
        .get("/api/admin/audit-log")
        .set(auth)
        .expect(403);
      await api
        .post("/api/admin/events")
        .set(auth)
        .send({})
        .expect(403);
      const res = await api.get("/api/admin/challenges").set(auth).expect(200);
      expect(res.body.success).toBe(true);
    });

    it("lets MODERATOR manage events/analytics but not users/audit", async () => {
      const auth = { Authorization: `Bearer ${moderatorToken}` };
      await api.get("/api/admin/users").set(auth).expect(403);
      await api.get("/api/admin/audit-log").set(auth).expect(403);
      await api.get("/api/admin/analytics/overview").set(auth).expect(200);
      await api
        .post("/api/admin/events")
        .set(auth)
        .send({
          slug: uniqueSlug("ev"),
          title: "Moderator event",
          description: "x",
          startsAt: new Date(Date.now() + 86_400_000).toISOString(),
          endsAt: new Date(Date.now() + 172_800_000).toISOString(),
          status: "DRAFT",
        })
        .expect(201);
    });

    it("lets ADMIN use every staff area", async () => {
      const auth = { Authorization: `Bearer ${adminToken}` };
      await api.get("/api/admin/users").set(auth).expect(200);
      await api.get("/api/admin/audit-log").set(auth).expect(200);
      await api.get("/api/admin/analytics/overview").set(auth).expect(200);
      await api.get("/api/admin/teams").set(auth).expect(200);
      await api.get("/api/admin/files").set(auth).expect(200);
    });
  });

  describe("user & team admin RBAC", () => {
    it("ADMIN edits another user's role", async () => {
      const res = await api
        .patch(`/api/admin/users/${moderatorId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "AUTHOR" })
        .expect(200);
      expect((res.body.data as { role: string }).role).toBe("AUTHOR");
      await prisma.user.update({
        where: { id: moderatorId },
        data: { role: "MODERATOR" },
      });
    });

    it("rejects self role-change and level-skipping grants", async () => {
      await api
        .patch(`/api/admin/users/${adminId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "SUPER_ADMIN" })
        .expect(400);
      const res = await api
        .patch(`/api/admin/users/${userId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "ADMIN" })
        .expect(403);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "FORBIDDEN",
      );
    });

    it("deactivates and prevents re-login", async () => {
      const victim = await register("victim");
      await api
        .patch(`/api/admin/users/${victim.userId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);
      const login = await api
        .post("/api/auth/login")
        .send({ email: victim.email, password: "password123" });
      expect(login.status).toBe(401);
    });

    it("MODERATOR cannot grant an equal-or-higher role", async () => {
      const target = await register("midpromote");
      const res = await api
        .patch(`/api/admin/users/${target.userId}`)
        .set("Authorization", `Bearer ${moderatorToken}`)
        .send({ role: "MODERATOR" })
        .expect(403);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "FORBIDDEN",
      );
    });

    it("ADMIN deletes a team", async () => {
      const leader = await register("tlead");
      const created = await api
        .post("/api/teams")
        .set("Authorization", `Bearer ${leader.token}`)
        .send({ name: `Stage9 Team ${runSuffix}` })
        .expect(201);
      const teamId = (created.body.data as { id: number }).id;
      await api
        .delete(`/api/admin/teams/${teamId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      const gone = await prisma.team.findUnique({ where: { id: teamId } });
      expect(gone).toBeNull();
    });
  });

  describe("file service", () => {
    it("rejects unsupported MIME and empty bodies", async () => {
      const auth = { Authorization: `Bearer ${adminToken}` };
      await api
        .post("/api/admin/files")
        .set(auth)
        .attach("file", Buffer.from("nope"), {
          filename: "evil.exe",
          contentType: "application/x-msdownload",
        })
        .expect(415);
      await api
        .post("/api/admin/files")
        .set(auth)
        .attach("file", Buffer.alloc(0), {
          filename: "empty.txt",
          contentType: "text/plain",
        })
        .expect(400);
    });

    it("rejects oversized uploads (multer limit)", async () => {
      const big = Buffer.alloc(envLimitBytes() + 1024, 0x41);
      await api
        .post("/api/admin/files")
        .set("Authorization", `Bearer ${authorToken}`)
        .attach("file", big, {
          filename: "big.bin",
          contentType: "application/octet-stream",
        })
        .expect(413);
    });

    it("stores an allowed upload and serves it via a signed URL", async () => {
      const file = await uploadFile(adminToken, {
        body: Buffer.from("evidence-staged-0\n"),
      });
      expect(file.sha256).toHaveLength(64);
      expect(file.sizeBytes).toBe("evidence-staged-0\n".length);
      expect(file.url).toMatch(/^\/api\/files\//);

      const download = await api.get(file.url!).expect(200);
      expect(download.text).toBe("evidence-staged-0\n");

      // Tampered signature must fail verification.
      const urlObj = new URL(file.url!, "http://x");
      urlObj.searchParams.set("sig", "0".repeat(64));
      await api.get(urlObj.pathname + urlObj.search).expect(403);

      // Expired link must fail.
      urlObj.searchParams.set("exp", `${Math.floor(Date.now() / 1000) - 10}`);
      await api.get(urlObj.pathname + urlObj.search).expect(403);
    });

    it("lists and deletes files", async () => {
      const file = await uploadFile(adminToken);
      const list = await api
        .get("/api/admin/files")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(
        (list.body.data as { items: FileDto[] }).items.some(
          (f) => f.id === file.id,
        ),
      ).toBe(true);
      await api
        .delete(`/api/admin/files/${file.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      const gone = await prisma.fileAsset.findUnique({ where: { id: file.id } });
      expect(gone).toBeNull();
    });

    it("rate-limits per-user uploads", async () => {
      const auth = { Authorization: `Bearer ${adminToken}` };
      let limited = false;
      for (let i = 0; i < 105; i += 1) {
        const res = await api
          .post("/api/admin/files")
          .set(auth)
          .attach("file", Buffer.from(`rl-${i}`), {
            filename: "rl.txt",
            contentType: "text/plain",
          });
        if (res.status === 429) {
          limited = true;
          expect(res.body.error.code).toBe("RATE_LIMITED");
          break;
        }
        expect(res.status).toBe(201);
      }
      expect(limited).toBe(true);
    });
  });

  describe("challenge authoring end-to-end (exit criteria)", () => {
    let draftId = 0;
    let publishedId = 0;
    const FLAG = "ctf{stage9_dashboard_flag}";

    it("author creates a draft, attaches a file, publishes", async () => {
      const auth = { Authorization: `Bearer ${authorToken}` };
      const created = await api
        .post("/api/admin/challenges")
        .set(auth)
        .send({
          title: `Stage9 E2E ${runSuffix}`,
          slug: uniqueSlug("e2e"),
          description: "Author it, attach it, publish it.",
          categoryId,
          difficulty: "MEDIUM",
          basePoints: 250,
          flag: FLAG,
          published: false,
        })
        .expect(201);
      draftId = (created.body.data as { id: number }).id;
      createdChallengeIds.push(draftId);

      // Draft is invisible to regular users.
      await api
        .get(`/api/challenges/${draftId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(404);

      const file = await uploadFile(authorToken, {
        body: Buffer.from("solve-hint-attachment\n"),
      });
      await api
        .post(`/api/admin/challenges/${draftId}/attachments`)
        .set(auth)
        .send({ fileId: file.id, title: "Solve guide" })
        .expect(201);

      // Version history records both states.
      const versions = await api
        .get(`/api/admin/challenges/${draftId}/versions`)
        .set(auth)
        .expect(200);
      expect((versions.body.data as unknown[]).length).toBeGreaterThanOrEqual(1);

      const published = await api
        .put(`/api/admin/challenges/${draftId}`)
        .set(auth)
        .send({
          title: `Stage9 E2E ${runSuffix}`,
          slug: uniqueSlug("e2e"),
          description: "Author it, attach it, publish it.",
          categoryId,
          difficulty: "MEDIUM",
          basePoints: 250,
          flag: FLAG,
          published: true,
        })
        .expect(200);
      publishedId = (published.body.data as ChallengeDetailDto).id;

      const detail = await api
        .get(`/api/challenges/${publishedId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      const att = (detail.body.data as ChallengeDetailDto).attachments;
      expect(att).toHaveLength(1);
      expect(att[0]!.url).toMatch(/^\/api\/files\//);
    });

    it("records matching audit entries and feeds analytics", async () => {
      const auth = { Authorization: `Bearer ${adminToken}` };
      const audit = await api
        .get(`/api/admin/audit-log?action=challenge.create&limit=50`)
        .set(auth)
        .expect(200);
      const items = (audit.body.data as { items: AuditLogDto[] }).items;
      expect(
        items.some(
          (e) =>
            e.action === "challenge.create" &&
            e.entityId === String(draftId) &&
            e.actorId === authorId,
        ),
      ).toBe(true);

      // Solve the challenge so analytics reflects real submission data.
      await api
        .post(`/api/challenges/${publishedId}/submissions`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ flag: FLAG })
        .expect(200);

      const overview = await api
        .get("/api/admin/analytics/overview")
        .set(auth)
        .expect(200);
      const data = overview.body.data as {
        totalUsers: number;
        totalChallenges: number;
        totalSubmissions: number;
      };
      expect(data.totalUsers).toBeGreaterThan(0);
      expect(data.totalChallenges).toBeGreaterThan(0);
      expect(data.totalSubmissions).toBeGreaterThan(0);
    });
  });

  describe("notifications", () => {
    it("broadcasts to active users, then supports read tracking", async () => {
      const broadcast = await api
        .post("/api/admin/notifications/broadcast")
        .set("Authorization", `Bearer ${moderatorToken}`)
        .send({
          type: "SYSTEM",
          title: "Stage9 broadcast",
          body: "Hello everyone",
        })
        .expect(201);
      expect((broadcast.body.data as { recipients: number }).recipients).toBeGreaterThan(
        0,
      );

      const own = await api
        .get("/api/notifications?limit=20")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      const items = (own.body.data as { items: NotificationDto[] }).items;
      const target = items.find((n) => n.title === "Stage9 broadcast");
      expect(target).toBeDefined();
      expect(target!.readAt).toBeNull();

      const unread = await api
        .get("/api/notifications/unread-count")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect(
        (unread.body.data as { count: number }).count,
      ).toBeGreaterThanOrEqual(1);

      await api
        .post(`/api/notifications/${target!.id}/read`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      const after = await api
        .get("/api/notifications/unread-count")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect((after.body.data as { count: number }).count).toBeLessThan(
        (unread.body.data as { count: number }).count,
      );

      const unreadList = await api
        .get("/api/notifications?unreadOnly=true")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect(
        (unreadList.body.data as { items: NotificationDto[] }).items.some(
          (n) => n.id === target!.id,
        ),
      ).toBe(false);
    });

    it("creates an announcement notification for everyone", async () => {
      await api
        .post("/api/admin/announcements")
        .set("Authorization", `Bearer ${authorToken}`)
        .send({
          title: `Stage9 announcement ${runSuffix}`,
          body: "New content is live",
          pinned: false,
        })
        .expect(201);
      const own = await api
        .get("/api/notifications?limit=50")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect(
        (own.body.data as { items: NotificationDto[] }).items.some(
          (n) => n.type === "ANNOUNCEMENT",
        ),
      ).toBe(true);
    });
  });
});

function envLimitBytes(): number {
  return Number(process.env.FILE_MAX_BYTES ?? 26214400);
}