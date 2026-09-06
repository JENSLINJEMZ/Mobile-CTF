import type { Difficulty } from "./enums";

export interface BookmarkDto {
  challengeId: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  basePoints: number;
  solvedByMe: boolean;
  bookmarkedAt: string;
}

export interface BookmarkListResponse {
  items: BookmarkDto[];
}
