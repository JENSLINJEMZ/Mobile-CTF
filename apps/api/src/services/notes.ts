import type { NoteDto, NoteSyncItem, NoteSyncResponse } from "@ctf/shared";
import { ErrorCode } from "@ctf/shared";
import { prisma } from "@ctf/database";

import { ApiError } from "../middleware/errors";

function toDto(note: {
  clientKey: string;
  title: string;
  body: string;
  deleted: boolean;
  updatedAt: Date;
}): NoteDto {
  return {
    clientKey: note.clientKey,
    title: note.title,
    body: note.body,
    deleted: note.deleted,
    updatedAt: note.updatedAt.toISOString(),
  };
}

export async function listNotes(userId: number): Promise<NoteDto[]> {
  const rows = await prisma.note.findMany({
    where: { userId, deleted: false },
    orderBy: [{ updatedAt: "desc" }],
  });
  return rows.map(toDto);
}

export interface NoteUpsert {
  clientKey: string;
  title: string;
  body: string;
  updatedAt: string;
}

export async function upsertNote(
  userId: number,
  input: NoteUpsert,
): Promise<NoteDto> {
  const updatedAt = new Date(input.updatedAt);
  const existing = await prisma.note.findUnique({
    where: { userId_clientKey: { userId, clientKey: input.clientKey } },
    select: { id: true, updatedAt: true },
  });

  if (existing && existing.updatedAt > updatedAt) {
    return (await prisma.note.findUnique({
      where: { id: existing.id },
    })) as unknown as NoteDto;
  }

  const note = await prisma.note.upsert({
    where: { userId_clientKey: { userId, clientKey: input.clientKey } },
    update: { title: input.title, body: input.body, deleted: false, updatedAt },
    create: {
      userId,
      clientKey: input.clientKey,
      title: input.title,
      body: input.body,
      updatedAt,
    },
  });
  return toDto(note);
}

export async function deleteNote(
  userId: number,
  clientKey: string,
): Promise<void> {
  const existing = await prisma.note.findUnique({
    where: { userId_clientKey: { userId, clientKey } },
    select: { id: true },
  });
  if (!existing) throw new ApiError(404, ErrorCode.NOT_FOUND, "Note not found");
  await prisma.note.update({
    where: { id: existing.id },
    data: { deleted: true, updatedAt: new Date() },
  });
}

export async function syncNotes(
  userId: number,
  items: NoteSyncItem[],
): Promise<NoteSyncResponse> {
  for (const item of items) {
    const updatedAt = new Date(item.updatedAt);
    const existing = await prisma.note.findUnique({
      where: { userId_clientKey: { userId, clientKey: item.clientKey } },
      select: { id: true, updatedAt: true },
    });

    if (existing && existing.updatedAt >= updatedAt) continue;

    await prisma.note.upsert({
      where: { userId_clientKey: { userId, clientKey: item.clientKey } },
      update: {
        title: item.title,
        body: item.body,
        deleted: item.deleted,
        updatedAt,
      },
      create: {
        userId,
        clientKey: item.clientKey,
        title: item.title,
        body: item.body,
        deleted: item.deleted,
        updatedAt,
      },
    });
  }

  const serverRows = await prisma.note.findMany({
    where: { userId, deleted: false },
    orderBy: [{ updatedAt: "desc" }],
  });
  return { serverItems: serverRows.map(toDto) };
}
