import type {
  EventChallengeDto,
  EventStatus,
  EventSummaryDto,
  UnlockRuleDto,
} from "@ctf/shared";
import { Difficulty, ErrorCode } from "@ctf/shared";
import { prisma } from "@ctf/database";
import type { Prisma } from "@prisma/client";

import { ApiError } from "../middleware/errors";
import { evaluateAndGrantAchievements } from "./achievements";
import { recordAudit } from "./auditLog";
import {
  effectiveEventStatus,
  getEventChallengeStates,
  listEventChallengeDto,
  toSummaryDto,
  toUnlockRuleDto,
  type EventChallengeRow,
  type EventRow,
} from "./eventQueries";

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
  ipAddress?: string,
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
  await recordAudit({
    actorId: organizerId,
    action: "event.create",
    entityType: "event",
    entityId: String(event.id),
    details: { slug: event.slug, title: event.title },
    ipAddress,
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
  actorId?: number,
  ipAddress?: string,
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
  const dto = toSummaryDto(event as unknown as EventRow, new Date(), {
    joinedByMe: false,
    myTeamId: null,
  });
  await recordAudit({
    actorId,
    action: "event.update",
    entityType: "event",
    entityId: String(id),
    details: {
      changed: Object.keys(input),
      status: input.status,
      title: input.title,
    },
    ipAddress,
  });
  return dto;
}

export async function deleteEvent(
  id: number,
  actorId?: number,
  ipAddress?: string,
): Promise<void> {
  const existing = await prisma.event.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing)
    throw new ApiError(404, ErrorCode.NOT_FOUND, "Event not found");
  await prisma.event.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "event.delete",
    entityType: "event",
    entityId: String(id),
    details: { slug: existing.slug },
    ipAddress,
  });
}

export interface AdminCreateEventChallenge {
  challengeId: number;
  sortOrder?: number;
  unlock?: UnlockRuleDto | null;
}

export async function addEventChallenge(
  eventId: number,
  input: AdminCreateEventChallenge,
  actorId?: number,
  ipAddress?: string,
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
  await recordAudit({
    actorId,
    action: "event.challenge.add",
    entityType: "event",
    entityId: String(eventId),
    details: { challengeId: input.challengeId, sortOrder: row.sortOrder },
    ipAddress,
  });
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
  actorId?: number,
  ipAddress?: string,
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
  await recordAudit({
    actorId,
    action: "event.challenge.update",
    entityType: "event",
    entityId: String(row.eventId),
    details: {
      eventChallengeId: id,
      changed: Object.keys(input),
      challengeId: updated.challengeId,
    },
    ipAddress,
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

export async function removeEventChallenge(
  id: number,
  actorId?: number,
  ipAddress?: string,
): Promise<void> {
  const row = await prisma.eventChallenge.findUnique({
    where: { id },
    select: { id: true, eventId: true, challengeId: true },
  });
  if (!row)
    throw new ApiError(404, ErrorCode.NOT_FOUND, "Event challenge not found");
  await prisma.eventChallenge.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "event.challenge.remove",
    entityType: "event",
    entityId: String(row.eventId),
    details: { challengeId: row.challengeId },
    ipAddress,
  });
}