import { z } from 'zod';

export * from './auth';
export * from './challenge';
export * from './leaderboard';

export const idSchema = z.coerce.number().int().positive();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const roleSchema = z.enum([
  'USER',
  'AUTHOR',
  'MODERATOR',
  'ADMIN',
  'SUPER_ADMIN',
]);