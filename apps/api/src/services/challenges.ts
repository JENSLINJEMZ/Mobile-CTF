import {
  type ChallengeCategoryDto,
  type ChallengeDetailDto,
  type ChallengeSummaryDto,
  type ChallengeTagDto,
  type Difficulty as SharedDifficulty,
  type HintDto,
  type PaginatedResult,
} from '@ctf/shared';
import { prisma } from '@ctf/database';
import { hashFlag, randomSalt } from '@ctf/database';
import type { Prisma } from '@prisma/client';

import { ApiError } from '../middleware/errors';

export type Viewer = { id: number; role: string } | undefined;

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
}

interface TagRow {
  id: number;
  name: string;
  slug: string;
}

function toCategoryDto(c: CategoryRow): ChallengeCategoryDto {
  return { id: c.id, name: c.name, slug: c.slug, icon: c.icon, sortOrder: c.sortOrder };
}

function toTagDto(t: TagRow): ChallengeTagDto {
  return { id: t.id, name: t.name, slug: t.slug };
}

const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'AUTHOR'] as const;

function canManage(viewer: Viewer): boolean {
  return !!viewer && adminRoles.includes(viewer.role as (typeof adminRoles)[number]);
}

async function loadSolutionState(userId: number | undefined, challengeId: number): Promise<{
  solved: boolean;
  unlockedHintIds: Set<number>;
}> {
  if (!userId) return { solved: false, unlockedHintIds: new Set() };
  const [solved, unlocks] = await Promise.all([
    prisma.submission.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
      select: { id: true },
    }),
    prisma.hintUnlock.findMany({
      where: { userId, hint: { challengeId } },
      select: { hintId: true },
    }),
  ]);
  return {
    solved: !!solved,
    unlockedHintIds: new Set(unlocks.map((u) => u.hintId)),
  };
}

export async function listCategories(): Promise<ChallengeCategoryDto[]> {
  const rows = await prisma.challengeCategory.findMany({
    orderBy: { sortOrder: 'asc' },
  });
  return rows.map(toCategoryDto);
}

export async function listTags(): Promise<ChallengeTagDto[]> {
  const rows = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
  return rows.map(toTagDto);
}

export interface ChallengeListInput {
  page?: number;
  limit?: number;
  category?: string;
  difficulty?: SharedDifficulty;
  tag?: string;
  search?: string;
  solved?: 'solved' | 'unsolved';
}

function applyFilters(
  where: Prisma.ChallengeWhereInput,
  filters: ChallengeListInput,
): Prisma.ChallengeWhereInput {
  if (typeof filters.category === 'string' && filters.category.length > 0) {
    where.category = { slug: filters.category };
  }
  if (filters.difficulty) {
    where.difficulty = filters.difficulty;
  }
  if (typeof filters.tag === 'string' && filters.tag.length > 0) {
    where.tags = { some: { tag: { slug: filters.tag } } };
  }
  if (typeof filters.search === 'string' && filters.search.length > 0) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export async function listChallenges(
  input: ChallengeListInput,
  viewer: Viewer,
): Promise<PaginatedResult<ChallengeSummaryDto>> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;

  const manage = canManage(viewer);
  const where: Prisma.ChallengeWhereInput = {
    published: manage ? undefined : true,
    ...(input.solved === 'solved' && viewer ? { submissions: { some: { userId: viewer.id } } } : {}),
    ...(input.solved === 'unsolved' && viewer
      ? { submissions: { none: { userId: viewer.id } } }
      : {}),
  };
  applyFilters(where, input);

  const [total, rows, userSolved] = await Promise.all([
    prisma.challenge.count({ where }),
    prisma.challenge.findMany({
      where,
      orderBy: [{ difficulty: 'asc' }, { basePoints: 'asc' }, { createdAt: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: { category: true, tags: { include: { tag: true } }, _count: { select: { submissions: true } } },
    }),
    viewer
      ? prisma.submission.findMany({ where: { userId: viewer.id }, select: { challengeId: true } })
      : Promise.resolve([]),
  ]);

  const solvedSet = new Set(userSolved.map((s) => s.challengeId));
  const totalPages = Math.ceil(total / limit);
  return {
    items: rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      category: toCategoryDto(c.category),
      difficulty: c.difficulty as SharedDifficulty,
      basePoints: c.basePoints,
      solvedCount: c._count.submissions,
      published: c.published,
      solvedByMe: solvedSet.has(c.id),
      tags: c.tags.map((t) => toTagDto(t.tag)),
    })),
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

export async function resolveChallengeById(id: number): Promise<
  | {
      id: number;
      slug: string;
    }
  | undefined
> {
  const challenge = await prisma.challenge.findUnique({ where: { id }, select: { id: true, slug: true, published: true } });
  return challenge ?? undefined;
}

export async function getChallengeDetail(
  id: number,
  viewer: Viewer,
): Promise<ChallengeDetailDto> {
  const manage = canManage(viewer);
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      category: true,
      tags: { include: { tag: true }, orderBy: { tagId: 'asc' } },
      hints: { orderBy: { sortOrder: 'asc' } },
      attachments: { orderBy: { createdAt: 'asc' } },
      _count: { select: { submissions: true } },
    },
  });

  if (!challenge || (!challenge.published && !manage)) {
    throw new ApiError(404, 'NOT_FOUND', 'Challenge not found');
  }

  const { solved, unlockedHintIds } = await loadSolutionState(viewer?.id, challenge.id);

  const hints: HintDto[] = challenge.hints.map((h) => {
    const unlocked = manage || unlockedHintIds.has(h.id);
    return {
      id: h.id,
      title: h.title,
      penaltyPoints: h.penaltyPoints,
      unlocked,
      body: unlocked ? h.body : null,
    };
  });

  return {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    description: challenge.description,
    category: toCategoryDto(challenge.category),
    difficulty: challenge.difficulty as SharedDifficulty,
    basePoints: challenge.basePoints,
    solvedCount: challenge._count.submissions,
    published: challenge.published,
    solvedByMe: solved,
    tags: challenge.tags.map((t) => toTagDto(t.tag)),
    hints,
    attachments: challenge.attachments.map((a) => ({
      id: a.id,
      title: a.title,
      url: a.url,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
    })),
    createdAt: challenge.createdAt.toISOString(),
    updatedAt: challenge.updatedAt.toISOString(),
  };
}

function assertPublishedForSolve(challenge: { published: boolean; id: number }): void {
  if (!challenge.published) {
    throw new ApiError(404, 'NOT_FOUND', 'Challenge not found');
  }
}

export async function assertSolveTarget(id: number): Promise<{
  id: number;
  slug: string;
  title: string;
  basePoints: number;
  published: boolean;
}> {
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      basePoints: true,
      published: true,
      flagHash: true,
      flagSalt: true,
    },
  });
  if (!challenge) throw new ApiError(404, 'NOT_FOUND', 'Challenge not found');
  assertPublishedForSolve(challenge);
  return challenge;
}

export interface AdminCreateChallenge {
  title: string;
  slug: string;
  description: string;
  categoryId: number;
  difficulty: SharedDifficulty;
  basePoints: number;
  flag: string;
  tagIds?: number[];
  published?: boolean;
}

export async function createChallenge(
  input: AdminCreateChallenge,
  authorId: number,
): Promise<ChallengeDetailDto> {
  const category = await prisma.challengeCategory.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new ApiError(400, 'VALIDATION_ERROR', 'Unknown category');

  const existing = await prisma.challenge.findUnique({ where: { slug: input.slug } });
  if (existing) throw new ApiError(409, 'CONFLICT', 'A challenge with this slug already exists');

  const salt = randomSalt();
  const challenge = await prisma.challenge.create({
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      difficulty: input.difficulty,
      basePoints: input.basePoints,
      published: input.published ?? true,
      flagHash: hashFlag(input.flag, salt),
      flagSalt: salt,
      createdById: authorId,
      tags: input.tagIds?.length
        ? { create: input.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: { category: true, tags: { include: { tag: true } }, hints: true, attachments: true },
  });

  await prisma.challengeVersion.create({
    data: {
      challengeId: challenge.id,
      version: 1,
      title: challenge.title,
      description: challenge.description,
      difficulty: challenge.difficulty as SharedDifficulty,
      basePoints: challenge.basePoints,
      createdById: authorId,
      changeSummary: 'Initial release',
    },
  });

  return hydrateDetail(challenge as never, { solved: false, unlockedHintIds: new Set() }, { manage: true }, 0);
}

export type AdminUpdateChallenge = Partial<Omit<AdminCreateChallenge, 'published'>> & {
  published?: boolean;
  tagIds?: number[];
};

export async function updateChallenge(
  id: number,
  input: AdminUpdateChallenge,
  editorId: number,
): Promise<ChallengeDetailDto> {
  const existing = await prisma.challenge.findUnique({
    where: { id },
    include: { tags: { select: { tagId: true } } },
  });
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Challenge not found');

  const newFlag = typeof input.flag === 'string' && input.flag.length > 0 ? input.flag : undefined;

  const data: Prisma.ChallengeUpdateInput = {
    title: input.title,
    description: input.description,
    difficulty: input.difficulty,
    basePoints: input.basePoints,
    published: input.published,
    ...(newFlag !== undefined
      ? { flagHash: hashFlag(newFlag, existing.flagSalt), flagSalt: existing.flagSalt }
      : {}),
  };

  const categoryId = input.categoryId;
  if (categoryId) {
    const category = await prisma.challengeCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new ApiError(400, 'VALIDATION_ERROR', 'Unknown category');
  }

  const lastVersion = await prisma.challengeVersion.findFirst({
    where: { challengeId: id },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.challengeVersion.create({
      data: {
        challengeId: id,
        version: nextVersion,
        title: input.title ?? existing.title,
        description: input.description ?? existing.description,
        difficulty: input.difficulty ?? existing.difficulty,
        basePoints: input.basePoints ?? existing.basePoints,
        createdById: editorId,
        changeSummary: `Edited by ${editorId}`,
      },
    });

    if (input.tagIds) {
      await tx.challengeTag.deleteMany({ where: { challengeId: id } });
      if (input.tagIds.length > 0) {
        await tx.challengeTag.createMany({
          data: input.tagIds.map((tagId) => ({ challengeId: id, tagId })),
        });
      }
    }

    const t = (await tx.challenge.update({
      where: { id },
      data,
      include: { category: true, tags: { include: { tag: true } }, hints: true, attachments: true },
    })) as Prisma.ChallengeGetPayload<{
      include: {
        category: true;
        tags: { include: { tag: true } };
        hints: true;
        attachments: true;
      };
    }>;
    return t;
  });

  const { solved, unlockedHintIds } = await loadSolutionState(undefined, id);
  const solvedCount = await prisma.submission.count({ where: { challengeId: id } });
  return hydrateDetail(updated as never, { solved, unlockedHintIds }, { manage: true }, solvedCount);
}

export async function deleteChallenge(id: number): Promise<void> {
  const existing = await prisma.challenge.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Challenge not found');
  await prisma.challenge.delete({ where: { id } });
}

function hydrateDetail(
  challenge: {
    id: number;
    slug: string;
    title: string;
    description: string;
    category: { id: number; name: string; slug: string; icon: string | null; sortOrder: number };
    difficulty: SharedDifficulty;
    basePoints: number;
    published: boolean;
    tags?: { tag?: TagRow }[];
    hints?: {
      id: number;
      title: string;
      body: string;
      penaltyPoints: number;
      sortOrder: number;
    }[];
    attachments?: { id: number; title: string; url: string; mimeType: string | null; sizeBytes: number | null }[];
    createdAt: Date | string;
    updatedAt: Date | string;
  },
  state: { solved: boolean; unlockedHintIds: Set<number> },
  opts: { manage: boolean },
  solvedCount: number,
): ChallengeDetailDto {
  const { solved, unlockedHintIds } = state;
  return {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    description: challenge.description,
    category: toCategoryDto(challenge.category),
    difficulty: challenge.difficulty as SharedDifficulty,
    basePoints: challenge.basePoints,
    solvedCount,
    published: challenge.published,
    solvedByMe: solved,
    tags: (challenge.tags ?? []).map((t) => toTagDto(t.tag!)),
    hints: (challenge.hints ?? []).map((h) => {
      const unlocked = opts.manage || unlockedHintIds.has(h.id);
      return {
        id: h.id,
        title: h.title,
        penaltyPoints: h.penaltyPoints,
        unlocked,
        body: unlocked ? h.body : null,
      };
    }),
    attachments: (challenge.attachments ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      url: a.url,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
    })),
    createdAt: new Date(challenge.createdAt).toISOString(),
    updatedAt: new Date(challenge.updatedAt).toISOString(),
  };
}

export async function unlockHint(
  userId: number,
  challengeId: number,
  hintId: number,
): Promise<HintDto> {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, select: { id: true, published: true } });
  if (!challenge) throw new ApiError(404, 'NOT_FOUND', 'Challenge not found');
  assertPublishedForSolve(challenge);

  const hint = await prisma.hint.findUnique({ where: { id: hintId } });
  if (!hint || hint.challengeId !== challengeId) {
    throw new ApiError(404, 'NOT_FOUND', 'Hint not found');
  }

  await prisma.hintUnlock.upsert({
    where: { userId_hintId: { userId, hintId } },
    update: {},
    create: { userId, hintId },
  });

  return {
    id: hint.id,
    title: hint.title,
    penaltyPoints: hint.penaltyPoints,
    unlocked: true,
    body: hint.body,
  };
}

export async function listAdminHintIds(challengeId: number): Promise<number[]> {
  const rows = await prisma.hint.findMany({ where: { challengeId }, select: { id: true } });
  return rows.map((r) => r.id);
}

export async function createHint(
  challengeId: number,
  input: { title: string; body: string; penaltyPoints: number; sortOrder: number },
): Promise<HintDto> {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, select: { id: true } });
  if (!challenge) throw new ApiError(404, 'NOT_FOUND', 'Challenge not found');
  const hint = await prisma.hint.create({
    data: { ...input, challengeId },
  });
  return {
    id: hint.id,
    title: hint.title,
    penaltyPoints: hint.penaltyPoints,
    unlocked: true,
    body: hint.body,
  };
}

export async function updateHint(
  hintId: number,
  input: Partial<{ title: string; body: string; penaltyPoints: number; sortOrder: number }>,
): Promise<HintDto> {
  const hint = await prisma.hint.findUnique({ where: { id: hintId } });
  if (!hint) throw new ApiError(404, 'NOT_FOUND', 'Hint not found');
  const updated = await prisma.hint.update({ where: { id: hintId }, data: input });
  return {
    id: updated.id,
    title: updated.title,
    penaltyPoints: updated.penaltyPoints,
    unlocked: true,
    body: updated.body,
  };
}

export async function deleteHint(hintId: number): Promise<void> {
  const hint = await prisma.hint.findUnique({ where: { id: hintId } });
  if (!hint) throw new ApiError(404, 'NOT_FOUND', 'Hint not found');
  await prisma.hint.delete({ where: { id: hintId } });
}