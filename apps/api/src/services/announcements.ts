import type { AnnouncementDto } from "@ctf/shared";
import { ErrorCode, NotificationType } from "@ctf/shared";
import { prisma } from "@ctf/database";

import { ApiError } from "../middleware/errors";
import { recordAudit } from "./auditLog";
import { createBroadcastNotification } from "./notifications";

const MAX_LIST = 50;

export async function listAnnouncements(
  limit = 10,
): Promise<AnnouncementDto[]> {
  const rows = await prisma.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
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
  ipAddress?: string,
): Promise<AnnouncementDto> {
  const announcement = await prisma.announcement.create({
    data: {
      title: input.title,
      body: input.body,
      pinned: input.pinned ?? false,
      createdById: authorId,
    },
  });
  await recordAudit({
    actorId: authorId,
    action: "announcement.create",
    entityType: "announcement",
    entityId: String(announcement.id),
    details: { title: announcement.title, pinned: announcement.pinned },
    ipAddress,
  });
  await createBroadcastNotification({
    type: NotificationType.ANNOUNCEMENT,
    title: announcement.title,
    body: announcement.body.slice(0, 500),
  });
  return toDto(announcement);
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

export async function updateAnnouncement(
  id: number,
  input: UpdateAnnouncementInput,
  actorId?: number,
  ipAddress?: string,
): Promise<AnnouncementDto> {
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing)
    throw new ApiError(404, ErrorCode.NOT_FOUND, "Announcement not found");
  const row = await prisma.announcement.update({
    where: { id },
    data: {
      title: input.title,
      body: input.body,
      pinned: input.pinned,
    },
  });
  await recordAudit({
    actorId,
    action: "announcement.update",
    entityType: "announcement",
    entityId: String(id),
    details: { changed: Object.keys(input) },
    ipAddress,
  });
  return toDto(row);
}

export async function deleteAnnouncement(
  id: number,
  actorId?: number,
  ipAddress?: string,
): Promise<void> {
  const existing = await prisma.announcement.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!existing)
    throw new ApiError(404, ErrorCode.NOT_FOUND, "Announcement not found");
  await prisma.announcement.delete({ where: { id } });
  await recordAudit({
    actorId,
    action: "announcement.delete",
    entityType: "announcement",
    entityId: String(id),
    details: { title: existing.title },
    ipAddress,
  });
}
