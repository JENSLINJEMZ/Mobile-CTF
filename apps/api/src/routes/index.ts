import { Router } from 'express';

import { env } from '../config/env';
import { createRateLimiter } from '../middleware/rateLimit';
import { adminRouter } from './admin';
import { authRouter } from './auth';
import { challengesRouter } from './challenges';
import { healthRouter } from './health';
import { leaderboardRouter } from './leaderboard';
import { metricsRouter } from './metrics';
import { readyRouter } from './ready';

export const apiRouter = Router();

const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: env.rateLimitGeneral,
  keyPrefix: 'general',
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : `ip:${req.ip ?? 'unknown'}`),
});

apiRouter.use(healthRouter);
apiRouter.use(readyRouter);
apiRouter.use(metricsRouter);
apiRouter.use(generalLimiter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/challenges', challengesRouter);
apiRouter.use('/leaderboard', leaderboardRouter);
apiRouter.use('/admin', adminRouter);