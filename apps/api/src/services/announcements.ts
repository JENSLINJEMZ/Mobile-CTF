import type { AnnouncementDto } from '@ctf/shared';
import { ErrorCode } from '@ctf/shared';
import { prisma } from '@ctf/database';

import { ApiError } from '../middleware/errors';

const MAX_LIST = 50;

export async function listAnnouncements(limit = 10): Promise<AnnouncementDto[]> {
  const rows = await prisma.announcement.findMany({
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: Math.min(Math.max(1, limit), MAX_LIST),
  });
  return rows.map(toDto);
}

function toDto(a: {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AnnouncementDto {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    pinned: a.pinned,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  pinned?: boolean;
}

export async function createAnnouncement(
  input: CreateAnnouncementInput,
  authorId: number,
): Promise<AnnouncementDto> {
  const row = await prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      pinned: input.pinned ?? false,
      createdById: authorId,
    },
  });
  return toDto(row);
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

export async function updateAnnouncement(
  id: number,
  input: UpdateAnnouncementInput,
): Promise<AnnouncementDto> {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, ErrorCode.NOT_FOUND, 'Announcement not found');
  const row = await prisma.announcement.update({
    where: { id },
    data: {
      title: input.title,
      body: input.body,
      pinned: input.pinned,
    },
  });
  return toDto(row);
}

export async function deleteAnnouncement(id: number): Promise<void> {
  const existing = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new ApiError(404, ErrorCode.NOT_FOUND, 'Announcement not found');
  await prisma.announcement.delete({ where: { id } });
}