import { CHALLENGE } from '@ctf/shared';

export function clampPoints(value: number): number {
  return Math.max(0, value);
}

export function computeAwardedPoints(basePoints: number, unlockedPenalty: number): number {
  return clampPoints(basePoints - unlockedPenalty);
}

export function computeFirstBloodBonus(basePoints: number): number {
  return Math.round((basePoints * CHALLENGE.FIRST_BLOOD_BONUS_PERCENT) / 100);
}

export function computeSolveResult(basePoints: number, unlockedPenalty: number, isFirstBlood: boolean): {
  pointsAwarded: number;
  firstBlood: boolean;
} {
  const baseAward = computeAwardedPoints(basePoints, unlockedPenalty);
  const bonus = isFirstBlood ? computeFirstBloodBonus(basePoints) : 0;
  return { pointsAwarded: baseAward + bonus, firstBlood: isFirstBlood };
}

export function sumTotalScore(submissions: { pointsAwarded: number }[]): number {
  return submissions.reduce((acc, s) => acc + s.pointsAwarded, 0);
}