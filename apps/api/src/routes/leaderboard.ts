import type { LeaderboardScope } from '@ctf/shared';
import { isLeaderboardScope } from '@ctf/shared';
import { LEADERBOARD } from '@ctf/shared';
import { Router } from 'express';

import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errors';
import { optionalAuth } from '../middleware/optionalAuth';
import { getLeaderboard, getGlobalRank } from '../services/leaderboard';

export const leaderboardRouter = Router();

function parseQuery(value: Record<string, unknown>): { scope: LeaderboardScope; limit: number } {
  const scope = isLeaderboardScope(value.scope) ? value.scope : 'global';
  const limit = Number(value.limit);
  return {
    scope,
    limit: Number.isInteger(limit) && limit >= 1 && limit <= LEADERBOARD.MAX_LIMIT ? limit : LEADERBOARD.DEFAULT_LIMIT,
  };
}

leaderboardRouter.use(optionalAuth);

leaderboardRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const scope: LeaderboardScope = 'global';
    const data = await getLeaderboard(scope, 1, req.user!.id);
    res.json({ success: true, data: data.me });
  }),
);

leaderboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseQuery(req.query);
    const data = await getLeaderboard(query.scope, query.limit, req.user?.id);
    res.json({ success: true, data });
  }),
);

export { getGlobalRank as getLeaderboardRank };