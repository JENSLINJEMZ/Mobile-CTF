import { z } from "zod";

export const clientKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Client key must be URL-safe");

export const noteItemSchema = z.object({
  clientKey: clientKeySchema,
  title: z.string().trim().min(1).max(160).default("Untitled"),
  body: z.string().max(100_000),
  deleted: z.boolean().default(false),
  updatedAt: z.string().datetime(),
});

export const noteSyncSchema = z.object({
  items: z.array(noteItemSchema).max(200).default([]),
});

export const noteUpsertSchema = z.object({
  clientKey: clientKeySchema,
  title: z.string().trim().min(1).max(160).default("Untitled"),
  body: z.string().max(100_000),
  updatedAt: z.string().datetime(),
});
