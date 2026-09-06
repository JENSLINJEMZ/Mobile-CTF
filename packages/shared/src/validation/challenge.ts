import { z } from "zod";

import { CHALLENGE, PAGINATION } from "../constants";
import { Difficulty } from "../types/enums";

const idSchema = z.coerce.number().int().positive();
const difficultySchema = z.nativeEnum(Difficulty);

export const challengeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  category: z.string().trim().min(1).optional(),
  difficulty: difficultySchema.optional(),
  tag: z.string().trim().min(1).optional(),
  search: z.string().trim().min(CHALLENGE.SEARCH_MIN_CHARS).optional(),
});

export const submitFlagSchema = z.object({
  flag: z
    .string()
    .trim()
    .min(4, "Flag is too short")
    .max(1024, "Flag is too long")
    .transform((v) => v.toLowerCase()),
  idempotencyKey: z
    .string()
    .trim()
    .min(8)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "URL-safe idempotency key")
    .optional(),
});

export const createChallengeSchema = z.object({
  title: z.string().trim().min(3).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "URL-safe slug, e.g. caesars-secret")
    .max(120),
  description: z.string().min(1, "Description is required").max(50_000),
  categoryId: idSchema,
  difficulty: difficultySchema,
  basePoints: z.number().int().min(1).max(1000),
  flag: z
    .string()
    .trim()
    .min(CHALLENGE.FLAG_PREFIX.length + 1)
    .max(1024),
  tagIds: z.array(idSchema).max(10).default([]),
  published: z.boolean().default(true),
});

export const updateChallengeSchema = createChallengeSchema
  .partial()
  .extend({ published: z.boolean().optional() });

export const createHintSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().min(1).max(10_000),
  penaltyPoints: z.number().int().min(0).max(1000).default(0),
  sortOrder: z.number().int().min(0).max(100).default(0),
});

export const updateHintSchema = createHintSchema.partial();
