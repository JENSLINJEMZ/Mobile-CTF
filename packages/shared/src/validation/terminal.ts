import { z } from 'zod';

import type { TerminalSessionStatus } from '../types/terminal';

export const terminalSessionIdSchema = z
  .string()
  .regex(/^tm_[a-zA-Z0-9]{16,64}$/);

export const terminalSessionStatusSchema = z.enum([
  'CREATING',
  'RUNNING',
  'CLOSED',
  'EXPIRED',
  'FAILED',
]);

export function isTerminalSessionStatus(value: unknown): value is TerminalSessionStatus {
  return terminalSessionStatusSchema.safeParse(value).success;
}