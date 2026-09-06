import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://ctf:ctf@localhost:5432/ctf_test";

const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379";

const prismaCli = resolve(
  require.resolve("prisma/build/index.js", {
    paths: [resolve(import.meta.dirname, "../../../packages/database")],
  }),
);

function migrate() {
  execFileSync(
    process.execPath,
    [
      prismaCli,
      "migrate",
      "deploy",
      "--schema",
      join(
        resolve(import.meta.dirname, "../../../packages/database"),
        "prisma/schema.prisma",
      ),
    ],
    {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: "inherit",
    },
  );
}

async function truncateAll(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
      )
      LOOP
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', r.tablename);
      END LOOP;
    END $$;
  `);
}

export default async function globalSetup() {
  migrate();
  const prisma = new PrismaClient({
    datasources: { db: { url: TEST_DATABASE_URL } },
  });
  await truncateAll(prisma);
  await prisma.$disconnect();

  const redis = new Redis(TEST_REDIS_URL, { lazyConnect: true });
  await redis.connect();
  await redis.flushall();
  await redis.quit();
}
