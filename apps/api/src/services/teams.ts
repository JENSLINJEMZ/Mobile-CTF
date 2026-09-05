import type { TeamDetailDto, TeamDto, TeamMemberRole } from '@ctf/shared';
import { ErrorCode, TEAM } from '@ctf/shared';
import { prisma } from '@ctf/database';

import { ApiError } from '../middleware/errors';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length: number): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < length; i += 1) {
    const byte = bytes[i] ?? 0;
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length] ?? '';
  }
  return code;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function uniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode(TEAM.JOIN_CODE_LENGTH);
    const existing = await prisma.team.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new ApiError(500, ErrorCode.INTERNAL_ERROR, 'Could not allocate a team join code');
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || `team-${Date.now()}`;
  let slug = base;
  let suffix = 2;
  while (true) {
    const existing = await prisma.team.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function assertNotInTeam(userId: number): Promise<void> {
  const existing = await prisma.teamMember.findUnique({ where: { userId } });
  if (existing) {
    throw new ApiError(409, ErrorCode.CONFLICT, 'You are already in a team');
  }
}

async function assertTeamHasRoom(teamId: number): Promise<void> {
  const count = await prisma.teamMember.count({ where: { teamId } });
  if (count >= TEAM.MAX_MEMBERS) {
    throw new ApiError(409, ErrorCode.CONFLICT, 'This team is full');
  }
}

async function requireLeaderMembership(userId: number, teamId: number): Promise<void> {
  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { role: true },
  });
  if (!member || member.role !== 'LEADER') {
    throw new ApiError(403, ErrorCode.FORBIDDEN, 'Only the team leader can do that');
  }
}

export interface CreateTeamInput {
  name: string;
  description?: string | null;
}

export async function createTeam(userId: number, input: CreateTeamInput): Promise<TeamDetailDto> {
  await assertNotInTeam(userId);
  const slug = await uniqueSlug(input.name);
  const joinCode = await uniqueJoinCode();

  const team = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        joinCode,
        createdById: userId,
      },
    });
    await tx.teamMember.create({
      data: { teamId: created.id, userId, role: 'LEADER' },
    });
    return created;
  });

  return getTeam(team.id, userId);
}

export async function getMyTeam(
  userId: number,
): Promise<TeamDetailDto | null> {
  const membership = await prisma.teamMember.findUnique({
    where: { userId },
    include: { team: { include: { members: { include: { user: { select: { id: true, username: true } } } } } } },
  });
  if (!membership) return null;
  return toDetailDto(membership.team as never, membership.role, true);
}

export async function getTeam(id: number, viewerId?: number): Promise<TeamDetailDto> {
  const team = await prisma.team.findUnique({
    where: { id },
    include: { members: { include: { user: { select: { id: true, username: true } } } } },
  });
  if (!team) throw new ApiError(404, ErrorCode.NOT_FOUND, 'Team not found');

  const membership = viewerId
    ? await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: id, userId: viewerId } },
        select: { role: true },
      })
    : null;
  const isMember = !!membership;
  return toDetailDto(team as never, membership?.role ?? null, isMember);
}

function toDetailDto(
  team: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    joinCode: string;
    createdAt: Date;
    members: {
      userId: number;
      role: TeamMemberRole;
      joinedAt: Date;
      user: { id: number; username: string };
    }[];
  },
  myRole: TeamMemberRole | null,
  exposeJoinCode: boolean,
): TeamDetailDto {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    description: team.description,
    joinCode: exposeJoinCode ? team.joinCode : null,
    memberCount: team.members.length,
    createdAt: team.createdAt.toISOString(),
    members: team.members.map((m) => ({
      userId: m.userId,
      username: m.user.username,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
    myRole,
  };
}

export async function listTeams(search?: string): Promise<TeamDto[]> {
  const rows = await prisma.team.findMany({
    where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { _count: { select: { members: true } } },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    memberCount: t._count.members,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function joinTeamByCode(userId: number, joinCode: string): Promise<TeamDetailDto> {
  await assertNotInTeam(userId);
  const team = await prisma.team.findUnique({
    where: { joinCode },
    include: { members: { include: { user: { select: { id: true, username: true } } } } },
  });
  if (!team) {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'No team found for that join code');
  }
  if (team.members.length >= TEAM.MAX_MEMBERS) {
    throw new ApiError(409, ErrorCode.CONFLICT, 'This team is full');
  }

  await prisma.teamMember.create({ data: { teamId: team.id, userId, role: 'MEMBER' } });

  return getTeam(team.id, userId);
}

export async function inviteTeamMember(
  leaderUserId: number,
  teamId: number,
  username: string,
): Promise<{ inviteCode: string; teamId: number }> {
  await requireLeaderMembership(leaderUserId, teamId);
  await assertTeamHasRoom(teamId);

  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) throw new ApiError(404, ErrorCode.NOT_FOUND, 'No user with that username');
  await assertNotInTeam(target.id);

  const code = randomCode(TEAM.INVITE_CODE_LENGTH);
  await prisma.teamInvite.upsert({
    where: { teamId_invitedUserId: { teamId, invitedUserId: target.id } },
    update: { code, status: 'PENDING', usedAt: null, invitedByUserId: leaderUserId },
    create: {
      teamId,
      invitedByUserId: leaderUserId,
      invitedUserId: target.id,
      code,
    },
  });

  return { inviteCode: code, teamId };
}

export async function acceptTeamInvite(userId: number, inviteCode: string): Promise<TeamDetailDto> {
  await assertNotInTeam(userId);
  const invite = await prisma.teamInvite.findUnique({ where: { code: inviteCode } });
  if (!invite || invite.status !== 'PENDING') {
    throw new ApiError(404, ErrorCode.NOT_FOUND, 'Invalid or expired invite');
  }
  if (invite.invitedUserId !== userId) {
    throw new ApiError(403, ErrorCode.FORBIDDEN, 'This invite is not for you');
  }
  await assertTeamHasRoom(invite.teamId);

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.create({ data: { teamId: invite.teamId, userId, role: 'MEMBER' } });
    await tx.teamInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', usedAt: new Date() },
    });
  });

  return getTeam(invite.teamId, userId);
}

export async function setTeamMemberRole(
  leaderUserId: number,
  teamId: number,
  targetUserId: number,
  role: TeamMemberRole,
): Promise<TeamDetailDto> {
  await requireLeaderMembership(leaderUserId, teamId);
  const target = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: targetUserId } },
  });
  if (!target) throw new ApiError(404, ErrorCode.NOT_FOUND, 'That user is not in this team');

  if (role === 'MEMBER' && target.role === 'LEADER') {
    const leaderCount = await prisma.teamMember.count({
      where: { teamId, role: 'LEADER' },
    });
    if (leaderCount <= 1) {
      throw new ApiError(409, ErrorCode.CONFLICT, 'A team needs at least one leader');
    }
  }

  await prisma.teamMember.update({
    where: { teamId_userId: { teamId, userId: targetUserId } },
    data: { role },
  });

  return getTeam(teamId, leaderUserId);
}

export async function removeTeamMember(
  leaderUserId: number,
  teamId: number,
  targetUserId: number,
): Promise<{ disbanded: boolean; team: TeamDetailDto | null }> {
  await requireLeaderMembership(leaderUserId, teamId);
  const target = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: targetUserId } },
  });
  if (!target) throw new ApiError(404, ErrorCode.NOT_FOUND, 'That user is not in this team');

  const others = await prisma.teamMember.findMany({
    where: { teamId, userId: { not: targetUserId } },
    orderBy: { joinedAt: 'asc' },
    select: { userId: true, role: true },
  });

  if (target.role === 'LEADER') {
    if (others.length === 0) {
      await prisma.team.delete({ where: { id: teamId } });
      return { disbanded: true, team: null };
    }
    const leaderCount = others.filter((m) => m.role === 'LEADER').length;
    if (leaderCount === 0) {
      const successor = others[0];
      if (successor !== undefined) {
        await prisma.teamMember.update({
          where: { teamId_userId: { teamId, userId: successor.userId } },
          data: { role: 'LEADER' },
        });
      }
    }
  }

  await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId: targetUserId } } });

  return { disbanded: false, team: await getTeam(teamId, leaderUserId) };
}

export async function deleteTeam(userId: number, teamId: number): Promise<void> {
  await requireLeaderMembership(userId, teamId);
  await prisma.team.delete({ where: { id: teamId } });
}