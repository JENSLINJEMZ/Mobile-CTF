import { ErrorCode, Difficulty } from "@ctf/shared";
import type {
  EventChallengeDto,
  EventListResponse,
  EventStatus,
  EventSummaryDto,
  UnlockLockedReason,
  UnlockRuleDto,
  UnlockRuleType,
} from "@ctf/shared";
import { prisma } from "@ctf/database";
import type { Prisma } from "@prisma/client";

import { ApiError } from "../middleware/errors";
import { getRedis } from "./dependencies";
import { evaluateUnlockRule, type UnlockRuleInput } from "./unlockRules";

export type EffectiveEventStatus = EventStatus;

export interface EventRow {
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

export function eventLeaderboardKey(eventId: number): string {
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

export function toSummaryDto(
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

export interface EventChallengeRow {
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

export function toUnlockRuleDto(
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

export function listEventChallengeDto(row: EventChallengeRow): EventChallengeDto {
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