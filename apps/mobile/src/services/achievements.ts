import type { AchievementListResponse } from "@ctf/shared";

import { api } from "./http";

export async function getAchievements(): Promise<AchievementListResponse> {
  return api.get<AchievementListResponse>("/achievements", { auth: true });
}
