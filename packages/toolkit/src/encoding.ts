/// Text ↔ byte helpers that work in Hermes, browsers, and Node (no node:buffers).

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function utf8ToBytes(input: string): Uint8Array {
  return textEncoder.encode(input);
}

export function bytesToUtf8(bytes: Uint8Array | number[]): string {
  const source = Array.isArray(bytes) ? Uint8Array.from(bytes) : bytes;
  return textDecoder.decode(source);
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const n = ((b0 << 16) | (b1 << 8) | b2) >>> 0;
    out += BASE64_ALPHABET.charAt((n >>> 18) & 63);
    out += BASE64_ALPHABET.charAt((n >>> 12) & 63);
    out += i + 1 < bytes.length ? BASE64_ALPHABET.charAt((n >>> 6) & 63) : '=';
    out += i + 2 < bytes.length ? BASE64_ALPHABET.charAt(n & 63) : '=';
  }
  return out;
}

export function encodeBase64(input: string): string {
  return bytesToBase64(utf8ToBytes(input));
}

function base64ValueOf(char: string): number {
  const index = BASE64_ALPHABET.indexOf(char);
  if (index === -1) throw new Error(`Invalid base64 character: ${char}`);
  return index;
}

export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/[\s\r\n=]+/g, '');
  if (clean.length % 4 === 1) throw new Error('Invalid base64 length');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = base64ValueOf(clean[i] ?? 'A');
    const c1 = base64ValueOf(clean[i + 1] ?? 'A');
    const c2Char = clean[i + 2];
    const c3Char = clean[i + 3];
    const c2 = c2Char !== undefined ? base64ValueOf(c2Char) : null;
    const c3 = c3Char !== undefined ? base64ValueOf(c3Char) : null;
    const n = ((c0 << 18) | (c1 << 12) | ((c2 ?? 0) << 6) | (c3 ?? 0)) >>> 0;
    out.push((n >>> 16) & 0xff);
    if (c2 !== null) out.push((n >>> 8) & 0xff);
    if (c3 !== null) out.push(n & 0xff);
  }
  return Uint8Array.from(out);
}

export function decodeBase64(input: string): string {
  return bytesToUtf8(base64ToBytes(input));
}

const HEX_BYTES = '0123456789abcdef';

export function bytesToHex(bytes: Uint8Array, uppercase = false): string {
  let out = '';
  for (const byte of bytes) {
    const hi = byte >>> 4;
    const lo = byte & 0x0f;
    out += uppercase ? HEX_BYTES.toUpperCase()[hi] : HEX_BYTES[hi];
    out += uppercase ? HEX_BYTES.toUpperCase()[lo] : HEX_BYTES[lo];
  }
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[\s:,\-_]+/g, '');
  if (clean.length % 2 !== 0) throw new Error('Hex length must be even');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (!Number.isFinite(byte)) throw new Error(`Invalid hex at offset ${i * 2}`);
    out[i] = byte;
  }
  return out;
}

const UNRESERVED =
  /^[A-Za-z0-9\-_.!~*'()]+$/;

export function urlEncode(input: string): string {
  let out = '';
  for (const byte of utf8ToBytes(input)) {
    const char = String.fromCharCode(byte);
    out += UNRESERVED.test(char) ? char : `%${HEX_BYTES.toUpperCase()[byte >>> 4]}${HEX_BYTES.toUpperCase()[byte & 0x0f]}`;
  }
  return out;
}

export function urlDecode(input: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    if (input[i] === '%' && /^[0-9a-fA-F]{2}$/.test(input.slice(i + 1, i + 3))) {
      bytes.push(Number.parseInt(input.slice(i + 1, i + 3), 16));
      i += 2;
    } else if (input[i] === '+') {
      bytes.push(0x20);
    } else {
      for (const byte of new TextEncoder().encode(input[i])) bytes.push(byte);
    }
  }
  return bytesToUtf8(Uint8Array.from(bytes));
}

export function rot13(input: string): string {
  return rotWithShift(input, 13);
}

export function rotWithShift(input: string, shift: number): string {
  const normalized = ((shift % 26) + 26) % 26;
  let out = '';
  for (const char of input) {
    const code = char.charCodeAt(0);
    if (char >= 'A' && char <= 'Z') {
      out += String.fromCharCode(((code - 65 + normalized) % 26) + 65);
    } else if (char >= 'a' && char <= 'z') {
      out += String.fromCharCode(((code - 97 + normalized) % 26) + 97);
    } else {
      out += char;
    }
  }
  return out;
}