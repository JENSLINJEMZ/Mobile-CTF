import type { ReadyResponse } from '@ctf/shared';
import { Router } from 'express';

import { asyncHandler } from '../middleware/errors';
import { checkPostgres, checkRedis } from '../services/dependencies';

export const readyRouter = Router();

readyRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const [postgres, redis] = await Promise.all([checkPostgres(), checkRedis()]);

    const ready = postgres && redis;
    const body: ReadyResponse = {
      status: ready ? 'ready' : 'not_ready',
      dependencies: {
        postgres: { status: postgres ? 'up' : 'down' },
        redis: { status: redis ? 'up' : 'down' },
      },
    };
    res.status(ready ? 200 : 503).json(body);
  }),
);