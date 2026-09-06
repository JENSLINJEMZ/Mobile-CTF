import { prisma } from "@ctf/database";
import type { AuthResponse } from "@ctf/shared";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app";

const app = createApp();
const api = request(app);

const runSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let runSerial = 0;

function uniqueEmail(prefix = "user"): string {
  runSerial += 1;
  return `${prefix}-${runSuffix}-${runSerial}@example.com`;
}

function uniqueUsername(prefix: string): string {
  runSerial += 1;
  return `${prefix}-${runSerial}-${runSuffix.slice(-6)}`;
}

function extractAuth(res: request.Response): AuthResponse {
  expect([200, 201]).toContain(res.status);
  const body = res.body as { success: boolean; data: AuthResponse };
  expect(body.success).toBe(true);
  return body.data;
}

beforeAll(async () => {
  await prisma.$disconnect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/auth/register", () => {
  it("creates a user and returns a token pair", async () => {
    const email = uniqueEmail();
    const username = uniqueUsername("alice");
    const res = await api.post("/api/auth/register").send({
      email,
      username,
      password: "password123",
    });
    const data = extractAuth(res);

    expect(data.user.email).toBe(email.toLowerCase());
    expect(data.user.username).toBe(username);
    expect(data.user.role).toBe("USER");
    expect(data.user.id).toBeGreaterThan(0);
    expect(data.tokens.accessToken).toBeTruthy();
    expect(data.tokens.refreshToken).toBeTruthy();
    expect(data.tokens.expiresIn).toBeGreaterThan(0);

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored).not.toBeNull();
    expect(stored!.passwordHash).not.toContain("password123");
  });

  it("rejects an existing email (409)", async () => {
    const email = uniqueEmail();
    await api
      .post("/api/auth/register")
      .send({
        email,
        username: uniqueUsername("bob1"),
        password: "password123",
      });
    const res = await api.post("/api/auth/register").send({
      email,
      username: uniqueUsername("bob2"),
      password: "password123",
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects an existing username (409)", async () => {
    const email = uniqueEmail();
    const username = uniqueUsername("carol");
    const res = await api
      .post("/api/auth/register")
      .send({ email, username, password: "password123" });
    expect(res.status).toBe(201);
    const res2 = await api
      .post("/api/auth/register")
      .send({ email: uniqueEmail(), username, password: "password123" });
    expect(res2.status).toBe(409);
  });

  it("rejects malformed payloads (400)", async () => {
    const res = await api
      .post("/api/auth/register")
      .send({ email: "not-an-email", username: "x", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/auth/login", () => {
  const email = uniqueEmail();
  const password = "password123";

  beforeAll(async () => {
    await api
      .post("/api/auth/register")
      .send({ email, username: uniqueUsername("dana"), password });
  });

  it("returns a token pair for valid credentials", async () => {
    const res = await api.post("/api/auth/login").send({ email, password });
    const data = extractAuth(res);
    expect(data.user.email).toBe(email.toLowerCase());
    expect(data.tokens.accessToken).toBeTruthy();
    const session = await prisma.user.findUnique({
      where: { email },
      include: { sessions: true },
    });
    expect(session!.lastLoginAt).not.toBeNull();
    expect(session!.sessions.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects a wrong password (401) and does not leak records", async () => {
    const res = await api
      .post("/api/auth/login")
      .send({ email, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects an unknown email identically (401)", async () => {
    const res = await api
      .post("/api/auth/login")
      .send({ email: uniqueEmail("ghost"), password: "wrong-password" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  const email = uniqueEmail();
  let tokens: AuthResponse;

  beforeAll(async () => {
    const res = await api
      .post("/api/auth/register")
      .send({
        email,
        username: uniqueUsername("erin"),
        password: "password123",
      });
    tokens = extractAuth(res);
  });

  it("returns the user for a valid access token", async () => {
    const res = await api
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${tokens.tokens.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(email.toLowerCase());
  });

  it("rejects a missing token (401)", async () => {
    const res = await api.get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects a garbage token (401)", async () => {
    const res = await api
      .get("/api/auth/me")
      .set("Authorization", "Bearer not.a.jwt");
    expect(res.status).toBe(401);
  });
});

describe("refresh token rotation", () => {
  const email = uniqueEmail();
  let first: AuthResponse;
  let rotated: AuthResponse;

  beforeAll(async () => {
    const res = await api
      .post("/api/auth/register")
      .send({
        email,
        username: uniqueUsername("farid"),
        password: "password123",
      });
    first = extractAuth(res);
  });

  it("issues a new pair and invalidates the old refresh token", async () => {
    const res = await api
      .post("/api/auth/refresh")
      .send({ refreshToken: first.tokens.refreshToken });
    rotated = extractAuth(res);
    expect(rotated.tokens.refreshToken).not.toBe(first.tokens.refreshToken);

    const reuse = await api
      .post("/api/auth/refresh")
      .send({ refreshToken: first.tokens.refreshToken });
    expect(reuse.status).toBe(401);
  });

  it("rotates again with the fresh token", async () => {
    const res = await api
      .post("/api/auth/refresh")
      .send({ refreshToken: rotated.tokens.refreshToken });
    expect(extractAuth(res).user.id).toBe(first.user.id);
  });
});

describe("logout and logout-all", () => {
  const email = uniqueEmail();
  let session1: AuthResponse;
  let session2: AuthResponse;

  beforeAll(async () => {
    const reg = await api
      .post("/api/auth/register")
      .send({
        email,
        username: uniqueUsername("gina"),
        password: "password123",
      });
    session1 = extractAuth(reg);
    const login = await api
      .post("/api/auth/login")
      .send({ email, password: "password123" });
    session2 = extractAuth(login);
  });

  it("logout revokes only the presented session", async () => {
    const res = await api
      .post("/api/auth/logout")
      .send({ refreshToken: session1.tokens.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);

    const reuse = await api
      .post("/api/auth/refresh")
      .send({ refreshToken: session1.tokens.refreshToken });
    expect(reuse.status).toBe(401);

    const other = await api
      .post("/api/auth/refresh")
      .send({ refreshToken: session2.tokens.refreshToken });
    expect(other.status).toBe(200);
  });

  it("logout-all revokes every session", async () => {
    const res = await api
      .post("/api/auth/logout-all")
      .set("Authorization", `Bearer ${session2.tokens.accessToken}`);
    expect(res.status).toBe(200);

    const reuse = await api
      .post("/api/auth/refresh")
      .send({ refreshToken: session2.tokens.refreshToken });
    expect(reuse.status).toBe(401);
  });
});

describe("password reset", () => {
  const email = uniqueEmail();
  const originalPassword = "original-pass-123";

  it("issues a reset token (dev), resets the password, and revokes sessions", async () => {
    const reg = await api.post("/api/auth/register").send({
      email,
      username: uniqueUsername("hugo"),
      password: originalPassword,
    });
    const before = extractAuth(reg);

    const forgot = await api.post("/api/auth/forgot-password").send({ email });
    expect(forgot.status).toBe(200);
    expect(forgot.body.data.ok).toBe(true);
    const devLink = forgot.body.data.devResetLink as string;
    expect(devLink).toContain("/api/auth/reset-password?token=");
    const token = devLink.split("token=")[1];

    const reset = await api
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "new-secure-pass-456" });
    expect(reset.status).toBe(200);
    expect(reset.body.data.ok).toBe(true);

    const oldLogin = await api
      .post("/api/auth/login")
      .send({ email, password: originalPassword });
    expect(oldLogin.status).toBe(401);
    const newLogin = await api
      .post("/api/auth/login")
      .send({ email, password: "new-secure-pass-456" });
    expect(newLogin.status).toBe(200);

    const staleRefresh = await api
      .post("/api/auth/refresh")
      .send({ refreshToken: before.tokens.refreshToken });
    expect(staleRefresh.status).toBe(401);

    const reuse = await api
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "yet-another-pass" });
    expect(reuse.status).toBe(400);
  });

  it("does not reveal whether an account exists (forgot-password)", async () => {
    const res = await api
      .post("/api/auth/forgot-password")
      .send({ email: uniqueEmail("nobody") });
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
    expect(res.body.data.devResetLink).toBeUndefined();
  });
});
