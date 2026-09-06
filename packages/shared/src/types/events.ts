import type { Difficulty } from "./enums";

export type EventStatus = "DRAFT" | "SCHEDULED" | "RUNNING" | "ENDED";
export type UnlockRuleType = "TIME" | "PREREQUISITE" | "SCORE" | "ALWAYS";

export type UnlockLockedReason =
  | "not_started"
  | "time_lock"
  | "prerequisite"
  | "score"
  | "ended"
  | "join_required";

export interface UnlockRuleDto {
  type: UnlockRuleType;
  unlockAt?: string;
  requireChallengeIds?: number[];
  minScore?: number;
}

export interface EventChallengeDto {
  id: number;
  challengeId: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  basePoints: number;
  solvedCount: number;
  solvedByMe: boolean;
  sortOrder: number;
  locked: boolean;
  lockedReason: UnlockLockedReason | null;
  unlockRule: UnlockRuleDto | null;
}

export interface EventSummaryDto {
  id: number;
  slug: string;
  title: string;
  description: string;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  startsInSeconds: number | null;
  participantCount: number;
  teamCount: number;
  joinedByMe: boolean;
  myTeamId: number | null;
}

export interface EventListResponse {
  items: EventSummaryDto[];
}

export interface EventLeaderboardEntryDto {
  rank: number;
  id: number;
  name: string;
  score: number;
}

export type EventLeaderboardScope = "participants" | "teams";

export interface EventLeaderboardResponse {
  eventId: number;
  scope: EventLeaderboardScope;
  refDate: string;
  entries: EventLeaderboardEntryDto[];
  me: { rank: number | null; score: number } | null;
}

export interface EventJoinResponse {
  event: EventSummaryDto;
}
