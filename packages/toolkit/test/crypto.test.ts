import { describe, expect, it } from 'vitest';

import {
  analyzeFrequency,
  caesar,
  vigenere,
  xorBytes,
  xorWithKey,
} from '../src/crypto';
import { utf8ToBytes } from '../src/encoding';

describe('caesar', () => {
  it('encrypts and decrypts with positive and negative shifts', () => {
    const input = 'Attack at dawn!';
    expect(caesar(input, 3)).toBe('Dwwdfn dw gdzq!');
    expect(caesar(caesar(input, 3), 3, true)).toBe(input);
    expect(caesar(caesar(input, 7), 7, true)).toBe(input);
    expect(caesar('abc', -1)).toBe('zab');
    expect(caesar('abc', 27)).toBe('bcd');
  });

  it('preserves case and non-letter characters', () => {
    expect(caesar('Hello, World!', 1)).toBe('Ifmmp, Xpsme!');
  });

  it('wraps around the alphabet', () => {
    expect(caesar('xyz', 3)).toBe('abc');
  });
});

describe('vigenere', () => {
  it('encrypts and decrypts with a key', () => {
    const input = 'ATTACKATDAWN';
    const cipher = vigenere(input, 'LEMON');
    expect(cipher).toBe('LXFOPVEFRNHR');
    expect(vigenere(cipher, 'LEMON', true)).toBe(input);
  });

  it('skips non-letters and preserves case', () => {
    const input = 'Attack at dawn!';
    const cipher = vigenere(input, 'KEY');
    expect(vigenere(vigenere(input, 'KEY'), 'KEY', true)).toBe(input);
    expect(cipher).toMatch(/^[A-Za-z !]+$/);
  });

  it('is case-insensitive in key handling', () => {
    expect(vigenere('ABC', 'b')).toBe(vigenere('ABC', 'B'));
  });

  it('returns input unchanged for an empty or non-letter key', () => {
    expect(vigenere('HELLO', '')).toBe('HELLO');
    expect(vigenere('HELLO', '123')).toBe('HELLO');
  });
});

describe('xor', () => {
  it('round-trips byte arrays', () => {
    const a = utf8ToBytes('secret data');
    const key = utf8ToBytes('key');
    const out = xorBytes(a, key);
    expect(out).not.toEqual(a);
    expect(xorBytes(out, key)).toEqual(a);
  });

  it('cycles the key over long inputs', () => {
    const a = utf8ToBytes('short');
    const key = utf8ToBytes('ab');
    const out = xorBytes(a, key);
    expect(Array.from(out)).toEqual([18, 10, 14, 16, 21]);
  });

  it('xorWithKey round-trips text', () => {
    const input = 'CTF{plaintext}';
    const key = 'p@ss';
    expect(xorWithKey(xorWithKey(input, key), key)).toBe(input);
  });

  it('returns input when the key is empty', () => {
    expect(xorWithKey('anything', '')).toBe('anything');
  });
});

describe('frequency', () => {
  it('counts letters case-insensitively with percentages', () => {
    const { letters } = analyzeFrequency('aaabbb');
    expect(letters[0]).toEqual({ letter: 'a', count: 3, percentage: 50 });
  });

  it('lists most frequent letters first', () => {
    const { letters } = analyzeFrequency('zzzzzyyyyyxxxxx');
    expect(letters.map((entry) => entry.letter)).toEqual(['x', 'y', 'z']);
  });

  it('ignores non-letters entirely', () => {
    const { letters } = analyzeFrequency('  123!!');
    expect(letters).toEqual([]);
  });

  it('extracts the most common trigrams', () => {
    const { topTrigrams } = analyzeFrequency('the the the at and');
    expect(topTrigrams[0]!.trigram).toBe('the');
  });
});

describe('analyzeFrequency percentages', () => {
  it('computes correct round percentages', () => {
    const { letters } = analyzeFrequency('aab');
    const a = letters.find((entry) => entry.letter === 'a');
    expect(a!.percentage).toBe(66.67);
  });
});