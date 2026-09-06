import { describe, expect, it } from "vitest";

import {
  computeAwardedPoints,
  computeFirstBloodBonus,
  computeSolveResult,
  sumTotalScore,
} from "../src/services/scoring";

describe("scoring math", () => {
  it("full points awarded when no hints unlocked", () => {
    expect(computeAwardedPoints(100, 0)).toBe(100);
  });

  it("deducts unlocked hint penalties", () => {
    expect(computeAwardedPoints(200, 25)).toBe(175);
    expect(computeAwardedPoints(200, 75)).toBe(125);
  });

  it("clamps awarded points at zero", () => {
    expect(computeAwardedPoints(40, 100)).toBe(0);
    expect(computeAwardedPoints(50, 50)).toBe(0);
  });

  it("first blood adds 10% of base points, rounded", () => {
    expect(computeFirstBloodBonus(100)).toBe(10);
    expect(computeFirstBloodBonus(200)).toBe(20);
    expect(computeFirstBloodBonus(150)).toBe(15);
    expect(computeFirstBloodBonus(175)).toBe(18);
  });

  it("solve result adds bonus only for the first solver", () => {
    expect(computeSolveResult(200, 0, true)).toEqual({
      pointsAwarded: 220,
      firstBlood: true,
    });
    expect(computeSolveResult(200, 0, false)).toEqual({
      pointsAwarded: 200,
      firstBlood: false,
    });
    expect(computeSolveResult(200, 50, true)).toEqual({
      pointsAwarded: 170,
      firstBlood: true,
    });
  });

  it("sumTotalScore aggregates awarded points", () => {
    expect(
      sumTotalScore([
        { pointsAwarded: 220 },
        { pointsAwarded: 75 },
        { pointsAwarded: 40 },
      ]),
    ).toBe(335);
    expect(sumTotalScore([])).toBe(0);
  });
});
