export type LeaderboardScope = "global" | "daily" | "weekly";

export interface LeaderboardEntryDto {
  rank: number;
  userId: number;
  username: string;
  score: number;
}

export interface LeaderboardMeDto {
  rank: number | null;
  score: number;
  solves: number;
}

export interface LeaderboardResponse {
  scope: LeaderboardScope;
  refDate: string;
  entries: LeaderboardEntryDto[];
  me: LeaderboardMeDto | null;
}

export interface LeaderboardSocketEvent {
  type: "solved";
  userId: number;
  username: string;
  pointsAwarded: number;
  scope: "global";
  at: string;
}
