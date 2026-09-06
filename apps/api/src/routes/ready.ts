import type { ReadyResponse } from "@ctf/shared";
import { Router } from "express";

import { asyncHandler } from "../middleware/errors";
import { checkPostgres, checkRedis } from "../services/dependencies";
import { getSandboxRuntime } from "../services/terminalSessions";

export const readyRouter = Router();

readyRouter.get(
  "/ready",
  asyncHandler(async (_req, res) => {
    const [postgres, redis, sandbox] = await Promise.all([
      checkPostgres(),
      checkRedis(),
      getSandboxRuntime()
        .isAvailable()
        .then(
          (ok) => ok,
          () => false,
        ),
    ]);

    const ready = postgres && redis && sandbox;
    const body: ReadyResponse = {
      status: ready ? "ready" : "not_ready",
      dependencies: {
        postgres: { status: postgres ? "up" : "down" },
        redis: { status: redis ? "up" : "down" },
        sandbox: { status: sandbox ? "up" : "down" },
      },
    };
    res.status(ready ? 200 : 503).json(body);
  }),
);
