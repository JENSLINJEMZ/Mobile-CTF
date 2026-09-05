import type { Request, RequestHandler } from 'express';

import { getRedis } from '../services/dependencies';
import { ApiError } from './errors';

export interface RateLimiterOptions {
  windowMs: number;
  limit: number;
  keyPrefix: string;
  keyGenerator?: (req: Request) => string;
}

const SECONDS_IN_MS = 1000;

export function createRateLimiter(options: RateLimiterOptions): RequestHandler {
  const windowSeconds = Math.max(1, Math.floor(options.windowMs / SECONDS_IN_MS));
  const keyGenerator = options.keyGenerator;

  return async (req, res, next) => {
    try {
      const identity = keyGenerator?.(req) ?? req.ip ?? 'unknown';
      const key = `ratelimit:${options.keyPrefix}:${identity}`;
      const redis = getRedis();

      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }
      const ttl = await redis.ttl(key);

      res.setHeader('RateLimit-Limit', String(options.limit));
      res.setHeader('RateLimit-Remaining', String(Math.max(0, options.limit - count)));
      res.setHeader('RateLimit-Reset', String(ttl));

      if (count > options.limit) {
        res.setHeader('Retry-After', String(ttl));
        throw new ApiError(
          429,
          'RATE_LIMITED',
          'Too many requests, please slow down and try again shortly',
          { retryAfterSeconds: ttl },
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}