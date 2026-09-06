import type { UserAdminDto, UserAdminListResult } from "@ctf/shared";
import { Role, roleRank } from "@ctf/shared";
import { prisma } from "@ctf/database";
import type { Prisma } from "@prisma/client";

import { ApiError } from "../middleware/errors";
import { getUserTotalScore, rebuildGlobalScore } from "./leaderboard";

interface DbUserRow {
  id: number;
  email: string;
  username: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  _count: { submissions: number };
}

function toSharedRole(role: unknown): Role {
  return role as Role;
}

export async function listUsers(input: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<UserAdminListResult> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const search =
    typeof input.search === "string" && input.search.length > 0
      ? input.search
      : undefined;

  const where: Prisma.UserWhereInput = search
    ? {
        OR: [
          { username: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, rows, scores] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { submissions: true } },
      },
    }),
    prisma.user.findMany({
      where,
      select: { id: true },
    }).then(async (ids) => {
      const scoreMap = new Map<number, number>();
      await Promise.all(
        ids.map(async (u) => {
          scoreMap.set(u.id, await getUserTotalScore(u.id));
        }),
      );
      return scoreMap;
    }),
  ]);

  const totalPages = Math.ceil(total / limit);
  return {
    items: rows.map((r) =>
      toAdminDto({ ...r, role: toSharedRole(r.role) }, scores.get(r.id) ?? 0),
    ),
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

export interface UpdateUserInput {
  role?: Role;
  isActive?: boolean;
}

function getRoleValue(role: string): Role {
  if (
    role === "USER" ||
    role === "AUTHOR" ||
    role === "MODERATOR" ||
    role === "ADMIN" ||
    role === "SUPER_ADMIN"
  ) {
    return role as Role;
  }
  return Role.USER;
}

export async function updateUser(
  actor: { id: number; role: Role },
  targetId: number,
  input: UpdateUserInput,
): Promise<UserAdminDto> {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { submissions: true } },
    },
  });
  if (!target) throw new ApiError(404, "NOT_FOUND", "User not found");

  const actorRole = getRoleValue(actor.role);
  const actorRank = roleRank(actorRole);
  const targetRank = roleRank(getRoleValue(target.role));

  // An actor may manage a target only when they outrank it — except two
  // SUPER_ADMINs may manage each other (last-active-SUPER_ADMIN guarded below).
  const canManage =
    actorRank > targetRank ||
    (actorRole === "SUPER_ADMIN" &&
      targetRank === roleRank(Role.SUPER_ADMIN));

  if (input.isActive !== undefined && !input.isActive && target.id === actor.id) {
    throw new ApiError(400, "VALIDATION_ERROR", "You cannot deactivate yourself");
  }
  if (input.isActive !== undefined && !input.isActive && target.id !== actor.id) {
    if (!canManage) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "You cannot moderate an account with an equal or higher role",
      );
    }
  }

  if (input.role !== undefined) {
    if (target.id === actor.id) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "You cannot change your own role",
      );
    }
    if (roleRank(input.role) >= actorRank) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "You cannot grant a role equal to or above your own",
      );
    }
    if (!canManage) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        "You cannot change the role of an account with an equal or higher role",
      );
    }
    if (target.role === "SUPER_ADMIN" && input.role !== "SUPER_ADMIN") {
      const superAdminCount = await prisma.user.count({
        where: { role: "SUPER_ADMIN", isActive: true },
      });
      if (superAdminCount <= 1) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Cannot demote the last active SUPER_ADMIN",
        );
      }
    }

    if (input.role !== target.role) {
      await prisma.user.update({
        where: { id: targetId },
        data: { role: input.role },
      });
    }
  }

  if (input.isActive !== undefined && input.isActive !== target.isActive) {
    await prisma.user.update({
      where: { id: targetId },
      data: { isActive: input.isActive },
    });
  }

  const updated = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { submissions: true } },
    },
  });
  if (!updated) throw new ApiError(404, "NOT_FOUND", "User not found");
  await rebuildGlobalScore(targetId);
  return toAdminDto(
    { ...updated, role: toSharedRole(updated.role) },
    await getUserTotalScore(targetId),
  );
}

function toAdminDto(
  user: DbUserRow,
  totalScore: number,
): UserAdminDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    solveCount: user._count.submissions,
    totalScore,
  };
}