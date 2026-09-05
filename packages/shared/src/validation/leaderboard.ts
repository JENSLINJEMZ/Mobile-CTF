import { z } from 'zod';

import { LEADERBOARD, PAGINATION } from '../constants';
import type { LeaderboardScope } from '../types/leaderboard';

export const leaderboardScopeSchema = z.enum(LEADERBOARD.SCOPES);

export const leaderboardQuerySchema = z.object({
  scope: leaderboardScopeSchema.default('global'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(LEADERBOARD.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
});

export function isLeaderboardScope(value: unknown): value is LeaderboardScope {
  return leaderboardScopeSchema.safeParse(value).success;
}