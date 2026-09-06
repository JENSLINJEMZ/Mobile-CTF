import type { BookmarkDto, BookmarkListResponse } from "@ctf/shared";
import { ErrorCode } from "@ctf/shared";
import { prisma } from "@ctf/database";

import { ApiError } from "../middleware/errors";

interface BookmarkRow {
  createdAt: Date;
  challenge: {
    id: number;
    slug: string;
    title: string;
    difficulty: string;
    basePoints: number;
    _count: { submissions: number };
  };
}

export async function listBookmarks(
  userId: number,
): Promise<BookmarkListResponse> {
  const rows = (await prisma.bookmark.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      challenge: {
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          basePoints: true,
          _count: { select: { submissions: true } },
        },
      },
    },
  })) as unknown as BookmarkRow[];

  const solvedByMe = new Set(
    (
      await prisma.submission.findMany({
        where: { userId },
        select: { challengeId: true },
      })
    ).map((s) => s.challengeId),
  );

  const items: BookmarkDto[] = rows.map((row) => ({
    challengeId: row.challenge.id,
    slug: row.challenge.slug,
    title: row.challenge.title,
    difficulty: row.challenge.difficulty as BookmarkDto["difficulty"],
    basePoints: row.challenge.basePoints,
    solvedByMe: solvedByMe.has(row.challenge.id),
    bookmarkedAt: row.createdAt.toISOString(),
  }));

  return { items };
}

export async function addBookmark(
  userId: number,
  challengeId: number,
): Promise<BookmarkDto> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true },
  });
  if (!challenge)
    throw new ApiError(404, ErrorCode.NOT_FOUND, "Challenge not found");

  await prisma.bookmark.upsert({
    where: { userId_challengeId: { userId, challengeId } },
    update: {},
    create: { userId, challengeId },
  });

  const rows = (await prisma.bookmark.findMany({
    where: { userId, challengeId },
    include: {
      challenge: {
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          basePoints: true,
          _count: { select: { submissions: true } },
        },
      },
    },
  })) as unknown as BookmarkRow[];
  const item = rows[0];
  if (!item)
    throw new ApiError(
      500,
      ErrorCode.INTERNAL_ERROR,
      "Bookmark was not created",
    );

  const solved = await prisma.submission.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
    select: { id: true },
  });

  return {
    challengeId: item.challenge.id,
    slug: item.challenge.slug,
    title: item.challenge.title,
    difficulty: item.challenge.difficulty as BookmarkDto["difficulty"],
    basePoints: item.challenge.basePoints,
    solvedByMe: solved !== null,
    bookmarkedAt: item.createdAt.toISOString(),
  };
}

export async function removeBookmark(
  userId: number,
  challengeId: number,
): Promise<void> {
  await prisma.bookmark.deleteMany({ where: { userId, challengeId } });
}

export async function isBookmarked(
  userId: number,
  challengeId: number,
): Promise<boolean> {
  return (
    (await prisma.bookmark.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
      select: { id: true },
    })) !== null
  );
}
