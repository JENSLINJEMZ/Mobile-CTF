import { bytesToUtf8, utf8ToBytes } from "./encoding";

export function caesar(input: string, shift: number, decrypt = false): string {
  const effective = decrypt ? -shift : shift;
  const normalized = ((effective % 26) + 26) % 26;
  let out = "";
  for (const char of input) {
    const code = char.charCodeAt(0);
    if (char >= "A" && char <= "Z") {
      out += String.fromCharCode(((code - 65 + normalized) % 26) + 65);
    } else if (char >= "a" && char <= "z") {
      out += String.fromCharCode(((code - 97 + normalized) % 26) + 97);
    } else {
      out += char;
    }
  }
  return out;
}

export function vigenere(input: string, key: string, decrypt = false): string {
  const letters = key.replace(/[^A-Za-z]/g, "");
  if (letters.length === 0) return input;
  const shifts = Array.from(letters).map((char) => {
    const code = char.charCodeAt(0);
    return code >= 97 ? code - 97 : code - 65;
  });
  let index = 0;
  let out = "";
  for (const char of input) {
    const code = char.charCodeAt(0);
    const shift = decrypt ? 26 - (shifts[index] ?? 0) : (shifts[index] ?? 0);
    if (char >= "A" && char <= "Z") {
      out += String.fromCharCode(((code - 65 + shift) % 26) + 65);
      index += 1;
    } else if (char >= "a" && char <= "z") {
      out += String.fromCharCode(((code - 97 + shift) % 26) + 97);
      index += 1;
    } else {
      out += char;
    }
    if (index >= shifts.length) index = 0;
  }
  return out;
}

export function xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i += 1) {
    out[i] = a[i]! ^ b[i % b.length]!;
  }
  return out;
}

export function xorWithKey(input: string, key: string): string {
  const data = utf8ToBytes(input);
  const keyBytes = utf8ToBytes(key);
  if (keyBytes.length === 0) return input;
  const keyed = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    keyed[i] = data[i]! ^ keyBytes[i % keyBytes.length]!;
  }
  return bytesToUtf8(keyed);
}

export interface LetterFrequency {
  letter: string;
  count: number;
  percentage: number;
}

export function analyzeFrequency(input: string): {
  letters: LetterFrequency[];
  topTrigrams: { trigram: string; count: number }[];
} {
  const counts = new Map<string, number>();
  let total = 0;
  for (const char of input.toLowerCase()) {
    if (char >= "a" && char <= "z") {
      counts.set(char, (counts.get(char) ?? 0) + 1);
      total += 1;
    }
  }
  const letters: LetterFrequency[] = Array.from(counts.entries())
    .map(([letter, count]) => ({
      letter,
      count,
      percentage: total === 0 ? 0 : Math.round((count / total) * 10000) / 100,
    }))
    .sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter));

  const trigramCounts = new Map<string, number>();
  const clean = input.toLowerCase();
  for (let i = 0; i + 3 <= clean.length; i += 1) {
    if (/^[a-z]{3}$/.test(clean.slice(i, i + 3))) {
      const trigram = clean.slice(i, i + 3);
      trigramCounts.set(trigram, (trigramCounts.get(trigram) ?? 0) + 1);
    }
  }
  const topTrigrams = Array.from(trigramCounts.entries())
    .map(([trigram, count]) => ({ trigram, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { letters, topTrigrams };
}
