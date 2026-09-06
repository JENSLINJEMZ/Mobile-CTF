import type {
  EventChallengeDto,
  EventJoinResponse,
  EventLeaderboardResponse,
  EventLeaderboardScope,
  EventListResponse,
  EventSummaryDto,
} from "@ctf/shared";
import { EVENT } from "@ctf/shared";

import { api } from "./http";

export async function listEvents(): Promise<EventSummaryDto[]> {
  const result = await api.get<EventListResponse>("/events");
  return result.items;
}

export async function getEvent(id: number): Promise<EventSummaryDto> {
  return api.get<EventSummaryDto>(`/events/${id}`, { auth: true });
}

export async function joinEvent(id: number): Promise<EventJoinResponse> {
  return api.post<EventJoinResponse>(`/events/${id}/join`, undefined, {
    auth: true,
  });
}

export async function leaveEvent(id: number): Promise<void> {
  await api.post<void>(`/events/${id}/leave`, undefined, { auth: true });
}

export async function getEventLeaderboard(
  id: number,
  scope: EventLeaderboardScope,
  limit: number = EVENT.LEADERBOARD_DEFAULT_LIMIT,
): Promise<EventLeaderboardResponse> {
  return api.get<EventLeaderboardResponse>(
    `/events/${id}/leaderboard?scope=${scope}&limit=${limit}`,
    { auth: true },
  );
}

export async function getEventChallenges(
  id: number,
): Promise<EventChallengeDto[]> {
  return api.get<EventChallengeDto[]>(`/events/${id}/challenges`, {
    auth: true,
  });
}
