import { AUTH, RATE_LIMITS } from '@ctf/shared';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Search upward for the monorepo-root `.env`, robust to whether this module
// runs from src/ (tsx) or from the tsup bundle (dist/server.js).
export function findEnvPath(startDir?: string): string | undefined {
  let dir = startDir ?? dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}

config({ path: findEnvPath() });

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '0.0.0.0',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://ctf:ctf@localhost:5432/ctf_dev',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-insecure-refresh-secret',
  accessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? AUTH.ACCESS_TTL_SECONDS),
  refreshTtlSeconds: Number(process.env.JWT_REFRESH_TTL_SECONDS ?? AUTH.REFRESH_TTL_SECONDS),
  passwordResetTtlSeconds: Number(
    process.env.PASSWORD_RESET_TTL_SECONDS ?? AUTH.PASSWORD_RESET_TTL_SECONDS,
  ),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? AUTH.BCRYPT_ROUNDS_DEFAULT),
  rateLimitLogin: Number(process.env.RATE_LIMIT_LOGIN ?? RATE_LIMITS.LOGIN_PER_MIN),
  rateLimitGeneral: Number(
    process.env.RATE_LIMIT_GENERAL ?? RATE_LIMITS.GENERAL_PER_MIN_PER_USER,
  ),
  rateLimitSubmission: Number(
    process.env.RATE_LIMIT_SUBMISSION ?? RATE_LIMITS.SUBMISSION_PER_MIN_PER_USER,
  ),
};