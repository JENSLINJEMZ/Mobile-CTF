import type { NotificationDto, NotificationsResponse } from "@ctf/shared";
import { NOTIFICATION, NotificationType } from "@ctf/shared";
import { prisma } from "@ctf/database";
import type { Prisma } from "@prisma/client";

import { ApiError } from "../middleware/errors";

type NotificationRow = {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Prisma.JsonValue | null;
  readAt: Date | null;
  createdAt: Date;
};

function toDto(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data:
      row.data &&
      typeof row.data === "object" &&
      !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createNotification(input: {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function createBroadcastNotification(input: {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<number> {
  const [activeUsers] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    }),
  ]);
  if (activeUsers.length === 0) return 0;
  await prisma.notification.createMany({
    data: activeUsers.map((u) => ({
      userId: u.id,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data as Prisma.InputJsonValue | undefined,
    })),
  });
  return activeUsers.length;
}

export async function listNotifications(
  userId: number,
  input: { page?: number; limit?: number; unreadOnly?: boolean },
): Promise<NotificationsResponse> {
  const page = input.page ?? 1;
  const limit = input.limit ?? NOTIFICATION.DEFAULT_LIMIT;
  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(input.unreadOnly ? { readAt: null } : {}),
  };

  const [total, unreadCount, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);
  return {
    items: rows.map(toDto),
    unreadCount,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function markNotificationRead(
  userId: number,
  id: number,
): Promise<NotificationDto> {
  const existing = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Notification not found");
  if (existing.readAt) return toDto(existing);
  const row = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
  return toDto(row);
}

export async function markAllNotificationsRead(userId: number): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function unreadNotificationCount(userId: number): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}