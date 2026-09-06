import type { BookmarkDto, BookmarkListResponse } from "@ctf/shared";

import { api } from "./http";

export async function listBookmarks(): Promise<BookmarkListResponse> {
  return api.get<BookmarkListResponse>("/bookmarks", { auth: true });
}

export async function addBookmark(challengeId: number): Promise<BookmarkDto> {
  return api.post<BookmarkDto>(`/bookmarks/${challengeId}`, undefined, {
    auth: true,
  });
}

export async function removeBookmark(challengeId: number): Promise<void> {
  await api.del<void>(`/bookmarks/${challengeId}`, { auth: true });
}
