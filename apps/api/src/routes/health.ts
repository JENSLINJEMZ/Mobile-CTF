import { APP_VERSION } from "@ctf/shared";
import type { HealthResponse } from "@ctf/shared";
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  const body: HealthResponse = {
    status: "ok",
    version: APP_VERSION,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
  res.json(body);
});
