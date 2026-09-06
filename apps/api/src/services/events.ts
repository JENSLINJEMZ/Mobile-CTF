import {
  type EventChallengeDto,
  type EventLeaderboardResponse,
  type EventListResponse,
  type EventStatus,
  type EventSummaryDto,
  type UnlockLockedReason,
  type UnlockRuleDto,
  type UnlockRuleType,
} from "@ctf/shared";
import { Difficulty, EVENT, ErrorCode } from "@ctf/shared";
import { prisma } from "@ctf/database";
import type { Prisma } from "@prisma/client";

import { ApiError } from "../middleware/errors";
import { evaluateAndGrantAchievements } from "./achievements";
import { getRedis } from "./dependencies";
import { evaluateUnlockRule, type UnlockRuleInput } from "./unlockRules";

export type EffectiveEventStatus = EventStatus;

interface EventRow {
  id: number;
  slug: string;
  title: string;
  description: string;
  status: EventStatus;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  updatedAt: Date;
  createdById: number;
  _count?: { participants: number; teams: number };
}

function eventLeaderboardKey(eventId: number): string {
  return `lb:event:${eventId}`;
}

export function effectiveEventStatus(
  event: { status: EventStatus; startsAt: Date; endsAt: Date },
  now: Date = new Date(),
): EffectiveEventStatus {
  if (event.status === "DRAFT" || event.status === "ENDED") {
    return event.status;
  }
  if (now < event.startsAt) return "SCHEDULED";
  if (now <= event.endsAt) return "RUNNING";
  return "ENDED";
}

function startsInSeconds(event: EventRow, now: Date): number | null {
  const status = effectiveEventStatus(event, now);
  if (status === "DRAFT" || status === "ENDED") return null;
  return Math.max(
    0,
    Math.round((event.startsAt.getTime() - now.getTime()) / 1000),
  );
}

export interface EventRegistrationState {
  joinedByMe: boolean;
  myTeamId: number | null;
}

export async function getRegistrationState(
  eventId: number,
  userId: number | undefined,
): Promise<EventRegistrationState> {
  if (!userId) return { joinedByMe: false, myTeamId: null };
  const participant = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { teamId: true },
  });
  return { joinedByMe: !!participant, myTeamId: participant?.teamId ?? null };
}

function toSummaryDto(
  event: EventRow,
  now: Date,
  registration: EventRegistrationState,
): EventSummaryDto {
  const participantCount = event._count?.participants ?? 0;
  const teamCount = event._count?.teams ?? 0;
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    status: effectiveEventStatus(event, now),
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    startsInSeconds: startsInSeconds(event, now),
    participantCount,
    teamCount,
    joinedByMe: registration.joinedByMe,
    myTeamId: registration.myTeamId,
  };
}

async function loadEventRows(
  where: Prisma.EventWhereInput,
): Promise<EventRow[]> {
  const rows = await prisma.event.findMany({
    where,
    orderBy: { startsAt: "desc" },
    include: {
      _count: { select: { participants: true, teams: true } },
    },
  });
  return rows as unknown as EventRow[];
}

export type EventListScope = "upcoming" | "running" | "ended" | "all";

export async function listEvents(
  scope: EventListScope,
  viewerId?: number,
): Promise<EventListResponse> {
  const now = new Date();
  const rows = await loadEventRows({});
  const registrations =
    viewerId === undefined
      ? new Map<number, EventRegistrationState>()
      : await loadRegistrationMap(viewerId);

  const items = rows
    .map((event) =>
      toSummaryDto(
        event,
        now,
        registrations.get(event.id) ?? { joinedByMe: false, myTeamId: null },
      ),
    )
    .filter(
      (event) => scope === "all" || event.status === scopeToStatus(scope),
    );

  return { items };
}

function scopeToStatus(scope: EventListScope): EventStatus | null {
  switch (scope) {
    case "upcoming":
      return "SCHEDULED";
    case "running":
      return "RUNNING";
    case "ended":
      return "ENDED";
    case "all":
      return null;
  }
}

async function loadRegistrationMap(
  userId: number,
): Promise<Map<number, EventRegistrationState>> {
  const rows = await prisma.eventParticipant.findMany({
    where: { userId },
    select: { eventId: true, teamId: true },
  });
  const map = new Map<number, EventRegistrationState>();
  for (const row of rows) {
    map.set(row.eventId, { joinedByMe: true, myTeamId: row.teamId });
  }
  return map;
}

export async function getEventDetail(
  id: number,
  viewerId?: number,
): Promise<EventSummaryDto> {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { participants: true, teams: true } } },
  });
  if (!event) throw new ApiError(404, ErrorCode.NOT_FOUND, "Event not found");
  const registration = await getRegistrationState(id, viewerId);
  return toSummaryDto(event as unknown as EventRow, new Date(), registration);
}

const OPEN_STATUSES: EventStatus[] = ["SCHEDULED", "RUNNING"];

export async function joinEvent(
  userId: number,
  eventId: number,
): Promise<EventSummaryDto> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { participants: true, teams: true } } },
  });
  if (!event) throw new ApiError(404, ErrorCode.NOT_FOUND, "Event not found");

  const status = effectiveEventStatus(event);
  if (!OPEN_STATUSES.includes(status)) {
    throw new ApiError(
      400,
      ErrorCode.VALIDATION_ERROR,
      "This event is not open for registration",
    );
  }

  const existing = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (existing)
    throw new ApiError(
      409,
      ErrorCode.CONFLICT,
      "You already joined this event",
    );

  const myTeam = await prisma.teamMember.findUnique({
    where: { userId },
    select: { teamId: true },
  });
  let teamAlreadyInEvent = false;
  if (myTeam) {
    const teamInEvent = await prisma.eventTeam.findUnique({
      where: { teamId: myTeam.teamId },
    });
    if (teamInEvent && teamInEvent.eventId !== eventId) {
      throw new ApiError(
        409,
        ErrorCode.CONFLICT,
        "Your team is already registered in another event",
      );
    }
    teamAlreadyInEvent = !!teamInEvent;
  }

  await prisma.$transaction(async (tx) => {
    await tx.eventParticipant.create({
      data: { eventId, userId, teamId: myTeam?.teamId ?? null },
    });
    if (myTeam && !teamAlreadyInEvent) {
      await tx.eventTeam.create({ data: { eventId, teamId: myTeam.teamId } });
    }
  });

  const updated = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { participants: true, teams: true } } },
  });
  const summary = toSummaryDto(updated as unknown as EventRow, new Date(), {
    joinedByMe: true,
    myTeamId: myTeam?.teamId ?? null,
  });

  await evaluateAndGrantAchievements(userId);
  return summary;
}

export async function leaveEvent(
  userId: number,
  eventId: number,
): Promise<EventSummaryDto> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { participants: true, teams: true } } },
  });
  if (!event) throw new ApiError(404, ErrorCode.NOT_FOUND, "Event not found");

  const participant = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (!participant) {
    throw new ApiError(
      404,
      ErrorCode.NOT_FOUND,
      "You are not registered for this event",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.eventParticipant.delete({ where: { id: participant.id } });
    if (participant.teamId) {
      const remaining = await tx.eventParticipant.count({
        where: { eventId, teamId: participant.teamId },
      });
      if (remaining === 0) {
        await tx.eventTeam.deleteMany({
          where: { eventId, teamId: participant.teamId },
        });
      }
    }
  });

  const updated = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { participants: true, teams: true } } },
  });
  return toSummaryDto(updated as unknown as EventRow, new Date(), {
    joinedByMe: false,
    myTeamId: null,
  });
}

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

// ---------------------------------------------------------------------------
// Event challenges + dynamic unlock gating
// ---------------------------------------------------------------------------

interface EventChallengeRow {
  id: number;
  sortOrder: number;
  challenge: {
    id: number;
    slug: string;
    title: string;
    difficulty: Difficulty;
    basePoints: number;
    _count: { submissions: number };
  };
  unlockRule:
    (UnlockRuleRow & { prerequisites: { challengeId: number }[] }) | null;
}

interface UnlockRuleRow {
  type: UnlockRuleType;
  unlockAt: Date | null;
  minScore: number | null;
}

function toUnlockRuleDto(
  rule: (UnlockRuleRow & { prerequisites: { challengeId: number }[] }) | null,
): UnlockRuleDto | null {
  if (!rule) return null;
  const dto: UnlockRuleDto = { type: rule.type };
  if (rule.unlockAt) dto.unlockAt = rule.unlockAt.toISOString();
  if (rule.type === "PREREQUISITE") {
    dto.requireChallengeIds = rule.prerequisites.map((p) => p.challengeId);
  }
  if (rule.minScore !== null) dto.minScore = rule.minScore;
  return dto;
}

function toUnlockRuleInput(
  rule: (UnlockRuleRow & { prerequisites: { challengeId: number }[] }) | null,
): UnlockRuleInput | null {
  if (!rule) return null;
  return {
    type: rule.type,
    unlockAt: rule.unlockAt,
    minScore: rule.minScore,
    prerequisiteChallengeIds: rule.prerequisites.map((p) => p.challengeId),
  };
}

export interface EventChallengeGate {
  challengeId: number;
  locked: boolean;
  reason: UnlockLockedReason | null;
}

export async function getEventChallengeStates(
  eventId: number,
  userId: number | undefined,
): Promise<{
  status: EventStatus;
  registered: boolean;
  states: Map<number, EventChallengeGate>;
}> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true, startsAt: true, endsAt: true },
  });
  if (!event) throw new ApiError(404, ErrorCode.NOT_FOUND, "Event not found");

  const rows = (await prisma.eventChallenge.findMany({
    where: { eventId },
    include: {
      unlockRule: {
        include: { prerequisites: { select: { challengeId: true } } },
      },
    },
  })) as unknown as (EventChallengeRow & { challengeId: number })[];

  const registered =
    userId !== undefined &&
    (await prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true },
    })) !== null;

  const nowStatus = effectiveEventStatus(event);
  const status: EventStatus = nowStatus;
  const joinRequired = userId === undefined || !registered;

  const solved = userId
    ? new Set(
        (
          await prisma.submission.findMany({
            where: { userId },
            select: { challengeId: true },
          })
        ).map((s) => s.challengeId),
      )
    : new Set<number>();
  const eventScore = userId
    ? Math.round(
        Number(
          (await getRedis().zscore(
            eventLeaderboardKey(eventId),
            String(userId),
          )) ?? 0,
        ),
      )
    : 0;

  const states = new Map<number, EventChallengeGate>();
  for (const row of rows) {
    let locked: boolean;
    let reason: UnlockLockedReason | null = null;
    if (status === "DRAFT") {
      locked = true;
      reason = "not_started";
    } else if (status === "ENDED") {
      locked = true;
      reason = "ended";
    } else if (status === "SCHEDULED") {
      locked = true;
      reason = "not_started";
    } else {
      // RUNNING
      if (joinRequired) {
        locked = true;
        reason = "join_required";
      } else {
        const outcome = evaluateUnlockRule(toUnlockRuleInput(row.unlockRule), {
          now: new Date(),
          solvedChallengeIds: solved,
          eventScore,
        });
        locked = outcome.locked;
        reason = outcome.locked ? outcome.reason : null;
      }
    }
    states.set(row.challengeId, {
      challengeId: row.challengeId,
      locked,
      reason,
    });
  }
  return { status, registered, states };
}

export async function listEventChallenges(
  eventId: number,
  userId: number | undefined,
): Promise<EventChallengeDto[]> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!event) throw new ApiError(404, ErrorCode.NOT_FOUND, "Event not found");

  const rows = (await prisma.eventChallenge.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      challenge: {
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          basePoints: true,
          _count: { select: { submissions: true } },
        },
      },
      unlockRule: {
        include: { prerequisites: { select: { challengeId: true } } },
      },
    },
  })) as unknown as EventChallengeRow[];

  const { states } = await getEventChallengeStates(eventId, userId);
  const solvedByMe = userId
    ? new Set(
        (
          await prisma.submission.findMany({
            where: { userId },
            select: { challengeId: true },
          })
        ).map((s) => s.challengeId),
      )
    : new Set<number>();

  return rows.map((row) => {
    const gate = states.get(row.challenge.id) ?? {
      locked: false,
      reason: null,
    };
    return {
      id: row.id,
      challengeId: row.challenge.id,
      slug: row.challenge.slug,
      title: row.challenge.title,
      difficulty: row.challenge.difficulty as Difficulty,
      basePoints: row.challenge.basePoints,
      solvedCount: row.challenge._count.submissions,
      solvedByMe: solvedByMe.has(row.challenge.id),
      sortOrder: row.sortOrder,
      locked: gate.locked,
      lockedReason: gate.reason,
      unlockRule: toUnlockRuleDto(row.unlockRule),
    };
  });
}

export async function assertEventChallengeAccess(
  eventId: number,
  challengeId: number,
  userId: number,
): Promise<void> {
  const { states } = await getEventChallengeStates(eventId, userId);
  const gate = states.get(challengeId);
  if (gate?.locked) {
    throw new ApiError(403, ErrorCode.LOCKED, lockedMessage(gate.reason));
  }
}

export function lockedMessage(reason: UnlockLockedReason | null): string {
  switch (reason) {
    case "not_started":
      return "This event has not started yet";
    case "ended":
      return "This event has ended";
    case "join_required":
      return "Join the event to access its challenges";
    case "time_lock":
      return "This challenge unlocks later in the event";
    case "prerequisite":
      return "Solve the required challenge(s) to unlock this one";
    case "score":
      return "Reach the required score to unlock this challenge";
    default:
      return "This challenge is locked";
  }
}

// ---------------------------------------------------------------------------
// Admin event management
// ---------------------------------------------------------------------------

export interface AdminCreateEvent {
  slug: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status?: EventStatus;
}

export async function createEvent(
  input: AdminCreateEvent,
  organizerId: number,
): Promise<EventSummaryDto> {
  const existing = await prisma.event.findUnique({
    where: { slug: input.slug },
  });
  if (existing)
    throw new ApiError(
      409,
      ErrorCode.CONFLICT,
      "An event with this slug already exists",
    );

  const event = await prisma.event.create({
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      status: input.status ?? "SCHEDULED",
      createdById: organizerId,
    },
    include: { _count: { select: { participants: true, teams: true } } },
  });
  return toSummaryDto(event as unknown as EventRow, new Date(), {
    joinedByMe: false,
    myTeamId: null,
  });
}

export type AdminUpdateEvent = Partial<AdminCreateEvent>;

export async function updateEvent(
  id: number,
  input: AdminUpdateEvent,
): Promise<EventSummaryDto> {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing)
    throw new ApiError(404, ErrorCode.NOT_FOUND, "Event not found");

  const event = await prisma.event.update({
    where: { id },
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      status: input.status,
    },
    include: { _count: { select: { participants: true, teams: true } } },
  });
  return toSummaryDto(event as unknown as EventRow, new Date(), {
    joinedByMe: false,
    myTeamId: null,
  });
}

export async function deleteEvent(id: number): Promise<void> {
  const existing = await prisma.event.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing)
    throw new ApiError(404, ErrorCode.NOT_FOUND, "Event not found");
  await prisma.event.delete({ where: { id } });
}

export interface AdminCreateEventChallenge {
  challengeId: number;
  sortOrder?: number;
  unlock?: UnlockRuleDto | null;
}

export async function addEventChallenge(
  eventId: number,
  input: AdminCreateEventChallenge,
): Promise<EventChallengeDto> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!event) throw new ApiError(404, ErrorCode.NOT_FOUND, "Event not found");
  const challenge = await prisma.challenge.findUnique({
    where: { id: input.challengeId },
    select: { id: true },
  });
  if (!challenge)
    throw new ApiError(404, ErrorCode.NOT_FOUND, "Challenge not found");

  const existing = await prisma.eventChallenge.findUnique({
    where: { eventId_challengeId: { eventId, challengeId: input.challengeId } },
  });
  if (existing)
    throw new ApiError(
      409,
      ErrorCode.CONFLICT,
      "Challenge already in this event",
    );

  const row = await prisma.eventChallenge.create({
    data: {
      eventId,
      challengeId: input.challengeId,
      sortOrder: input.sortOrder ?? 0,
      unlockRule: input.unlock
        ? { create: buildUnlockRuleData(input.unlock) }
        : undefined,
    },
    include: {
      challenge: {
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          basePoints: true,
          _count: { select: { submissions: true } },
        },
      },
      unlockRule: {
        include: { prerequisites: { select: { challengeId: true } } },
      },
    },
  });
  const { states } = await getEventChallengeStates(eventId, undefined);
  const gate = states.get(input.challengeId) ?? { locked: false, reason: null };
  return {
    id: row.id,
    challengeId: row.challenge.id,
    slug: row.challenge.slug,
    title: row.challenge.title,
    difficulty: row.challenge.difficulty as Difficulty,
    basePoints: row.challenge.basePoints,
    solvedCount: row.challenge._count.submissions,
    solvedByMe: false,
    sortOrder: row.sortOrder,
    locked: gate.locked,
    lockedReason: gate.reason,
    unlockRule: toUnlockRuleDto(row.unlockRule as never),
  };
}

export interface AdminUpdateEventChallenge {
  sortOrder?: number;
  unlock?: UnlockRuleDto | null;
}

export async function updateEventChallenge(
  id: number,
  input: AdminUpdateEventChallenge,
): Promise<EventChallengeDto> {
  const row = await prisma.eventChallenge.findUnique({
    where: { id },
    select: { id: true, eventId: true },
  });
  if (!row)
    throw new ApiError(404, ErrorCode.NOT_FOUND, "Event challenge not found");

  const unlock = input.unlock;
  if (unlock !== undefined) {
    await prisma.$transaction(async (tx) => {
      const existingRule = await tx.unlockRule.findUnique({
        where: { eventChallengeId: id },
        select: { id: true },
      });
      if (existingRule)
        await tx.unlockRule.delete({ where: { id: existingRule.id } });
      if (unlock !== null) {
        await tx.unlockRule.create({
          data: { eventChallengeId: id, ...buildUnlockRuleData(unlock) },
        });
      }
    });
  }

  const updated = await prisma.eventChallenge.update({
    where: { id },
    data: { sortOrder: input.sortOrder },
    include: {
      challenge: {
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          basePoints: true,
          _count: { select: { submissions: true } },
        },
      },
      unlockRule: {
        include: { prerequisites: { select: { challengeId: true } } },
      },
    },
  });
  return listEventChallengeDto(updated as unknown as EventChallengeRow);
}

function buildUnlockRuleData(
  unlock: UnlockRuleDto,
): Prisma.UnlockRuleCreateWithoutEventChallengeInput {
  const prerequisites = unlock.requireChallengeIds ?? [];
  return {
    type: unlock.type as Prisma.UnlockRuleCreateWithoutEventChallengeInput["type"],
    unlockAt: unlock.unlockAt ? new Date(unlock.unlockAt) : null,
    minScore: unlock.minScore ?? null,
    ...(prerequisites.length > 0
      ? {
          prerequisites: {
            create: prerequisites.map((challengeId) => ({ challengeId })),
          },
        }
      : {}),
  };
}

function listEventChallengeDto(row: EventChallengeRow): EventChallengeDto {
  return {
    id: (row as unknown as { id: number }).id,
    challengeId: row.challenge.id,
    slug: row.challenge.slug,
    title: row.challenge.title,
    difficulty: row.challenge.difficulty as Difficulty,
    basePoints: row.challenge.basePoints,
    solvedCount: row.challenge._count.submissions,
    solvedByMe: false,
    sortOrder: (row as unknown as { sortOrder: number }).sortOrder,
    locked: false,
    lockedReason: null,
    unlockRule: toUnlockRuleDto(row.unlockRule),
  };
}

export async function removeEventChallenge(id: number): Promise<void> {
  const row = await prisma.eventChallenge.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!row)
    throw new ApiError(404, ErrorCode.NOT_FOUND, "Event challenge not found");
  await prisma.eventChallenge.delete({ where: { id } });
}
