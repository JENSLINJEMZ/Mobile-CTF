import type { TeamAdminDto, TeamAdminListResult } from "@ctf/shared";
import { prisma } from "@ctf/database";
import type { Prisma } from "@prisma/client";

import { ApiError } from "../middleware/errors";

type TeamRow = {
  id: number;
  name: string;
  slug: string;
  joinCode: string;
  description: string | null;
  createdAt: Date;
  _count: { members: number };
  members: { role: string; user: { username: string } }[];
};

export async function listAdminTeams(input: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<TeamAdminListResult> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const search =
    typeof input.search === "string" && input.search.length > 0
      ? input.search
      : undefined;

  const where: Prisma.TeamWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.team.count({ where }),
    prisma.team.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { members: true } },
        members: {
          select: { role: true, user: { select: { username: true } } },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);
  return {
    items: rows.map(toDto),
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function deleteAdminTeam(id: number): Promise<void> {
  const existing = await prisma.team.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Team not found");
  await prisma.team.delete({ where: { id } });
}

function toDto(row: TeamRow): TeamAdminDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    joinCode: row.joinCode,
    description: row.description,
    memberCount: row._count.members,
    // The leader is the single TeamMemberRole.LEADER row.
    leaderUsername: row.members.find((m) => m.role === "LEADER")?.user.username ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}