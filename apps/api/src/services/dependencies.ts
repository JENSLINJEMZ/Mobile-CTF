import { prisma } from "@ctf/database";
import Redis from "ioredis";

import { env } from "../config/env";
import { logger } from "../utils/logger";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 1,
    });
  }
  return redisClient;
}

export async function checkPostgres(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.error({ err }, "postgres health check failed");
    return false;
  }
}

export async function checkRedis(): Promise<boolean> {
  try {
    const pong = await getRedis().ping();
    return pong === "PONG";
  } catch (err) {
    logger.error({ err }, "redis health check failed");
    return false;
  }
}

export async function shutdownDependencies(): Promise<void> {
  await Promise.allSettled([prisma.$disconnect(), redisClient?.quit()]);
}
