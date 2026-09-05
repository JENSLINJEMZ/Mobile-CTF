import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().trim().min(3, 'Team name is too short').max(60, 'Team name is too long'),
  description: z.string().trim().max(400).optional(),
});

export const joinTeamSchema = z.object({
  joinCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,10}$/, 'Join codes look like ABC123'),
});

export const createTeamInviteSchema = z.object({
  username: z.string().trim().min(2).max(40),
});

export const acceptTeamInviteSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,12}$/, 'Invite codes look like ABCD1234'),
});

export const updateTeamMemberRoleSchema = z.object({
  role: z.enum(['LEADER', 'MEMBER']),
});