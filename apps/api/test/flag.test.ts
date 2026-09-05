import { verifyFlag, hashFlag, randomSalt, sha256Hex } from '@ctf/database';
import { describe, expect, it } from 'vitest';

describe('flag hashing & constant-time verification', () => {
  it('hashFlag is deterministic for a given salt+flag', () => {
    const salt = randomSalt();
    const a = hashFlag('ctf{flag_one}', salt);
    const b = hashFlag('ctf{flag_one}', salt);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifyFlag accepts the correct flag', () => {
    const salt = randomSalt();
    const hash = hashFlag('ctf{halcyon_days}', salt);
    expect(verifyFlag('ctf{halcyon_days}', salt, hash)).toBe(true);
  });

  it('verifyFlag rejects a wrong flag', () => {
    const salt = randomSalt();
    const hash = hashFlag('ctf{real_flag}', salt);
    expect(verifyFlag('ctf{fake_flag}', salt, hash)).toBe(false);
  });

  it('verifyFlag rejects a flag hashed under a different salt', () => {
    const hash = hashFlag('ctf{same_flag}', randomSalt());
    expect(verifyFlag('ctf{same_flag}', randomSalt(), hash)).toBe(false);
  });

  it('verifyFlag rejects garbage hash input without throwing', () => {
    expect(verifyFlag('ctf{a}', 'saltsaltsaltsalt', '')).toBe(false);
    expect(verifyFlag('ctf{a}', 'saltsaltsaltsalt', 'abc')).toBe(false);
  });

  it('sha256Hex produces a 64-char lowercase digest', () => {
    expect(sha256Hex('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });
});