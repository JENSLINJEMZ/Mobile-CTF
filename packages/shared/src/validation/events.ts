import { z } from "zod";

import type { EventStatus, UnlockRuleType } from "../types/events";
import { idSchema } from "./id";

export const eventIdSchema = idSchema;

export const eventStatusSchema = z.enum([
  "DRAFT",
  "SCHEDULED",
  "RUNNING",
  "ENDED",
]);
export const unlockRuleTypeSchema = z.enum([
  "TIME",
  "PREREQUISITE",
  "SCORE",
  "ALWAYS",
]);

export function isEventStatus(value: unknown): value is EventStatus {
  return eventStatusSchema.safeParse(value).success;
}

export function isUnlockRuleType(value: unknown): value is UnlockRuleType {
  return unlockRuleTypeSchema.safeParse(value).success;
}

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "URL-safe slug, e.g. capture-the-flag-2026",
  )
  .max(120);

export const unlockRuleSchema = z
  .object({
    type: unlockRuleTypeSchema,
    unlockAt: z.string().datetime().optional(),
    requireChallengeIds: z.array(idSchema).min(1).max(20).optional(),
    minScore: z.number().int().min(0).optional(),
  })
  .superRefine((rule, ctx) => {
    if (rule.type === "TIME" && rule.unlockAt === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A TIME rule requires unlockAt",
        path: ["unlockAt"],
      });
    }
    if (rule.type === "PREREQUISITE" && !rule.requireChallengeIds?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A PREREQUISITE rule requires at least one challenge",
        path: ["requireChallengeIds"],
      });
    }
    if (rule.type === "SCORE" && rule.minScore === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A SCORE rule requires minScore",
        path: ["minScore"],
      });
    }
  });

const baseEventSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(120),
  description: z.string().min(1).max(50_000),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: eventStatusSchema.default("SCHEDULED"),
});

function validateTimeWindow(
  event: { startsAt?: string; endsAt?: string },
  ctx: z.RefinementCtx,
) {
  if (
    event.startsAt &&
    event.endsAt &&
    new Date(event.endsAt) <= new Date(event.startsAt)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "endsAt must be after startsAt",
      path: ["endsAt"],
    });
  }
}

export const createEventSchema =
  baseEventSchema.superRefine(validateTimeWindow);

export const updateEventSchema = baseEventSchema
  .partial()
  .superRefine(validateTimeWindow);

export const createEventChallengeSchema = z.object({
  challengeId: idSchema,
  sortOrder: z.number().int().min(0).default(0),
  unlock: unlockRuleSchema.nullish(),
});

export const updateEventChallengeSchema = z.object({
  sortOrder: z.number().int().min(0).optional(),
  unlock: unlockRuleSchema.nullish(),
});
