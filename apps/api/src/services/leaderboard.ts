import type {
  LeaderboardMeDto,
  LeaderboardResponse,
  LeaderboardScope,
} from "@ctf/shared";
import { LEADERBOARD } from "@ctf/shared";
import { prisma } from "@ctf/database";

import { sumTotalScore } from "./scoring";
import { getRedis } from "./dependencies";

const GLOBAL_KEY = "lb:global";
const DAILY_PREFIX = "lb:daily:";
const WEEKLY_PREFIX = "lb:weekly:";

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function thisMonday(date: Date): Date {
  const copy = new Date(date.toISOString());
  const day = copy.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  copy.setUTCDate(copy.getUTCDate() - offset);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

export function leaderboardKey(
  scope: LeaderboardScope,
  at: Date = new Date(),
): string {
  if (scope === "global") return GLOBAL_KEY;
  if (scope === "daily") return `${DAILY_PREFIX}${toUtcDateKey(at)}`;
  return `${WEEKLY_PREFIX}${toUtcDateKey(thisMonday(at))}`;
}

export function activeDailyKeys(at: Date = new Date()): string[] {
  return [leaderboardKey("daily", at)];
}

export function activeWeeklyKeys(at: Date = new Date()): string[] {
  return [leaderboardKey("weekly", at)];
}

export async function getUserTotalScore(userId: number): Promise<number> {
  const rows = await prisma.submission.findMany({
    where: { userId },
    select: { pointsAwarded: true },
  });
  return sumTotalScore(rows);
}

export async function rebuildGlobalScore(userId: number): Promise<number> {
  const total = await getUserTotalScore(userId);
  if (total > 0) {
    await getRedis().zadd(GLOBAL_KEY, total, String(userId));
  } else {
    await getRedis().zrem(GLOBAL_KEY, String(userId));
  }
  return total;
}

export async function recordSolve(
  userId: number,
  pointsAwarded: number,
  at: Date = new Date(),
): Promise<number> {
  const total = await rebuildGlobalScore(userId);
  if (pointsAwarded > 0 && total > 0) {
    const redis = getRedis();
    await redis
      .pipeline()
      .zincrby(leaderboardKey("daily", at), pointsAwarded, String(userId))
      .zincrby(leaderboardKey("weekly", at), pointsAwarded, String(userId))
      .exec();
  }
  return total;
}

export async function applySolve(
  userId: number,
  pointsAwarded: number,
  at: Date = new Date(),
): Promise<{ totalScore: number; rank: number | null }> {
  if (pointsAwarded <= 0) {
    const totalScore = await getUserTotalScore(userId);
    return { totalScore, rank: await getGlobalRank(userId) };
  }
  const totalScore = await recordSolve(userId, pointsAwarded, at);
  const rank = await getGlobalRank(userId);
  return { totalScore, rank };
}

export async function getGlobalRank(userId: number): Promise<number | null> {
  await rebuildGlobalScore(userId);
  const rank = await getRedis().zrevrank(GLOBAL_KEY, String(userId));
  return rank === null ? null : rank + 1;
}

export interface LeaderboardFetchResult {
  response: LeaderboardResponse;
  redisRank: number | null;
  redisScore: number | null;
}

export async function getLeaderboard(
  scope: LeaderboardScope,
  limit: number = LEADERBOARD.DEFAULT_LIMIT,
  viewerId?: number,
): Promise<LeaderboardResponse> {
  const refDate = new Date();
  const key = leaderboardKey(scope, refDate);
  const redis = getRedis();

  let viewerRank: number | null = null;
  let viewerScore: number | null = null;
  if (viewerId) {
    if (scope === "global") {
      await rebuildGlobalScore(viewerId);
    }
    const [rank, score] = await Promise.all([
      redis.zrevrank(key, String(viewerId)),
      redis.zscore(key, String(viewerId)),
    ]);
    viewerRank = rank === null ? null : rank + 1;
    viewerScore = score === null ? null : Number(score);
  }

  const entries = await redis.zrevrange(key, 0, limit - 1, "WITHSCORES");

  const me: LeaderboardMeDto | null =
    viewerId === undefined
      ? null
      : {
          rank: viewerRank,
          score: Math.round(viewerScore ?? 0),
          solves: await prisma.submission.count({
            where: { userId: viewerId },
          }),
        };

  if (entries.length === 0) {
    return { scope, refDate: refDate.toISOString(), entries: [], me };
  }

  const memberScores: { userId: number; score: number }[] = [];
  for (let i = 0; i < entries.length; i += 2) {
    memberScores.push({
      userId: Number(entries[i]),
      score: Math.round(Number(entries[i + 1])),
    });
  }
  const userIds = memberScores.map((e) => e.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true },
  });
  const usernameById = new Map(users.map((u) => [u.id, u.username]));

  return {
    scope,
    refDate: refDate.toISOString(),
    entries: memberScores.map((e, index) => ({
      rank: index + 1,
      userId: e.userId,
      username: usernameById.get(e.userId) ?? `player#${e.userId}`,
      score: e.score,
    })),
    me,
  };
}
