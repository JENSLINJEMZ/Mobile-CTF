import { describe, expect, it } from 'vitest';

import { type UnlockContext, evaluateUnlockRule, type UnlockRuleInput } from '../src/services/unlockRules';

const base: UnlockContext = {
  now: new Date('2026-01-15T12:00:00Z'),
  solvedChallengeIds: new Set([1, 2]),
  eventScore: 500,
};

function rule(partial: Partial<UnlockRuleInput>): UnlockRuleInput {
  return { type: 'ALWAYS', unlockAt: null, minScore: null, prerequisiteChallengeIds: [], ...partial };
}

describe('evaluateUnlockRule', () => {
  it('treats a missing rule as always unlocked', () => {
    expect(evaluateUnlockRule(null, base)).toEqual({ locked: false });
  });

  it('unlocks ALWAYS rules', () => {
    expect(evaluateUnlockRule(rule({ type: 'ALWAYS' }), base)).toEqual({ locked: false });
  });

  it('locks TIME rules until the unlock time, then unlocks', () => {
    const before = evaluateUnlockRule(
      rule({ type: 'TIME', unlockAt: new Date('2026-01-20T00:00:00Z') }),
      base,
    );
    expect(before).toEqual({ locked: true, reason: 'time_lock' });

    const after = evaluateUnlockRule(
      rule({ type: 'TIME', unlockAt: new Date('2026-01-10T00:00:00Z') }),
      base,
    );
    expect(after).toEqual({ locked: false });
  });

  it('unlocks TIME rules with no unlock time', () => {
    expect(evaluateUnlockRule(rule({ type: 'TIME', unlockAt: null }), base)).toEqual({
      locked: false,
    });
  });

  it('locks PREREQUISITE rules until all required challenges are solved', () => {
    const locked = evaluateUnlockRule(
      rule({ type: 'PREREQUISITE', prerequisiteChallengeIds: [1, 3] }),
      base,
    );
    expect(locked).toEqual({ locked: true, reason: 'prerequisite' });

    const unlocked = evaluateUnlockRule(
      rule({ type: 'PREREQUISITE', prerequisiteChallengeIds: [1, 2] }),
      base,
    );
    expect(unlocked).toEqual({ locked: false });
  });

  it('treats PREREQUISITE with no requirements as unlocked', () => {
    expect(
      evaluateUnlockRule(rule({ type: 'PREREQUISITE', prerequisiteChallengeIds: [] }), base),
    ).toEqual({ locked: false });
  });

  it('locks SCORE rules until the threshold is reached', () => {
    const locked = evaluateUnlockRule(rule({ type: 'SCORE', minScore: 600 }), base);
    expect(locked).toEqual({ locked: true, reason: 'score' });

    const unlocked = evaluateUnlockRule(rule({ type: 'SCORE', minScore: 500 }), base);
    expect(unlocked).toEqual({ locked: false });
  });

  it('unlocks SCORE rules at the exact threshold', () => {
    expect(evaluateUnlockRule(rule({ type: 'SCORE', minScore: 500 }), base)).toEqual({
      locked: false,
    });
  });

  it('maps anonymity to zero score and an empty solved set', () => {
    const anonymous: UnlockContext = {
      now: base.now,
      solvedChallengeIds: new Set(),
      eventScore: 0,
    };
    expect(
      evaluateUnlockRule(rule({ type: 'PREREQUISITE', prerequisiteChallengeIds: [1] }), anonymous),
    ).toEqual({ locked: true, reason: 'prerequisite' });
    expect(evaluateUnlockRule(rule({ type: 'SCORE', minScore: 100 }), anonymous)).toEqual({
      locked: true,
      reason: 'score',
    });
    expect(evaluateUnlockRule(rule({ type: 'TIME', unlockAt: null }), anonymous)).toEqual({
      locked: false,
    });
  });
});