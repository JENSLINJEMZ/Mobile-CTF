import { describe, expect, it } from 'vitest';

import { hexDump, parseExif, parseTiff, sniffFileType } from '../src/fileAnalysis';
import { bytesToUtf8, utf8ToBytes } from '../src/encoding';

function le16(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function le32(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

function buildTiff(): Uint8Array {
  const bytes: number[] = [];
  bytes.push(0x49, 0x49, 0x2a, 0x00); // II, 42
  bytes.push(...le32(8)); // IFD0 at offset 8

  const entries: number[][] = [];
  const asciiMake = utf8ToBytes('Acme');
  const asciiModel = utf8ToBytes('X1');
  entries.push([0x010f, 2, asciiMake.length, ...asciiMake]);
  entries.push([0x0110, 2, asciiModel.length, ...asciiModel]);
  entries.push([0x0112, 3, 1, 1, 0, 0]); // orientation: value 1 inline

  bytes.push(...le16(entries.length));
  for (const entry of entries) {
    const tag = entry[0] ?? 0;
    const type = entry[1] ?? 0;
    const valueCount = entry[2] ?? 0;
    bytes.push(...le16(tag), ...le16(type), ...le32(valueCount));
    for (let i = 3; i < 7; i += 1) {
      bytes.push(entry[i] ?? 0);
    }
  }
  bytes.push(...le32(0)); // next IFD
  return Uint8Array.from(bytes);
}

function buildJpegWithExif(): Uint8Array {
  const tiff = buildTiff();
  const payload = [...utf8ToBytes('Exif\x00\x00'), ...tiff];
  const length = 2 + payload.length;
  return Uint8Array.from([
    0xff, 0xd8, // SOI
    0xff, 0xe1, // APP1
    ...le16(length),
    ...payload,
    0xff, 0xd9, // EOI
  ]);
}

function buildTiffWithGps(): Uint8Array {
  const bytes: number[] = [];
  bytes.push(0x49, 0x49, 0x2a, 0x00, ...le32(8));

  const gpsOffset = 8 + 2 + 12 + 4; // IFD0 with a single entry
  const gpsSize = 2 + 4 * 12 + 4;
  const latDataOffset = gpsOffset + gpsSize;
  const lonDataOffset = latDataOffset + 3 * 8;

  bytes.push(...le16(1)); // IFD0 entries
  bytes.push(...le16(0x8825), ...le16(4), ...le32(1), ...le32(gpsOffset)); // GPS IFD pointer
  bytes.push(...le32(0)); // next IFD

  // GPS IFD: ref "N", lat (3 rationals), ref "E", lon (3 rationals)
  bytes.push(...le16(4));
  bytes.push(...le16(0x0001), ...le16(2), ...le32(2), 0x4e, 0x00, 0x00, 0x00);
  bytes.push(...le16(0x0002), ...le16(5), ...le32(3), ...le32(latDataOffset));
  bytes.push(...le16(0x0003), ...le16(2), ...le32(2), 0x45, 0x00, 0x00, 0x00);
  bytes.push(...le16(0x0004), ...le16(5), ...le32(3), ...le32(lonDataOffset));
  bytes.push(...le32(0)); // next IFD

  // Rational data for 48.858844 N (48d 51m 31.84s)
  bytes.push(...le32(48), ...le32(1), ...le32(51), ...le32(1), ...le32(3184), ...le32(100));
  // Rational data for 2.294351 E (2d 17m 39.66s)
  bytes.push(...le32(2), ...le32(1), ...le32(17), ...le32(1), ...le32(3966), ...le32(100));

  return Uint8Array.from(bytes);
}

describe('hexDump', () => {
  it('formats offsets, hex columns, and ascii gutter', () => {
    const input = Uint8Array.from([0x41, 0x00, 0x0a, 0xff, 0x42]);
    const dump = hexDump(input);
    expect(dump).toContain('41 00 0a ff 42');
    expect(dump).toContain('|A...B|');
    expect(dump).toMatch(/^000000 {2}/);
  });

  it('uses byte-per-row padding for incomplete final row', () => {
    const dump = hexDump(utf8ToBytes('ab'), 16);
    expect(dump).toContain('|ab|');
  });
});

describe('sniffFileType', () => {
  it('detects JPEG, PNG, GIF, GIF89a and PDF', () => {
    expect(sniffFileType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))?.name).toBe('JPEG image');
    expect(sniffFileType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.name).toBe('PNG image');
    expect(sniffFileType(utf8ToBytes('GIF89a...'))?.name).toBe('GIF image');
    expect(sniffFileType(utf8ToBytes('GIF87a...'))?.name).toBe('GIF image');
    expect(sniffFileType(utf8ToBytes('%PDF-1.7'))?.name).toBe('PDF document');
  });

  it('detects zip, gzip and sqlite', () => {
    expect(sniffFileType(Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]))?.name).toBe('ZIP archive');
    expect(sniffFileType(Uint8Array.from([0x1f, 0x8b, 0x08]))?.name).toBe('GZIP archive');
    expect(sniffFileType(utf8ToBytes('SQLite format 3\x00'))?.name).toBe('SQLite database');
  });

  it('detects JSON/plain text with braces', () => {
    expect(sniffFileType(utf8ToBytes('{"a":1}'))?.name).toBe('JSON document');
    expect(sniffFileType(utf8ToBytes('plain text whatever'))).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(sniffFileType(new Uint8Array(0))).toBeNull();
  });
});

describe('parseExif (TIFF branch)', () => {
  it('extracts make/model/orientation from a little-endian TIFF', () => {
    const info = parseExif(buildTiff());
    expect(info?.parsedFrom).toBe('tiff');
    expect(info?.make).toBe('Acme');
    expect(info?.model).toBe('X1');
    expect(info?.orientation).toBe(1);
  });

  it('returns null for non-TIFF data', () => {
    expect(parseExif(utf8ToBytes('hello world this is not a tiff'))).toBeNull();
  });

  it('parses GPS coordinates from a GPS IFD pointer', () => {
    const info = parseExif(buildTiffWithGps());
    expect(info?.gpsLatitude).toBe(48.858844);
    expect(info?.gpsLongitude).toBe(2.29435);
  });
});

describe('parseExif (JPEG branch)', () => {
  it('locates the Exif APP1 segment inside a JPEG container', () => {
    const info = parseExif(buildJpegWithExif());
    expect(info?.parsedFrom).toBe('jpeg');
    expect(info?.make).toBe('Acme');
    expect(info?.model).toBe('X1');
  });

  it('returns null for a JPEG without EXIF', () => {
    const plain = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0xff, 0xd9]);
    expect(parseExif(plain)).toBeNull();
  });
});

describe('parseTiff', () => {
  it('rejects buffers without the TIFF magic', () => {
    expect(parseTiff(utf8ToBytes('no tiff here at all'))).toBeNull();
  });

  it('survives empty input', () => {
    expect(parseTiff(new Uint8Array(0))).toBeNull();
  });

  it('round-trips the ascii values it reads', () => {
    const info = parseTiff(buildTiff());
    expect(bytesToUtf8(utf8ToBytes(info?.model ?? ''))).toBe(info?.model);
  });
});