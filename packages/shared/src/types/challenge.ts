import type { Difficulty } from './enums';

export interface ChallengeCategoryDto {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  sortOrder: number;
}

export interface ChallengeTagDto {
  id: number;
  name: string;
  slug: string;
}

export interface ChallengeSummaryDto {
  id: number;
  slug: string;
  title: string;
  category: ChallengeCategoryDto;
  difficulty: Difficulty;
  basePoints: number;
  solvedCount: number;
  published: boolean;
  solvedByMe: boolean;
  tags: ChallengeTagDto[];
  locked?: boolean;
  lockedReason?: string | null;
}

export interface HintDto {
  id: number;
  title: string;
  penaltyPoints: number;
  unlocked: boolean;
  body?: string | null;
}

export interface AttachmentDto {
  id: number;
  title: string;
  url: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export interface ChallengeDetailDto extends ChallengeSummaryDto {
  description: string;
  hints: HintDto[];
  attachments: AttachmentDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SubmitFlagRequest {
  flag: string;
}

export interface SubmitFlagResponse {
  correct: boolean;
  message: string;
  pointsAwarded: number;
  firstBlood: boolean;
  totalScore: number;
  rank: number | null;
  challenge: {
    id: number;
    slug: string;
    title: string;
  };
}

export interface UnlockHintResponse {
  hint: HintDto;
}

export interface ChallengeListQuery {
  page?: number;
  limit?: number;
  category?: string;
  difficulty?: Difficulty;
  tag?: string;
  search?: string;
  solved?: 'solved' | 'unsolved';
}