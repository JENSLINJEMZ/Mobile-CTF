import { Router } from 'express';

import { submitFlagSchema, type Difficulty } from '@ctf/shared';

import { env } from '../config/env';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errors';
import { optionalAuth } from '../middleware/optionalAuth';
import { createRateLimiter } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validate';
import {
  getChallengeDetail,
  listCategories,
  listChallenges,
  listTags,
  unlockHint,
} from '../services/challenges';
import { submitFlag } from '../services/submissions';
import { emitLeaderboardSolved } from '../services/events';

export const challengesRouter = Router();

challengesRouter.use(optionalAuth);

challengesRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const data = await listCategories();
    res.json({ success: true, data });
  }),
);

challengesRouter.get(
  '/tags',
  asyncHandler(async (_req, res) => {
    const data = await listTags();
    res.json({ success: true, data });
  }),
);

challengesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await listChallenges(
      {
        page: Number(req.query.page) || undefined,
        limit: Number(req.query.limit) || undefined,
        category: typeof req.query.category === 'string' ? req.query.category : undefined,
        difficulty: typeof req.query.difficulty === 'string'
          ? (req.query.difficulty as Difficulty)
          : undefined,
        tag: typeof req.query.tag === 'string' ? req.query.tag : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        solved: req.query.solved === 'solved' || req.query.solved === 'unsolved' ? req.query.solved : undefined,
      },
      req.user,
    );
    res.json({ success: true, data });
  }),
);

challengesRouter.get(
  '/:id(\\d+)',
  asyncHandler(async (req, res) => {
    const data = await getChallengeDetail(Number(req.params.id), req.user);
    res.json({ success: true, data });
  }),
);

const submissionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: env.rateLimitSubmission,
  keyPrefix: 'submission',
  keyGenerator: (req) => `user:${req.user?.id ?? 'anon'}:challenge:${req.params.id ?? '?'}`,
});

challengesRouter.post(
  '/:id(\\d+)/submissions',
  authenticate,
  submissionLimiter,
  validateBody(submitFlagSchema),
  asyncHandler(async (req, res) => {
    const data = await submitFlag(req.user!.id, Number(req.params.id), req.body.flag);
    if (data.correct && data.pointsAwarded > 0 && req.user) {
      emitLeaderboardSolved({
        type: 'solved',
        userId: req.user.id,
        username: req.user.username,
        pointsAwarded: data.pointsAwarded,
        scope: 'global',
        at: new Date().toISOString(),
      });
    }
    res.json({ success: true, data });
  }),
);

challengesRouter.post(
  '/:id(\\d+)/hints/:hintId(\\d+)/unlock',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await unlockHint(req.user!.id, Number(req.params.id), Number(req.params.hintId));
    res.json({ success: true, data: { hint: data } });
  }),
);