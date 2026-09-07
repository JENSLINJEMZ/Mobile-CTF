import { EVENT } from "@ctf/shared";
import type { EventLeaderboardResponse } from "@ctf/shared";
import { prisma } from "@ctf/database";

import { ApiError } from "../middleware/errors";
import { ErrorCode } from "@ctf/shared";
import { getRedis } from "./dependencies";
import { effectiveEventStatus, eventLeaderboardKey } from "./eventQueries";

/**
 * Record points toward every event that is RUNNING at `at` and the user is
 * registered for. Returns the list of event scopes updated.
 */
export async function recordEventSolve(
  userId: number,
  pointsAwarded: number,
  at: Date = new Date(),
): Promise<number[]> {
  const participants = await prisma.eventParticipant.findMany({
    where: { userId },
    select: {
      event: {
        select: { id: true, status: true, startsAt: true, endsAt: true },
      },
    },
  });
  const active = participants.filter(
    (p) => effectiveEventStatus(p.event, at) === "RUNNING" && pointsAwarded > 0,
  );
  if (active.length === 0) return [];
  const redis = getRedis();
  const pipeline = redis.pipeline();
  for (const p of active) {
    pipeline.zincrby(
      eventLeaderboardKey(p.event.id),
      pointsAwarded,
      String(userId),
    );
  }
  await pipeline.exec();
  return active.map((p) => p.event.id);
}

export async function getEventLeaderboard(
  eventId: number,
  scope: "participants" | "teams",
  viewerId: number,
  limit: number = EVENT.LEADERBOARD_DEFAULT_LIMIT,
): Promise<EventLeaderboardResponse> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!event) throw new ApiError(404, ErrorCode.NOT_FOUND, "Event not found");

  const refDate = new Date().toISOString();
  const redis = getRedis();
  const key = eventLeaderboardKey(eventId);
  const safeLimit = Math.min(Math.max(1, limit), EVENT.LEADERBOARD_MAX_LIMIT);

  if (scope === "teams") {
    return getTeamLeaderboard(eventId, viewerId, safeLimit, refDate);
  }

  const max = Math.max(safeLimit, 1);
  const [raw, myRank, myScore] = await Promise.all([
    redis.zrevrange(key, 0, max - 1, "WITHSCORES"),
    redis.zrevrank(key, String(viewerId)),
    redis.zscore(key, String(viewerId)),
  ]);

  const scores = new Map<number, number>();
  for (let i = 0; i < raw.length; i += 2) {
    scores.set(Number(raw[i]), Math.round(Number(raw[i + 1])));
  }
  const users = await prisma.user.findMany({
    where: { id: { in: [...scores.keys()] } },
    select: { id: true, username: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.username]));

  return {
    eventId,
    scope: "participants",
    refDate,
    entries: [...scores.entries()].map(([id, score], index) => ({
      rank: index + 1,
      id,
      name: nameById.get(id) ?? `player#${id}`,
      score,
    })),
    me:
      viewerId === undefined
        ? null
        : {
            rank: myRank === null ? null : myRank + 1,
            score: Math.round(Number(myScore ?? 0)),
          },
  };
}

async function getTeamLeaderboard(
  eventId: number,
  viewerId: number,
  limit: number,
  refDate: string,
): Promise<EventLeaderboardResponse> {
  const key = eventLeaderboardKey(eventId);
  const eventTeams = await prisma.eventTeam.findMany({
    where: { eventId },
    include: {
      team: {
        include: { members: { select: { userId: true } } },
      },
    },
  });

  const scores: {
    teamId: number;
    name: string;
    score: number;
    memberCount: number;
  }[] = [];
  const redis = getRedis();
  for (const et of eventTeams) {
    const memberPipes = redis.pipeline();
    for (const member of et.team.members) {
      memberPipes.zscore(key, String(member.userId));
    }
    const results = (await memberPipes.exec()) ?? [];
    const total = results.reduce(
      (sum, [err, value]) =>
        sum + (err || value === null ? 0 : Math.round(Number(value))),
      0,
    );
    scores.push({
      teamId: et.teamId,
      name: et.team.name,
      score: total,
      memberCount: et.team.members.length,
    });
  }
  scores.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const myMembership = await prisma.teamMember.findUnique({
    where: { userId: viewerId },
    select: { teamId: true },
  });
  const myTeamId = myMembership?.teamId ?? null;
  const myTeamRank = myTeamId
    ? scores.findIndex((s) => s.teamId === myTeamId)
    : -1;

  const myScore = await redis.zscore(key, String(viewerId));

  return {
    eventId,
    scope: "teams",
    refDate,
    entries: scores.slice(0, limit).map((s, index) => ({
      rank: index + 1,
      id: s.teamId,
      name: s.name,
      score: s.score,
    })),
    me:
      viewerId === undefined
        ? null
        : {
            rank: myTeamRank >= 0 ? myTeamRank + 1 : null,
            score: Math.round(Number(myScore ?? 0)),
          },
  };
}