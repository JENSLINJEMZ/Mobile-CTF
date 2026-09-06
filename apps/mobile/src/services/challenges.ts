import type {
  ChallengeCategoryDto,
  ChallengeDetailDto,
  ChallengeSummaryDto,
  PaginatedResult,
  SubmitFlagRequest,
  SubmitFlagResponse,
  UnlockHintResponse,
} from "@ctf/shared";

import { api } from "./http";
import { cacheGet, cacheRemove, cacheSet } from "./cache";
import { buildIdempotencyKey } from "./offline-queue";

export interface ChallengeListParams {
  page?: number;
  category?: string;
  difficulty?: string;
  search?: string;
  solved?: "solved" | "unsolved";
}

export async function listChallenges(
  params: ChallengeListParams = {},
): Promise<PaginatedResult<ChallengeSummaryDto>> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.category) query.set("category", params.category);
  if (params.difficulty) query.set("difficulty", params.difficulty);
  if (params.search) query.set("search", params.search);
  if (params.solved) query.set("solved", params.solved);
  const qs = query.toString();
  return api.get<PaginatedResult<ChallengeSummaryDto>>(
    `/challenges${qs ? `?${qs}` : ""}`,
    { auth: true },
  );
}

export async function getChallenge(
  id: number,
  eventId?: number,
): Promise<ChallengeDetailDto> {
  const qs = eventId ? `?event=${eventId}` : "";
  const key = `challenge:${id}${eventId ? `:${eventId}` : ""}`;
  const cached = await cacheGet<ChallengeDetailDto>(key);
  if (cached) return cached;
  const data = await api.get<ChallengeDetailDto>(`/challenges/${id}${qs}`, {
    auth: true,
  });
  await cacheSet<ChallengeDetailDto>(key, data).catch(() => undefined);
  return data;
}

export async function invalidateChallengeCache(
  id: number,
  eventId?: number,
): Promise<void> {
  await cacheRemove(`challenge:${id}${eventId ? `:${eventId}` : ""}`);
}

export async function listChallengeCategories(): Promise<
  ChallengeCategoryDto[]
> {
  return api.get<ChallengeCategoryDto[]>("/challenges/categories");
}

export async function submitFlag(
  id: number,
  flag: string,
  eventId?: number,
  idempotencyKey?: string,
): Promise<SubmitFlagResponse> {
  const body: SubmitFlagRequest = { flag, idempotencyKey };
  const qs = eventId ? `?event=${eventId}` : "";
  return api.post<SubmitFlagResponse>(
    `/challenges/${id}/submissions${qs}`,
    body,
    { auth: true },
  );
}

export async function submitFlagWithKey(
  id: number,
  flag: string,
  eventId: number | undefined,
): Promise<SubmitFlagResponse> {
  const key = buildIdempotencyKey(
    id,
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );
  return submitFlag(id, flag, eventId, key);
}

export async function unlockHint(
  challengeId: number,
  hintId: number,
): Promise<UnlockHintResponse> {
  return api.post<UnlockHintResponse>(
    `/challenges/${challengeId}/hints/${hintId}/unlock`,
    undefined,
    {
      auth: true,
    },
  );
}
