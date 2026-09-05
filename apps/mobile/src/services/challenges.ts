import type {
  ChallengeCategoryDto,
  ChallengeDetailDto,
  ChallengeSummaryDto,
  PaginatedResult,
  SubmitFlagRequest,
  SubmitFlagResponse,
  UnlockHintResponse,
} from '@ctf/shared';

import { api } from './http';

export interface ChallengeListParams {
  page?: number;
  category?: string;
  difficulty?: string;
  search?: string;
  solved?: 'solved' | 'unsolved';
}

export async function listChallenges(params: ChallengeListParams = {}): Promise<
  PaginatedResult<ChallengeSummaryDto>
> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.category) query.set('category', params.category);
  if (params.difficulty) query.set('difficulty', params.difficulty);
  if (params.search) query.set('search', params.search);
  if (params.solved) query.set('solved', params.solved);
  const qs = query.toString();
  return api.get<PaginatedResult<ChallengeSummaryDto>>(
    `/challenges${qs ? `?${qs}` : ''}`,
    { auth: true },
  );
}

export async function getChallenge(id: number): Promise<ChallengeDetailDto> {
  return api.get<ChallengeDetailDto>(`/challenges/${id}`, { auth: true });
}

export async function listChallengeCategories(): Promise<ChallengeCategoryDto[]> {
  return api.get<ChallengeCategoryDto[]>('/challenges/categories');
}

export async function submitFlag(id: number, flag: string): Promise<SubmitFlagResponse> {
  const body: SubmitFlagRequest = { flag };
  return api.post<SubmitFlagResponse>(`/challenges/${id}/submissions`, body, { auth: true });
}

export async function unlockHint(challengeId: number, hintId: number): Promise<UnlockHintResponse> {
  return api.post<UnlockHintResponse>(`/challenges/${challengeId}/hints/${hintId}/unlock`, undefined, {
    auth: true,
  });
}