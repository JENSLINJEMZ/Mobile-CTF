import type {
  AnnouncementDto,
  EventChallengeDto,
  EventListResponse,
  EventSummaryDto,
  PaginatedResult,
  ChallengeSummaryDto,
  UnlockRuleDto,
} from "@ctf/shared";

interface ApiErrorBody {
  error?: { message?: string; code?: string };
}

export interface Session {
  user: { id: number; username: string; email: string; role: string };
  accessToken: string;
  refreshToken: string;
}

async function request<T>(
  session: Session,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = (await res.json().catch(() => null)) as {
    success: boolean;
    data?: T;
    error?: { message?: string };
  } | null;
  if (!res.ok || !body?.success) {
    throw new Error(
      (body as ApiErrorBody)?.error?.message ??
        `Request failed (${res.status})`,
    );
  }
  return body.data as T;
}

function json(method: string, payload?: unknown): RequestInit {
  return {
    method,
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  };
}

// --- Events --------------------------------------------------------------

export function listAdminEvents(session: Session): Promise<EventSummaryDto[]> {
  return request<EventListResponse>(session, "/api/admin/events").then(
    (r) => r.items,
  );
}

export interface CreateEventPayload {
  slug: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status?: EventSummaryDto["status"];
}

export function createEvent(session: Session, payload: CreateEventPayload) {
  return request<EventSummaryDto>(
    session,
    "/api/admin/events",
    json("POST", payload),
  );
}

export function updateEvent(
  session: Session,
  id: number,
  payload: Partial<CreateEventPayload>,
) {
  return request<EventSummaryDto>(
    session,
    `/api/admin/events/${id}`,
    json("PATCH", payload),
  );
}

export function deleteEvent(session: Session, id: number): Promise<void> {
  return request<{ deleted: boolean }>(
    session,
    `/api/admin/events/${id}`,
    json("DELETE"),
  ).then(() => undefined);
}

export function listAdminEventChallenges(session: Session, eventId: number) {
  return request<EventChallengeDto[]>(
    session,
    `/api/events/${eventId}/challenges`,
  );
}

export interface AddEventChallengePayload {
  challengeId: number;
  sortOrder?: number;
  unlock?: UnlockRuleDto | null;
}

export function addEventChallenge(
  session: Session,
  eventId: number,
  payload: AddEventChallengePayload,
) {
  return request<EventChallengeDto>(
    session,
    `/api/admin/events/${eventId}/challenges`,
    json("POST", payload),
  );
}

export function updateEventChallenge(
  session: Session,
  eventChallengeId: number,
  payload: {
    sortOrder?: number;
    unlock?: UnlockRuleDto | null;
  },
) {
  return request<EventChallengeDto>(
    session,
    `/api/admin/event-challenges/${eventChallengeId}`,
    json("PATCH", payload),
  );
}

export function removeEventChallenge(
  session: Session,
  eventChallengeId: number,
): Promise<void> {
  return request<{ deleted: boolean }>(
    session,
    `/api/admin/event-challenges/${eventChallengeId}`,
    json("DELETE"),
  ).then(() => undefined);
}

// --- Challenges / Announcements ------------------------------------------

export function listAllChallenges(
  session: Session,
): Promise<ChallengeSummaryDto[]> {
  return request<PaginatedResult<ChallengeSummaryDto>>(
    session,
    "/api/challenges?limit=100",
  ).then((r) => r.items);
}

export function listAnnouncements(
  session: Session,
): Promise<AnnouncementDto[]> {
  return request<AnnouncementDto[]>(session, "/api/announcements");
}

export interface AnnouncementPayload {
  title: string;
  body: string;
  pinned: boolean;
}

export function createAnnouncement(
  session: Session,
  payload: AnnouncementPayload,
) {
  return request<AnnouncementDto>(
    session,
    "/api/admin/announcements",
    json("POST", payload),
  );
}

export function updateAnnouncement(
  session: Session,
  id: number,
  payload: Partial<AnnouncementPayload>,
) {
  return request<AnnouncementDto>(
    session,
    `/api/admin/announcements/${id}`,
    json("PATCH", payload),
  );
}

export function deleteAnnouncement(
  session: Session,
  id: number,
): Promise<void> {
  return request<{ deleted: boolean }>(
    session,
    `/api/admin/announcements/${id}`,
    json("DELETE"),
  ).then(() => undefined);
}
