export const ACHIEVEMENT_CODES = [
  "FIRST_SOLVE",
  "SOLVE_10",
  "SOLVE_50",
  "FIRST_BLOOD",
  "STREAK_3",
  "STREAK_7",
  "TEAM_PLAYER",
  "CURATOR",
  "EVENT_ALUMNI",
] as const;

export type AchievementCode = (typeof ACHIEVEMENT_CODES)[number];

export interface AchievementDto {
  code: AchievementCode;
  title: string;
  description: string;
  icon: string | null;
  earnedAt: string | null;
}

export interface AchievementListResponse {
  items: AchievementDto[];
  earnedCount: number;
}
