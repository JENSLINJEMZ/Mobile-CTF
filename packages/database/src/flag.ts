import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function randomSalt(bytes = 16): string {
  return sha256Hex(randomBytes(bytes).toString('hex')).slice(0, 32);
}

export function hashFlag(flag: string, salt: string): string {
  return sha256Hex(`${salt}:${flag}`);
}

export function verifyFlag(flag: string, salt: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashFlag(flag, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}