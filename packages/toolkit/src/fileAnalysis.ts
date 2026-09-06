import { bytesToUtf8 } from "./encoding";

export function hexDump(bytes: Uint8Array, bytesPerRow = 16): string {
  const rows: string[] = [];
  const safe = bytesPerRow > 0 ? bytesPerRow : 16;
  for (let offset = 0; offset < bytes.length; offset += safe) {
    const chunk = bytes.slice(offset, offset + safe);
    const hex = Array.from(chunk, (b) => b.toString(16).padStart(2, "0")).join(
      " ",
    );
    const hexPadded = hex.padEnd(safe * 3 - 1, " ");
    const ascii = Array.from(chunk, (b) =>
      b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ".",
    ).join("");
    rows.push(
      `${offset.toString(16).padStart(6, "0")}  ${hexPadded}  |${ascii}|`,
    );
  }
  return rows.join("\n");
}

export interface FileTypeInfo {
  name: string;
  extensions: string[];
  mime: string;
}

const SIGNATURES: {
  name: string;
  extensions: string[];
  mime: string;
  match: (b: Uint8Array) => boolean;
}[] = [
  {
    name: "JPEG image",
    extensions: ["jpg", "jpeg"],
    mime: "image/jpeg",
    match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    name: "PNG image",
    extensions: ["png"],
    mime: "image/png",
    match: (b) =>
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    name: "GIF image",
    extensions: ["gif"],
    mime: "image/gif",
    match: (b) =>
      b[0] === 0x47 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x38 &&
      (b[4] === 0x37 || b[4] === 0x39) &&
      b[5] === 0x61,
  },
  {
    name: "WebP image",
    extensions: ["webp"],
    mime: "image/webp",
    match: (b) =>
      bytesToUtf8(b.slice(0, 4)) === "RIFF" &&
      bytesToUtf8(b.slice(8, 12)) === "WEBP",
  },
  {
    name: "BMP image",
    extensions: ["bmp"],
    mime: "image/bmp",
    match: (b) => b[0] === 0x42 && b[1] === 0x4d,
  },
  {
    name: "PDF document",
    extensions: ["pdf"],
    mime: "application/pdf",
    match: (b) => bytesToUtf8(b.slice(0, 5)) === "%PDF-",
  },
  {
    name: "ZIP archive",
    extensions: ["zip"],
    mime: "application/zip",
    match: (b) =>
      b[0] === 0x50 &&
      b[1] === 0x4b &&
      (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07) &&
      b[3] === 0x04,
  },
  {
    name: "GZIP archive",
    extensions: ["gz"],
    mime: "application/gzip",
    match: (b) => b[0] === 0x1f && b[1] === 0x8b,
  },
  {
    name: "7z archive",
    extensions: ["7z"],
    mime: "application/x-7z-compressed",
    match: (b) => bytesToUtf8(b.slice(0, 6)) === "7z\xbc\xaf\x27\x1c",
  },
  {
    name: "ELF executable",
    extensions: ["elf", "so", "o"],
    mime: "application/x-elf",
    match: (b) => b[0] === 0x7f && bytesToUtf8(b.slice(1, 4)) === "ELF",
  },
  {
    name: "PE executable",
    extensions: ["exe", "dll"],
    mime: "application/vnd.microsoft.pe",
    match: (b) => b[0] === 0x4d && b[1] === 0x5a,
  },
  {
    name: "WAV audio",
    extensions: ["wav"],
    mime: "audio/wav",
    match: (b) =>
      bytesToUtf8(b.slice(0, 4)) === "RIFF" &&
      bytesToUtf8(b.slice(8, 12)) === "WAVE",
  },
  {
    name: "MP4 video",
    extensions: ["mp4", "m4a"],
    mime: "video/mp4",
    match: (b) => bytesToUtf8(b.slice(4, 8)) === "ftyp",
  },
  {
    name: "Ogg container",
    extensions: ["ogg", "oga", "ogv"],
    mime: "application/ogg",
    match: (b) => bytesToUtf8(b.slice(0, 4)) === "OggS",
  },
  {
    name: "FLAC audio",
    extensions: ["flac"],
    mime: "audio/flac",
    match: (b) => bytesToUtf8(b.slice(0, 4)) === "fLaC",
  },
  {
    name: "SQLite database",
    extensions: ["sqlite", "db"],
    mime: "application/vnd.sqlite3",
    match: (b) => bytesToUtf8(b.slice(0, 16)) === "SQLite format 3\x00",
  },
  {
    name: "JSON document",
    extensions: ["json"],
    mime: "application/json",
    match: (b) => {
      const trimmed = bytesToUtf8(b.slice(0, 32)).trimStart();
      return trimmed.startsWith("{") || trimmed.startsWith("[");
    },
  },
];

export function sniffFileType(bytes: Uint8Array): FileTypeInfo | null {
  for (const signature of SIGNATURES) {
    if (signature.match(bytes)) {
      return {
        name: signature.name,
        extensions: signature.extensions,
        mime: signature.mime,
      };
    }
  }
  return null;
}

export interface ExifInfo {
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  orientation?: number;
  imageWidth?: number;
  imageHeight?: number;
  exposureTime?: string;
  fNumber?: number;
  iso?: number;
  focalLength?: string;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  parsedFrom: "jpeg" | "tiff";
}

const EXIF_TAGS: Record<number, string> = {
  0x010f: "make",
  0x0110: "model",
  0x0131: "software",
  0x0132: "dateTime",
  0x0112: "orientation",
  0xa002: "imageWidth",
  0xa003: "imageHeight",
  0x829a: "exposureTime",
  0x829d: "fNumber",
  0x8827: "iso",
  0x920a: "focalLength",
};

const GPS_TAGS: Record<number, string> = {
  0x0001: "gpsLatitudeRef",
  0x0002: "gpsLatitude",
  0x0003: "gpsLongitudeRef",
  0x0004: "gpsLongitude",
};

type TiffReader = {
  little: boolean;
  getU16: (o: number) => number;
  getU32: (o: number) => number;
  readAscii: (o: number, len: number) => string;
  readRational: (o: number) => number | null;
};

function readU16(bytes: Uint8Array, offset: number, little: boolean): number {
  return little
    ? bytes[offset]! | (bytes[offset + 1]! << 8)
    : (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function readU32(bytes: Uint8Array, offset: number, little: boolean): number {
  return little
    ? bytes[offset]! |
        (bytes[offset + 1]! << 8) |
        (bytes[offset + 2]! << 16) |
        (bytes[offset + 3]! << 24)
    : (bytes[offset]! << 24) |
        (bytes[offset + 1]! << 16) |
        (bytes[offset + 2]! << 8) |
        bytes[offset + 3]!;
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  const slice = bytes.slice(offset, offset + length);
  const end = slice.indexOf(0);
  return bytesToUtf8(slice.slice(0, end === -1 ? slice.length : end)).trim();
}

function rationalAt(
  bytes: Uint8Array,
  offset: number,
  little: boolean,
): number | null {
  const numerator = readU32(bytes, offset, little);
  const denominator = readU32(bytes, offset + 4, little);
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function decimalGps(
  components: (number | null)[] | null,
  ref: string | undefined,
): number | null {
  if (!components || components.length < 3) return null;
  const [deg, min, sec] = components;
  const d = deg ?? 0;
  const m = min ?? 0;
  const s = sec ?? 0;
  const value = d + m / 60 + s / 3600;
  const sign = ref === "S" || ref === "W" ? -1 : 1;
  return (Math.round(value * 1000000) / 1000000) * sign;
}

export function parseTiff(bytes: Uint8Array): ExifInfo | null {
  if (bytes.length < 8) return null;
  const little = bytesToUtf8(bytes.slice(0, 2)) === "II";
  const magic = readU16(bytes, 2, little);
  if (magic !== 0x2a) return null;
  return readIfd(bytes, readU32(bytes, 4, little), little);
}

function parseGps(
  bytes: Uint8Array,
  offset: number,
  little: boolean,
): { lat?: number | null; lon?: number | null } | null {
  if (offset <= 0 || offset + 2 > bytes.length) return null;
  const reader: TiffReader = {
    little,
    getU16: (o) => readU16(bytes, o, little),
    getU32: (o) => readU32(bytes, o, little),
    readAscii: (o, len) => asciiAt(bytes, o, len),
    readRational: (o) => rationalAt(bytes, o, little),
  };
  const count = reader.getU16(offset);
  const result: Record<string, unknown> = {};
  for (
    let i = 0;
    i < count && offset + 2 + i * 12 + 12 <= bytes.length;
    i += 1
  ) {
    const entryOffset = offset + 2 + i * 12;
    const tag = reader.getU16(entryOffset);
    const type = reader.getU16(entryOffset + 2);
    const valueCount = reader.getU32(entryOffset + 4);
    const valueField = reader.getU32(entryOffset + 8);
    const isInline =
      (type === 1 || type === 2 || type === 3) && valueCount <= 4;
    const valueOffset = isInline ? entryOffset + 8 : valueField;
    const name = GPS_TAGS[tag];
    if (!name) continue;
    if (type === 2) {
      result[name] = asciiAt(bytes, valueOffset, Math.min(valueCount, 16));
    } else if (type === 5 && valueCount >= 3) {
      result[name] =
        valueCount === 1
          ? rationalAt(bytes, valueOffset, little)
          : Array.from({ length: valueCount }, (_, k) =>
              rationalAt(bytes, valueOffset + k * 8, little),
            );
    }
  }
  const lat = decimalGps(
    result.gpsLatitude as number[] | null,
    result.gpsLatitudeRef as string | undefined,
  );
  const lon = decimalGps(
    result.gpsLongitude as number[] | null,
    result.gpsLongitudeRef as string | undefined,
  );
  if (lat === undefined && lon === undefined) return null;
  return { lat, lon };
}

function readIfd(
  bytes: Uint8Array,
  ifdOffset: number,
  little: boolean,
): ExifInfo | null {
  if (ifdOffset <= 0 || ifdOffset + 2 > bytes.length) return null;
  const result: ExifInfo = { parsedFrom: "tiff" };
  const count = readU16(bytes, ifdOffset, little);
  for (
    let i = 0;
    i < count && ifdOffset + 2 + i * 12 + 12 <= bytes.length;
    i += 1
  ) {
    const entryOffset = ifdOffset + 2 + i * 12;
    const tag = readU16(bytes, entryOffset, little);
    const type = readU16(bytes, entryOffset + 2, little);
    const valueCount = readU32(bytes, entryOffset + 4, little);
    const valueField = readU32(bytes, entryOffset + 8, little);

    if (tag === 0x8769 || tag === 0x8825) {
      if (tag === 0x8825 && type === 4 && valueCount === 1) {
        const gps = parseGps(bytes, valueField, little);
        if (gps) {
          result.gpsLatitude = gps.lat;
          result.gpsLongitude = gps.lon;
        }
      }
      continue;
    }

    const name = EXIF_TAGS[tag];
    if (!name) continue;

    const byteSize =
      type === 1 || type === 6
        ? 1
        : type === 2
          ? 1
          : type === 3
            ? 2
            : type === 4
              ? 4
              : type === 5
                ? 8
                : 0;
    const isInline = valueCount * byteSize <= 4;
    const valueOffset = isInline ? entryOffset + 8 : valueField;

    if (
      name === "make" ||
      name === "model" ||
      name === "software" ||
      name === "dateTime"
    ) {
      result[name] = asciiAt(bytes, valueOffset, Math.min(valueCount, 64));
    } else if (name === "orientation") {
      result.orientation = readU16(bytes, valueOffset, little);
    } else if (name === "imageWidth" || name === "imageHeight") {
      result[name] = readU32(bytes, valueOffset, little);
    } else if (name === "exposureTime" || name === "focalLength") {
      result[name] =
        valueCount === 1
          ? String(rationalAt(bytes, valueOffset, little) ?? 0)
          : undefined;
    } else if (name === "fNumber" || name === "iso") {
      result[name] =
        valueCount === 1
          ? (rationalAt(bytes, valueOffset, little) ??
            readU16(bytes, valueOffset, little))
          : undefined;
    }
  }
  return result;
}

export function parseExif(bytes: Uint8Array): ExifInfo | null {
  const isTiffHeader =
    bytes.length > 8 &&
    (bytesToUtf8(bytes.slice(0, 2)) === "II" ||
      bytesToUtf8(bytes.slice(0, 2)) === "MM");
  if (isTiffHeader) return parseTiff(bytes);

  // JPEG: locate the Exif APP1 segment.
  for (let i = 2; i + 12 <= bytes.length; i += 1) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xe1) {
      const length =
        (((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0)) & 0xffff;
      const exifHeader = bytesToUtf8(bytes.slice(i + 4, i + 10));
      if (exifHeader === "Exif\x00\x00" && length >= 14) {
        const tiff = parseTiff(bytes.slice(i + 10, i + 4 + length));
        if (!tiff) return null;
        return { ...tiff, parsedFrom: "jpeg" };
      }
      i += length + 2;
    }
  }
  return null;
}
