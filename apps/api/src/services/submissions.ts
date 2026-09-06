import type { SubmitFlagResponse } from "@ctf/shared";
import { prisma } from "@ctf/database";
import { sha256Hex, verifyFlag } from "@ctf/database";

import { ApiError } from "../middleware/errors";
import { evaluateAndGrantAchievements } from "./achievements";
import { assertEventChallengeAccess, recordEventSolve } from "./events";
import { computeSolveResult } from "./scoring";
import { applySolve, getGlobalRank, getUserTotalScore } from "./leaderboard";

async function challengeResult(
  userId: number,
  challenge: {
    id: number;
    slug: string;
    title: string;
  },
): Promise<SubmitFlagResponse> {
  const totalScore = await getUserTotalScore(userId);
  const rank = await getGlobalRank(userId);
  return {
    correct: true,
    message: "You have already solved this challenge",
    pointsAwarded: 0,
    firstBlood: false,
    totalScore,
    rank,
    challenge,
  };
}

export async function submitFlag(
  userId: number,
  challengeId: number,
  flag: string,
  eventId?: number,
  idempotencyKey?: string,
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
    throw new ApiError(404, "NOT_FOUND", "Challenge not found");
  }

  if (eventId !== undefined) {
    await assertEventChallengeAccess(eventId, challengeId, userId);
  }

  const existing = await prisma.submission.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
    select: { id: true, pointsAwarded: true },
  });
  if (existing) {
    return challengeResult(userId, challenge);
  }

  if (idempotencyKey) {
    const priorAttempt = await prisma.submissionAttempt.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: { correct: true },
    });
    if (priorAttempt) {
      const totalScore = await getUserTotalScore(userId);
      const rank = await getGlobalRank(userId);
      return {
        correct: priorAttempt.correct,
        message: priorAttempt.correct
          ? "You have already solved this challenge"
          : "Incorrect flag. Keep trying!",
        pointsAwarded: 0,
        firstBlood: false,
        totalScore,
        rank,
        challenge: {
          id: challenge.id,
          slug: challenge.slug,
          title: challenge.title,
        },
      };
    }
  }

  const normalizedFlag = flag.trim().toLowerCase();
  const correct = verifyFlag(
    normalizedFlag,
    challenge.flagSalt,
    challenge.flagHash,
  );

  const attempt = await prisma.submissionAttempt.create({
    data: {
      userId,
      challengeId,
      flagAttemptHash: sha256Hex(normalizedFlag),
      correct,
      idempotencyKey,
    },
    select: { id: true },
  });

  if (!correct) {
    const totalScore = await getUserTotalScore(userId);
    const rank = await getGlobalRank(userId);
    return {
      correct: false,
      message: "Incorrect flag. Keep trying!",
      pointsAwarded: 0,
      firstBlood: false,
      totalScore,
      rank,
      challenge: {
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
      },
    };
  }

  const unlockedPenalty = await unlockedHintPenalty(userId, challengeId);
  const solvedCountBefore = await prisma.submission.count({
    where: { challengeId },
  });
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
    return challengeResult(userId, challenge);
  }

  const { totalScore, rank } = await applySolve(userId, pointsAwarded);
  await recordEventSolve(userId, pointsAwarded);
  await evaluateAndGrantAchievements(userId);
  return {
    correct: true,
    message: isFirstBlood
      ? `Correct! First blood! +${pointsAwarded} points`
      : `Correct! +${pointsAwarded} points`,
    pointsAwarded,
    firstBlood,
    totalScore,
    rank,
    challenge: {
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
    },
  };
}

async function unlockedHintPenalty(
  userId: number,
  challengeId: number,
): Promise<number> {
  const unlocks = await prisma.hintUnlock.findMany({
    where: { userId, hint: { challengeId } },
    include: { hint: { select: { penaltyPoints: true } } },
  });
  return unlocks.reduce((sum, u) => sum + u.hint.penaltyPoints, 0);
}
