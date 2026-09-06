import type { AnnouncementDto } from "@ctf/shared";

import { api } from "./http";

export async function listAnnouncements(): Promise<AnnouncementDto[]> {
  return api.get<AnnouncementDto[]>("/announcements");
}
