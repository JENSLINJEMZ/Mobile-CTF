import { z } from "zod";

import { AUDIT, NOTIFICATION, PAGINATION } from "../constants";
import { NotificationType } from "../types/enums";
import { emailSchema, passwordSchema, usernameSchema } from "./auth";

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

export const createUserSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  role: z.enum(["USER", "AUTHOR", "MODERATOR", "ADMIN", "SUPER_ADMIN"]).optional(),
});

export const updateAdminTeamSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Team name is too short")
      .max(60, "Team name is too long"),
    description: z.string().trim().max(400).optional(),
  })
  .partial()
  .refine((v) => v.name !== undefined || v.description !== undefined, {
    message: "Provide at least one of name or description",
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

export const adminSubmissionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  search: z.string().trim().min(1).max(120).optional(),
  result: z.enum(["all", "correct", "incorrect"]).default("all"),
  challengeId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  teamId: z.coerce.number().int().positive().optional(),
});

export const adminAnnouncementQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  search: z.string().trim().min(1).max(120).optional(),
  pinned: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  recent: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});