import type { UnlockLockedReason, UnlockRuleType } from "@ctf/shared";

export interface UnlockRuleInput {
  type: UnlockRuleType;
  unlockAt: Date | null;
  minScore: number | null;
  prerequisiteChallengeIds: number[];
}

export interface UnlockContext {
  now: Date;
  solvedChallengeIds: Set<number>;
  eventScore: number;
}

export type UnlockOutcome =
  { locked: false } | { locked: true; reason: UnlockLockedReason };

/**
 * Pure unlock-rule evaluator. `null`/missing rule means "always unlocked".
 * Anonymity maps to an empty solved set + zero score, so PREREQUISITE/SCORE
 * rules evaluate as locked and TIME/ALWAYS evaluate as unlocked.
 */
export function evaluateUnlockRule(
  rule: UnlockRuleInput | null,
  ctx: UnlockContext,
): UnlockOutcome {
  if (!rule || rule.type === "ALWAYS") {
    return { locked: false };
  }
  switch (rule.type) {
    case "TIME": {
      if (rule.unlockAt === null) return { locked: false };
      if (ctx.now < rule.unlockAt) return { locked: true, reason: "time_lock" };
      return { locked: false };
    }
    case "PREREQUISITE": {
      if (rule.prerequisiteChallengeIds.length === 0) return { locked: false };
      const satisfied = rule.prerequisiteChallengeIds.every((id) =>
        ctx.solvedChallengeIds.has(id),
      );
      return satisfied
        ? { locked: false }
        : { locked: true, reason: "prerequisite" };
    }
    case "SCORE": {
      const threshold = rule.minScore ?? 0;
      return ctx.eventScore >= threshold
        ? { locked: false }
        : { locked: true, reason: "score" };
    }
  }
}
