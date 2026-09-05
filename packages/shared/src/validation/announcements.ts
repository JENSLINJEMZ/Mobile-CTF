import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().min(1).max(20_000),
  pinned: z.boolean().default(false),
});

export const updateAnnouncementSchema = createAnnouncementSchema
  .partial()
  .extend({ pinned: z.boolean().optional() });