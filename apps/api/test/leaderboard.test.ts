import { createServer, type Server as HttpServer } from "node:http";

import { prisma } from "@ctf/database";
import type { LeaderboardResponse, SubmitFlagResponse } from "@ctf/shared";
import { io as createClient, type Socket } from "socket.io-client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { attachSocket } from "../src/websocket/leaderboard";

const app = createApp();
const api = request(app);

const runSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const FLAGS = [
  "ctf{leaderboard_gold}",
  "ctf{leaderboard_silver}",
  "ctf{leaderboard_bronze}",
];

let categoryId = 0;
let server: HttpServer;
let port = 0;
const challengeIds: number[] = [];
let tokenA = "";
let tokenB = "";
let userIdA = 0;
let userIdB = 0;
let usernameA = "";

let serial = 0;
function uniqueEmail(): string {
  serial += 1;
  return `lb-${runSuffix}-${serial}@example.com`;
}
function uniqueUsername(): string {
  serial += 1;
  return `lbuser${serial}-${runSuffix.slice(-6)}`;
}

async function register(): Promise<{
  token: string;
  userId: number;
  username: string;
}> {
  const username = uniqueUsername();
  const email = uniqueEmail();
  const res = await api.post("/api/auth/register").send({
    email,
    username,
    password: "password123",
  });
  expect(res.status).toBe(201);
  const body = res.body.data as {
    user: { id: number; username: string };
    tokens: { accessToken: string };
  };
  return {
    token: body.tokens.accessToken,
    userId: body.user.id,
    username: body.user.username,
  };
}

function once(
  socket: Socket,
  event: string,
  timeoutMs: number,
): Promise<unknown> {
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

beforeAll(async () => {
  const category = await prisma.challengeCategory.create({
    data: {
      name: `Test Leaderboard ${runSuffix}`,
      slug: `test-leaderboard-${runSuffix.slice(-8)}`,
      icon: "podium",
      sortOrder: 1,
    },
  });
  categoryId = category.id;

  const regA = await register();
  tokenA = regA.token;
  userIdA = regA.userId;
  usernameA = regA.username;

  const regB = await register();
  tokenB = regB.token;
  userIdB = regB.userId;

  for (const [i, _flag] of FLAGS.entries()) {
    const challenge = await prisma.challenge.create({
      data: {
        title: `Leaderboard Challenge ${i + 1}`,
        slug: `lb-challenge-${runSuffix.slice(-8)}-${i}`,
        description: "A ranked challenge.",
        category: { connect: { id: categoryId } },
        createdBy: { connect: { id: userIdA } },
        difficulty: "EASY",
        basePoints: 100,
        published: true,
        flagSalt: "lb-test-salt",
        flagHash: "lb-test-hash",
      },
    });
    challengeIds.push(challenge.id);
  }
  // Replace the placeholder hash with a real one for the current flags.
  const { hashFlag } = await import("@ctf/database");
  for (const [i, _flag] of FLAGS.entries()) {
    await prisma.challenge.update({
      where: { id: challengeIds[i] },
      data: { flagHash: hashFlag(_flag, "lb-test-salt") },
    });
  }

  server = createServer(app);
  attachSocket(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as { port: number }).port;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await prisma.$disconnect();
});

describe("GET /api/leaderboard", () => {
  it("returns an empty board for anonymous users with me: null", async () => {
    const res = await api.get("/api/leaderboard");
    expect(res.status).toBe(200);
    const data = res.body.data as LeaderboardResponse;
    expect(data.scope).toBe("global");
    expect(data.me).toBeNull();
    expect(Array.isArray(data.entries)).toBe(true);
  });

  it("requires auth for /me", async () => {
    const res = await api.get("/api/leaderboard/me");
    expect(res.status).toBe(401);
  });

  it("contains the solver ranked by score after solving", async () => {
    await api
      .post(`/api/challenges/${challengeIds[0]}/submissions`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ flag: FLAGS[0] })
      .expect(200);

    const res = await api
      .get("/api/leaderboard")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const data = res.body.data as LeaderboardResponse;

    for (let i = 1; i < data.entries.length; i += 1) {
      expect(data.entries[i - 1]?.score).toBeGreaterThanOrEqual(
        data.entries[i]?.score ?? 0,
      );
    }
    expect(
      data.entries.every((e) => e.rank === data.entries.indexOf(e) + 1),
    ).toBe(true);

    const mine = data.entries.find((e) => e.userId === userIdA);
    expect(data.me?.score).toBe(110);
    expect(data.me?.rank).toBeTypeOf("number");
    if (mine) {
      expect(mine.username).toBe(usernameA);
      expect(mine.score).toBe(110);
      expect(data.me?.rank).toBe(mine.rank);
    }
  });

  it("exposes global rank in the submit response", async () => {
    const res = await api
      .post(`/api/challenges/${challengeIds[1]}/submissions`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ flag: FLAGS[1] });
    const data = res.body.data as SubmitFlagResponse;
    expect(data.correct).toBe(true);
    expect(data.pointsAwarded).toBe(110);
    expect(data.totalScore).toBe(110);
    expect(typeof data.rank).toBe("number");
  });

  it("records daily and weekly scopes on solve", async () => {
    const daily = await api
      .get("/api/leaderboard?scope=daily")
      .set("Authorization", `Bearer ${tokenB}`);
    const dailyData = daily.body.data as LeaderboardResponse;
    expect(dailyData.scope).toBe("daily");
    expect(dailyData.me?.score).toBeGreaterThan(0);

    const weekly = await api
      .get("/api/leaderboard?scope=weekly")
      .set("Authorization", `Bearer ${tokenB}`);
    const weeklyData = weekly.body.data as LeaderboardResponse;
    expect(weeklyData.scope).toBe("weekly");
    expect(weeklyData.me?.score).toBeGreaterThan(0);
  });

  it("clamps limit to the configured maximum", async () => {
    const res = await api.get("/api/leaderboard?scope=global&limit=9999");
    expect(res.status).toBe(200);
    const data = res.body.data as LeaderboardResponse;
    expect(data.entries.length).toBeLessThanOrEqual(100);
  });
});

describe("leaderboard WebSocket (/leaderboard)", () => {
  it("rejects anonymous sockets", async () => {
    const anon = createClient(`http://127.0.0.1:${port}/leaderboard`, {
      transports: ["websocket"],
    });
    await new Promise<void>((resolve, reject) => {
      anon.on("connect_error", (err) => {
        expect(err.message).toBe("unauthorized");
        resolve();
      });
      anon.on("connect", () => reject(new Error("anonymous socket connected")));
      setTimeout(
        () => reject(new Error("anonymous socket never errored")),
        3000,
      );
    });
    anon.close();
  });

  it("accepts authenticated sockets", async () => {
    const socket = createClient(`http://127.0.0.1:${port}/leaderboard`, {
      transports: ["websocket"],
      auth: { token: tokenA },
    });
    await new Promise<void>((resolve, reject) => {
      socket.on("connect", () => resolve());
      socket.on("connect_error", (err) => reject(err));
      setTimeout(() => reject(new Error("auth socket never connected")), 3000);
    });
    socket.close();
  });

  it("broadcasts leaderboard:update to connected clients on a solve", async () => {
    const socket = createClient(`http://127.0.0.1:${port}/leaderboard`, {
      transports: ["websocket"],
      auth: { token: tokenB },
    });
    await new Promise<void>((resolve, reject) => {
      socket.on("connect", () => resolve());
      socket.on("connect_error", (err) => reject(err));
    });

    const eventPromise = once(socket, "leaderboard:update", 4000);
    const submitP = api
      .post(`/api/challenges/${challengeIds[2]}/submissions`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ flag: FLAGS[2] });
    await submitP;

    const event = (await eventPromise) as {
      type: string;
      userId: number;
      username: string;
      pointsAwarded: number;
      scope: string;
      at: string;
    };
    expect(event.type).toBe("solved");
    expect(event.userId).toBe(userIdB);
    expect(event.pointsAwarded).toBe(110);
    expect(event.scope).toBe("global");
    expect(event.at).toBeTruthy();
    socket.close();
  });
});
