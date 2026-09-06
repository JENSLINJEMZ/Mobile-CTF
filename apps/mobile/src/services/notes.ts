import type {
  NoteDto,
  NoteListResponse,
  NoteSyncItem,
  NoteSyncResponse,
} from "@ctf/shared";

import { api } from "./http";

export async function listNotes(): Promise<NoteListResponse> {
  return api.get<NoteListResponse>("/notes", { auth: true });
}

export async function syncNotes(
  items: NoteSyncItem[],
): Promise<NoteSyncResponse> {
  return api.post<NoteSyncResponse>("/notes/sync", { items }, { auth: true });
}

export async function upsertNoteRemote(
  clientKey: string,
  title: string,
  body: string,
  updatedAt: string,
): Promise<NoteDto> {
  return api.post<NoteDto>(
    `/notes/${clientKey}`,
    { title, body, updatedAt },
    { auth: true },
  );
}

export async function deleteNoteRemote(clientKey: string): Promise<void> {
  await api.del<void>(`/notes/${clientKey}`, { auth: true });
}
