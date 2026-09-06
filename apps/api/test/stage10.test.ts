import { prisma } from "@ctf/database";
import type { PushTokenDto } from "@ctf/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app";

const { sent } = vi.hoisted(() => ({
  sent: [] as Array<{ to: string; title: string; body: string }>,
}));

vi.mock("expo-server-sdk", () => {
  class ExpoMock {
    static isExpoPushToken(token: string): boolean {
      return /^ExponentPushToken\[[A-Za-z0-9_-]+\]$/.test(token);
    }

    async sendPushNotificationsAsync(
      messages: Array<{ to: string; title: string; body: string }>,
    ): Promise<void> {
      sent.push(...messages);
    }
  }
  return { Expo: ExpoMock };
});

const app = createApp();
const api = request(app);

const runSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
let serial = 0;

function uniqueEmail(tag: string): string {
  serial += 1;
  return `s10-${tag}-${runSuffix}-${serial}@example.com`;
}
function uniqueUsername(tag: string): string {
  serial += 1;
  return `s10${tag}${serial}-${runSuffix.slice(-6)}`;
}

async function register(tag: string): Promise<{
  token: string;
  userId: number;
  email: string;
}> {
  const username = uniqueUsername(tag);
  const email = uniqueEmail(tag);
  const res = await api.post("/api/auth/register").send({
    email,
    username,
    password: "password123",
  });
  expect(res.status).toBe(201);
  const body = res.body.data as {
    user: { id: number };
    tokens: { accessToken: string };
  };
  return {
    token: body.tokens.accessToken,
    userId: body.user.id,
    email,
  };
}

async function promoteAndRelogin(
  account: { email: string; userId: number },
  role: "AUTHOR" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN",
): Promise<string> {
  await prisma.user.update({ where: { id: account.userId }, data: { role } });
  const login = await api.post("/api/auth/login").send({
    email: account.email,
    password: "password123",
  });
  expect(login.status).toBe(200);
  return (login.body.data as { tokens: { accessToken: string } }).tokens
    .accessToken;
}

const VALID_TOKEN = "ExponentPushToken[stage10TestToken12345]";
const INVALID_TOKEN = "garbage-not-an-expo-token";

beforeAll(() => {
  sent.length = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("push token registration", () => {
  it("requires authentication", async () => {
    const res = await api
      .post("/api/notifications/push-token")
      .send({ token: VALID_TOKEN, platform: "android" });
    expect(res.status).toBe(401);
  });

  it("rejects malformed bodies", async () => {
    const account = await register("pushtok");
    const res = await api
      .post("/api/notifications/push-token")
      .set("Authorization", `Bearer ${account.token}`)
      .send({ token: "short", platform: "desktop" });
    expect(res.status).toBe(400);
  });

  it("registers, upserts on duplicate, and lists tokens", async () => {
    const account = await register("pushtok");
    const first = await api
      .post("/api/notifications/push-token")
      .set("Authorization", `Bearer ${account.token}`)
      .send({ token: VALID_TOKEN, platform: "android" });
    expect(first.status).toBe(201);
    const dto = first.body.data as PushTokenDto;
    expect(dto.token).toBe(VALID_TOKEN);
    expect(dto.platform).toBe("android");
    expect(dto.enabled).toBe(true);

    const second = await api
      .post("/api/notifications/push-token")
      .set("Authorization", `Bearer ${account.token}`)
      .send({ token: VALID_TOKEN, platform: "ios" });
    expect(second.status).toBe(201);
    expect((second.body.data as PushTokenDto).platform).toBe("ios");

    const list = await api
      .get("/api/notifications/push-tokens")
      .set("Authorization", `Bearer ${account.token}`);
    expect(list.status).toBe(200);
    const items = (list.body.data as { items: PushTokenDto[] }).items;
    expect(items).toHaveLength(1);
    expect(items[0]?.platform).toBe("ios");
  });

  it("unregisters a token", async () => {
    const account = await register("pushtok");
    await api
      .post("/api/notifications/push-token")
      .set("Authorization", `Bearer ${account.token}`)
      .send({ token: VALID_TOKEN, platform: "web" });

    const res = await api
      .delete("/api/notifications/push-token")
      .set("Authorization", `Bearer ${account.token}`)
      .send({ token: VALID_TOKEN });
    expect(res.status).toBe(200);
    expect(res.body.data.unregistered).toBe(true);

    const list = await api
      .get("/api/notifications/push-tokens")
      .set("Authorization", `Bearer ${account.token}`);
    expect((list.body.data as { items: PushTokenDto[] }).items).toHaveLength(0);
  });
});

describe("push dispatch", () => {
  it("sends a push through expo for broadcast notifications", async () => {
    const admin = await register("pushadmin");
    const participant = await register("pushparticipant");
    const adminToken = await promoteAndRelogin(admin, "ADMIN");

    await api
      .post("/api/notifications/push-token")
      .set("Authorization", `Bearer ${participant.token}`)
      .send({ token: VALID_TOKEN, platform: "android" });

    sent.length = 0;
    const title = "Stage 10 push announcement";
    const body = "This should reach the device via expo push.";
    const announce = await api
      .post("/api/admin/announcements")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title, body, pinned: false });
    expect(announce.status).toBe(201);

    expect(sent).toContainEqual({
      to: VALID_TOKEN,
      sound: "default",
      title,
      body,
    });

    const unread = await api
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${participant.token}`);
    expect((unread.body.data as { count: number }).count).toBe(1);
  });

  it("skips tokens that are not valid expo push tokens", async () => {
    const admin = await register("pushadmin");
    const participant = await register("pushparticipant");
    const adminToken = await promoteAndRelogin(admin, "ADMIN");

    await api
      .post("/api/notifications/push-token")
      .set("Authorization", `Bearer ${participant.token}`)
      .send({ token: INVALID_TOKEN, platform: "android" });

    sent.length = 0;
    const announce = await api
      .post("/api/admin/announcements")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ title: "No push expected", body: "skipped", pinned: false });
    expect(announce.status).toBe(201);

    expect(sent.filter((m) => m.to === INVALID_TOKEN)).toHaveLength(0);

    const unread = await api
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${participant.token}`);
    expect((unread.body.data as { count: number }).count).toBe(1);
  });
});