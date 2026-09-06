import type {
  LeaderboardMeDto,
  LeaderboardResponse,
  LeaderboardScope,
} from "@ctf/shared";

import { api } from "./http";

export async function getLeaderboard(
  scope: LeaderboardScope,
  limit = 20,
): Promise<LeaderboardResponse> {
  return api.get<LeaderboardResponse>(
    `/leaderboard?scope=${scope}&limit=${limit}`,
    {
      auth: true,
    },
  );
}

export async function getMyLeaderboardRank(): Promise<LeaderboardMeDto> {
  return api.get<LeaderboardMeDto>("/leaderboard/me", { auth: true });
}
