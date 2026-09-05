import type { SubmitFlagResponse } from '@ctf/shared';
import { prisma } from '@ctf/database';
import { sha256Hex, verifyFlag } from '@ctf/database';

import { ApiError } from '../middleware/errors';
import { computeSolveResult } from './scoring';
import { applySolve, getGlobalRank, getUserTotalScore } from './leaderboard';

export async function submitFlag(
  userId: number,
  challengeId: number,
  flag: string,
): Promise<SubmitFlagResponse> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
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
  if (!challenge || !challenge.published) {
    throw new ApiError(404, 'NOT_FOUND', 'Challenge not found');
  }

  const existing = await prisma.submission.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
    select: { id: true, pointsAwarded: true },
  });
  if (existing) {
    const totalScore = await getUserTotalScore(userId);
    const rank = await getGlobalRank(userId);
    return {
      correct: true,
      message: 'You have already solved this challenge',
      pointsAwarded: 0,
      firstBlood: false,
      totalScore,
      rank,
      challenge: { id: challenge.id, slug: challenge.slug, title: challenge.title },
    };
  }

  const normalizedFlag = flag.trim().toLowerCase();
  const correct = verifyFlag(normalizedFlag, challenge.flagSalt, challenge.flagHash);

  const attempt = await prisma.submissionAttempt.create({
    data: {
      userId,
      challengeId,
      flagAttemptHash: sha256Hex(normalizedFlag),
      correct,
    },
    select: { id: true },
  });

  if (!correct) {
    const totalScore = await getUserTotalScore(userId);
    const rank = await getGlobalRank(userId);
    return {
      correct: false,
      message: 'Incorrect flag. Keep trying!',
      pointsAwarded: 0,
      firstBlood: false,
      totalScore,
      rank,
      challenge: { id: challenge.id, slug: challenge.slug, title: challenge.title },
    };
  }

  const unlockedPenalty = await unlockedHintPenalty(userId, challengeId);
  const solvedCountBefore = await prisma.submission.count({ where: { challengeId } });
  const isFirstBlood = solvedCountBefore === 0;
  const { pointsAwarded, firstBlood } = computeSolveResult(
    challenge.basePoints,
    unlockedPenalty,
    isFirstBlood,
  );

  try {
    await prisma.submission.create({
      data: {
        userId,
        challengeId,
        attemptId: attempt.id,
        pointsAwarded,
        isFirstBlood,
      },
    });
  } catch {
    const totalScore = await getUserTotalScore(userId);
    const rank = await getGlobalRank(userId);
    return {
      correct: true,
      message: 'You have already solved this challenge',
      pointsAwarded: 0,
      firstBlood: false,
      totalScore,
      rank,
      challenge: { id: challenge.id, slug: challenge.slug, title: challenge.title },
    };
  }

  const { totalScore, rank } = await applySolve(userId, pointsAwarded);
  return {
    correct: true,
    message: isFirstBlood
      ? `Correct! First blood! +${pointsAwarded} points`
      : `Correct! +${pointsAwarded} points`,
    pointsAwarded,
    firstBlood,
    totalScore,
    rank,
    challenge: { id: challenge.id, slug: challenge.slug, title: challenge.title },
  };
}

async function unlockedHintPenalty(userId: number, challengeId: number): Promise<number> {
  const unlocks = await prisma.hintUnlock.findMany({
    where: { userId, hint: { challengeId } },
    include: { hint: { select: { penaltyPoints: true } } },
  });
  return unlocks.reduce((sum, u) => sum + u.hint.penaltyPoints, 0);
}