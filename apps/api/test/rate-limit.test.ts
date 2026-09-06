import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { errorHandler } from "../src/middleware/errors";
import { createRateLimiter } from "../src/middleware/rateLimit";

describe("createRateLimiter", () => {
  it("allows requests under the limit and rejects beyond it with 429", async () => {
    const prefix = `test-${Date.now()}`;
    const keyPrefix = `rate-${prefix}-general`;

    const app = express();
    app.use(express.json());
    const limiter = createRateLimiter({ windowMs: 5000, limit: 3, keyPrefix });
    app.post("/limited", limiter, (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);

    const api = request(app);

    for (let i = 1; i <= 3; i += 1) {
      const res = await api.post("/limited");
      expect(res.status).toBe(200);
      expect(Number(res.headers["ratelimit-limit"])).toBe(3);
      expect(Number(res.headers["ratelimit-remaining"])).toBe(3 - i);
    }

    const blocked = await api.post("/limited");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMITED");
    expect(typeof blocked.headers["retry-after"]).toBe("string");

    const stillBlocked = await api.post("/limited");
    expect(stillBlocked.status).toBe(429);
  });

  it("keys by identity, so a different identity is allowed", async () => {
    const keyPrefix = `ratelimit-${Date.now()}-identity`;
    const app = express();
    const limiter = createRateLimiter({
      windowMs: 5000,
      limit: 2,
      keyPrefix,
      keyGenerator: (req) => String(req.headers["x-identity"] ?? "anon"),
    });
    app.use(limiter);
    app.get("/", (_req, res) => res.json({ ok: true }));
    const api = request(app);

    await api.get("/").set("X-Identity", "alpha");
    const second = await api.get("/").set("X-Identity", "alpha");
    expect(second.status).toBe(200);
    const third = await api.get("/").set("X-Identity", "alpha");
    expect(third.status).toBe(429);

    const other = await api.get("/").set("X-Identity", "bravo");
    expect(other.status).toBe(200);
  });
});
