import { z } from "zod";

import { AUDIT, NOTIFICATION, PAGINATION } from "../constants";
import { NotificationType } from "../types/enums";

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  search: z.string().trim().min(1).max(120).optional(),
});

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(AUDIT.MAX_LIMIT)
    .default(AUDIT.DEFAULT_LIMIT),
  entityType: z.string().trim().min(1).max(120).optional(),
  action: z.string().trim().min(1).max(120).optional(),
  actorId: z.coerce.number().int().positive().optional(),
});

export const updateUserSchema = z
  .object({
    role: z.enum(["USER", "AUTHOR", "MODERATOR", "ADMIN", "SUPER_ADMIN"]),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => v.role !== undefined || v.isActive !== undefined, {
    message: "Provide at least one of role or isActive",
  });

export const broadcastNotificationSchema = z.object({
  type: z.nativeEnum(NotificationType).default(NotificationType.SYSTEM),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(NOTIFICATION.MAX_LIMIT)
    .default(NOTIFICATION.DEFAULT_LIMIT),
  unreadOnly: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export const createAttachmentSchema = z.object({
  fileId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(200),
});