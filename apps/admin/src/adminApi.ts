import type {
  AnnouncementDto,
  AnalyticsOverviewDto,
  AuditLogListResult,
  ChallengeDetailDto,
  ChallengeSummaryDto,
  ChallengeVersionDto,
  EventChallengeDto,
  EventListResponse,
  EventSummaryDto,
  FileDto,
  FileListResult,
  PaginatedResult,
  TeamAdminDto,
  UserAdminDto,
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
      ...(typeof init.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
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

export function listCategories(session: Session) {
  return request<ChallengeSummaryDto["category"][]>(
    session,
    "/api/challenges/categories",
  );
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

// --- Challenges (admin, incl. drafts) ------------------------------------

export interface ChallengeAdminPayload {
  title: string;
  slug: string;
  description: string;
  categoryId: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  basePoints: number;
  flag?: string;
  published?: boolean;
}

export function listAdminChallenges(
  session: Session,
): Promise<PaginatedResult<ChallengeSummaryDto>> {
  return request<PaginatedResult<ChallengeSummaryDto>>(
    session,
    "/api/admin/challenges?limit=100",
  );
}

export function createChallenge(
  session: Session,
  payload: ChallengeAdminPayload,
) {
  return request<ChallengeDetailDto>(
    session,
    "/api/admin/challenges",
    json("POST", payload),
  );
}

export function updateChallenge(
  session: Session,
  id: number,
  payload: ChallengeAdminPayload,
) {
  return request<ChallengeDetailDto>(
    session,
    `/api/admin/challenges/${id}`,
    json("PUT", payload),
  );
}

export function listChallengeVersions(
  session: Session,
  id: number,
): Promise<ChallengeVersionDto[]> {
  return request<ChallengeVersionDto[]>(
    session,
    `/api/admin/challenges/${id}/versions`,
  ).then((r) => r ?? []);
}

// --- Files & attachments --------------------------------------------------

export function uploadFile(
  session: Session,
  file: File,
): Promise<FileDto> {
  const form = new FormData();
  form.append("file", file);
  return request<FileDto>(session, "/api/admin/files", {
    method: "POST",
    body: form,
  });
}

export function listFiles(
  session: Session,
): Promise<FileListResult> {
  return request<FileListResult>(session, "/api/admin/files?limit=100");
}

export function deleteFile(session: Session, id: number): Promise<void> {
  return request<{ deleted: boolean }>(
    session,
    `/api/admin/files/${id}`,
    json("DELETE"),
  ).then(() => undefined);
}

export function createAttachment(
  session: Session,
  challengeId: number,
  payload: { fileId: number; title: string },
) {
  return request<ChallengeDetailDto["attachments"]>(
    session,
    `/api/admin/challenges/${challengeId}/attachments`,
    json("POST", payload),
  );
}

export function deleteAttachment(
  session: Session,
  attachmentId: number,
): Promise<void> {
  return request<{ deleted: boolean }>(
    session,
    `/api/admin/attachments/${attachmentId}`,
    json("DELETE"),
  ).then(() => undefined);
}

// --- Users ----------------------------------------------------------------

export interface AdminListResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function listAdminUsers(
  session: Session,
  search = "",
): Promise<AdminListResult<UserAdminDto>> {
  const query = search
    ? `/api/admin/users?limit=100&search=${encodeURIComponent(search)}`
    : "/api/admin/users?limit=100";
  return request<AdminListResult<UserAdminDto>>(session, query);
}

export function updateUser(
  session: Session,
  id: number,
  payload: { role?: string; isActive?: boolean },
): Promise<UserAdminDto> {
  return request<UserAdminDto>(
    session,
    `/api/admin/users/${id}`,
    json("PATCH", payload),
  );
}

// --- Teams ----------------------------------------------------------------

export function listAdminTeams(
  session: Session,
  search = "",
): Promise<AdminListResult<TeamAdminDto>> {
  const query = search
    ? `/api/admin/teams?limit=100&search=${encodeURIComponent(search)}`
    : "/api/admin/teams?limit=100";
  return request<AdminListResult<TeamAdminDto>>(session, query);
}

export function deleteAdminTeam(session: Session, id: number): Promise<void> {
  return request<{ deleted: boolean }>(
    session,
    `/api/admin/teams/${id}`,
    json("DELETE"),
  ).then(() => undefined);
}

// --- Analytics / audit log / notifications -------------------------------

export function getAnalyticsOverview(
  session: Session,
): Promise<AnalyticsOverviewDto> {
  return request<AnalyticsOverviewDto>(
    session,
    "/api/admin/analytics/overview",
  );
}

export function listAuditLog(
  session: Session,
  opts: { action?: string; limit?: number } = {},
): Promise<AuditLogListResult> {
  const params = new URLSearchParams();
  params.set("limit", String(opts.limit ?? 100));
  if (opts.action) params.set("action", opts.action);
  return request<AuditLogListResult>(
    session,
    `/api/admin/audit-log?${params.toString()}`,
  );
}

export function broadcastNotification(
  session: Session,
  payload: { type?: string; title: string; body: string },
): Promise<{ recipients: number }> {
  return request<{ recipients: number }>(
    session,
    "/api/admin/notifications/broadcast",
    json("POST", payload),
  );
}
