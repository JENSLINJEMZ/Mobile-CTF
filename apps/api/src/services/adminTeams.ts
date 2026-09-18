import type {
  TeamActivityDto,
  TeamAdminDetailDto,
  TeamAdminDto,
  TeamAdminListResult,
  TeamMemberAdminDto,
  TeamPerformancePointDto,
} from "@ctf/shared";
import { prisma } from "@ctf/database";
import { Prisma } from "@prisma/client";

import { ApiError } from "../middleware/errors";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type TeamAggRow = {
  id: number;
  name: string;
  slug: string;
  joinCode: string;
  description: string | null;
  createdAt: Date;
  memberCount: bigint | number;
  solves: bigint | number;
  points: bigint | number;
  activeMembers: bigint | number;
  leaderUsername: string | null;
};

type PerformanceRow = {
  date: string;
  solves: bigint | number;
  points: bigint | number;
};

type ActivityRow = {
  type: string;
  id: number;
  username: string;
  challenge: string | null;
  points: bigint | number;
  at: Date;
};

const TEAM_AGG_JOINS = Prisma.sql`
  FROM "Team" t
  LEFT JOIN "TeamMember" tm ON tm."teamId" = t.id
  LEFT JOIN "User" u ON u.id = tm."userId"
  LEFT JOIN "Submission" s ON s."userId" = tm."userId"
`;

function num(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}

function searchWhere(search: string | undefined): Prisma.Sql {
  return search
    ? Prisma.sql`WHERE (t.name ILIKE ${`%${search}%`} OR t.slug ILIKE ${`%${search}%`})`
    : Prisma.empty;
}

async function loadRankedTeams(search?: string): Promise<TeamAdminDto[]> {
  const rows = await prisma.$queryRaw<TeamAggRow[]>(Prisma.sql`
    SELECT
      t.id,
      t.name,
      t.slug,
      t."joinCode",
      t.description,
      t."createdAt",
      COUNT(DISTINCT tm."userId")::bigint AS "memberCount",
      COUNT(DISTINCT s.id)::bigint AS "solves",
      COALESCE(SUM(s."pointsAwarded"), 0)::bigint AS "points",
      COUNT(DISTINCT tm."userId") FILTER (WHERE u."isActive")::bigint AS "activeMembers",
      (SELECT lc."username"
         FROM "TeamMember" lm
         JOIN "User" lc ON lc.id = lm."userId"
        WHERE lm."teamId" = t.id AND lm.role = 'LEADER'
        LIMIT 1) AS "leaderUsername"
    ${TEAM_AGG_JOINS}
    ${searchWhere(search)}
    GROUP BY t.id, t.name, t.slug, t."joinCode", t.description, t."createdAt"
    ORDER BY "points" DESC, "solves" DESC, t.id ASC
  `);
  return rows.map(toDto);
}

function toDto(row: TeamAggRow): TeamAdminDto {
  const memberCount = num(row.memberCount);
  const activeMembers = num(row.activeMembers);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    joinCode: row.joinCode,
    description: row.description,
    memberCount,
    leaderUsername: row.leaderUsername ?? null,
    createdAt: row.createdAt.toISOString(),
    status:
      memberCount > 0 && activeMembers > 0 ? "active" : "inactive",
    solves: num(row.solves),
    points: num(row.points),
    // Rank is position in the points-desc leaderboard; computed on the full list.
    rank: 0,
  };
}

function applyRank(teams: TeamAdminDto[]): TeamAdminDto[] {
  return teams.map((t, i) => ({ ...t, rank: i + 1 }));
}

export async function listAdminTeams(input: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<TeamAdminListResult> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const search =
    typeof input.search === "string" && input.search.length > 0
      ? input.search.trim()
      : undefined;

  const ranked = applyRank(await loadRankedTeams(search));
  const total = ranked.length;
  const start = (page - 1) * limit;
  const items = ranked.slice(start, start + limit);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    items,
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

export async function getAdminTeamDetail(id: number): Promise<TeamAdminDetailDto> {
  const ranked = applyRank(await loadRankedTeams());
  const team = ranked.find((t) => t.id === id);
  if (!team) throw new ApiError(404, "NOT_FOUND", "Team not found");

  const members = await prisma.teamMember.findMany({
    where: { teamId: id },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    include: {
      user: {
        select: { id: true, username: true, isActive: true, lastLoginAt: true },
      },
    },
  });

  const perfRows = await prisma.$queryRaw<PerformanceRow[]>(Prisma.sql`
    SELECT
      to_char(s."solvedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
      COUNT(*)::bigint AS "solves",
      COALESCE(SUM(s."pointsAwarded"), 0)::bigint AS "points"
    FROM "Submission" s
    JOIN "TeamMember" tm ON tm."userId" = s."userId" AND tm."teamId" = ${id}
    WHERE s."solvedAt" >= (now() - interval '29 days')
    GROUP BY 1
  `);
  const byDate = new Map(perfRows.map((p) => [p.date, p]));
  const performance: TeamPerformancePointDto[] = [];
  const todayUtc = new Date(Date.now()).toISOString().slice(0, 10);
  for (let i = 29; i >= 0; i -= 1) {
    const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const value = byDate.get(key);
    if (key <= todayUtc) {
      performance.push({
        date: key,
        points: value ? num(value.points) : 0,
        solves: value ? num(value.solves) : 0,
      });
    }
  }

  const [solveRows, joinRows] = await Promise.all([
    prisma.$queryRaw<ActivityRow[]>(Prisma.sql`
      SELECT
        'solve'::text AS type,
        s.id,
        u.username,
        c.title AS challenge,
        s."pointsAwarded" AS points,
        s."solvedAt" AS at
      FROM "Submission" s
      JOIN "TeamMember" tm ON tm."userId" = s."userId" AND tm."teamId" = ${id}
      JOIN "User" u ON u.id = s."userId"
      JOIN "Challenge" c ON c.id = s."challengeId"
      ORDER BY s."solvedAt" DESC
      LIMIT 10
    `),
    prisma.$queryRaw<ActivityRow[]>(Prisma.sql`
      SELECT
        'join'::text AS type,
        tm."userId" AS id,
        u.username,
        NULL::text AS challenge,
        0::bigint AS points,
        tm."joinedAt" AS at
      FROM "TeamMember" tm
      JOIN "User" u ON u.id = tm."userId"
      WHERE tm."teamId" = ${id}
    `),
  ]);
  const activity: TeamActivityDto[] = [...solveRows, ...joinRows]
    .map<TeamActivityDto>((a) => ({
      id: a.id,
      type: a.type === "join" ? "join" : "solve",
      username: a.username,
      challenge: a.challenge,
      points: num(a.points),
      at: new Date(a.at).toISOString(),
    }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  const memberDtos: TeamMemberAdminDto[] = members.map((m) => ({
    userId: m.user.id,
    username: m.user.username,
    role: m.role === "LEADER" ? "LEADER" : "MEMBER",
    isActive: m.user.isActive,
    joinedAt: m.joinedAt.toISOString(),
    lastActiveAt: m.user.lastLoginAt?.toISOString() ?? null,
  }));

  return { team, members: memberDtos, performance, activity };
}

function randomCode(length: number): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < length; i += 1) {
    const byte = bytes[i] ?? 0;
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length] ?? "";
  }
  return code;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
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

async function uniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode(6);
    const existing = await prisma.team.findUnique({
      where: { joinCode: code },
    });
    if (!existing) return code;
  }
  throw new ApiError(500, "INTERNAL_ERROR", "Could not allocate a team join code");
}

export async function createAdminTeam(
  actor: { id: number },
  input: { name: string; description?: string },
): Promise<TeamAdminDto> {
  const name = input.name.trim();
  const existing = await prisma.team.findUnique({ where: { name } });
  if (existing) {
    throw new ApiError(409, "CONFLICT", "A team with this name already exists");
  }

  const slug = await uniqueSlug(name);
  const joinCode = await uniqueJoinCode();
  const team = await prisma.team.create({
    data: {
      name,
      slug,
      joinCode,
      description: input.description?.trim() ? input.description.trim() : null,
      createdById: actor.id,
    },
  });

  const ranked = applyRank(await loadRankedTeams());
  const dto = ranked.find((t) => t.id === team.id);
  if (!dto) throw new ApiError(500, "INTERNAL_ERROR", "Team was not created");
  return dto;
}

export async function updateAdminTeam(
  id: number,
  input: { name?: string; description?: string },
): Promise<TeamAdminDto> {
  const existing = await prisma.team.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Team not found");

  const name = input.name?.trim();
  const renamed = name !== undefined && name !== existing.name;
  if (renamed) {
    const taken = await prisma.team.findUnique({ where: { name } });
    if (taken) {
      throw new ApiError(409, "CONFLICT", "A team with this name already exists");
    }
  }
  const slug = renamed ? await uniqueSlug(name) : undefined;

  const updated = await prisma.team.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() ? input.description.trim() : null }
        : {}),
    },
  });

  const ranked = applyRank(await loadRankedTeams());
  const dto = ranked.find((t) => t.id === updated.id);
  if (!dto) throw new ApiError(500, "INTERNAL_ERROR", "Team was not found");
  return dto;
}

export async function deleteAdminTeam(id: number): Promise<void> {
  const existing = await prisma.team.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Team not found");
  await prisma.team.delete({ where: { id } });
}