import type { FileDto, FileListResult } from "@ctf/shared";
import { FILE } from "@ctf/shared";
import { prisma } from "@ctf/database";
import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { stat, unlink, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { env } from "../config/env";
import { ApiError } from "../middleware/errors";

type FileRow = NonNullable<Awaited<ReturnType<typeof getFileRow>>>;

const ALLOWED = new Set<string>(FILE.ALLOWED_MIME_TYPES);

const STORAGE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,120}$/;

function hmac(key: string, message: string): string {
  return createHmac("sha256", key).update(message).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function assertAllowedFile(
  mimeType: string | undefined,
  sizeBytes: number,
  maxBytes: number = env.fileMaxBytes,
): void {
  if (!mimeType || !ALLOWED.has(mimeType)) {
    throw new ApiError(
      415,
      "VALIDATION_ERROR",
      `Unsupported file type${mimeType ? `: ${mimeType}` : ""}`,
    );
  }
  if (sizeBytes <= 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Empty file");
  }
  if (sizeBytes > maxBytes) {
    throw new ApiError(
      413,
      "VALIDATION_ERROR",
      `File too large (max ${Math.floor(maxBytes / (1024 * 1024))} MiB)`,
    );
  }
}

function sanitizeExt(originalName: string): string | undefined {
  const ext = extname(originalName).replace(/^\./, "");
  return ext && /^[a-zA-Z0-9]{1,8}$/.test(ext) ? ext : undefined;
}

export async function storageDir(): Promise<string> {
  await mkdir(env.fileStorageDir, { recursive: true });
  return env.fileStorageDir;
}

export async function storeUpload(input: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploaderId: number;
  uploaderUsername: string;
}): Promise<FileDto> {
  assertAllowedFile(input.mimeType, input.sizeBytes);

  const ext = sanitizeExt(input.originalName);
  const storageName = `${randomUUID()}${ext ? `.${ext}` : ""}`;
  const sha256 = createHash("sha256").update(input.buffer).digest("hex");

  const dir = await storageDir();
  const filePath = resolve(dir, storageName);
  await writeFile(filePath, input.buffer, { flag: "wx" });

  let row;
  try {
    row = await prisma.fileAsset.create({
      data: {
        uploaderId: input.uploaderId,
        originalName: input.originalName,
        storageName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        sha256,
      },
      include: { uploader: { select: { username: true } } },
    });
  } catch (err) {
    await unlink(filePath).catch(() => undefined);
    throw err;
  }
  return toDto(row, input.uploaderUsername);
}

export function signDownloadUrl(
  storageName: string,
  ttlSeconds: number = env.fileDownloadTtlSeconds,
): { url: string | null; expiresAt: string } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = hmac(env.jwtSecret, `${storageName}:${exp}`);
  return {
    url: `/api/files/${encodeURIComponent(storageName)}?exp=${exp}&sig=${sig}`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function verifyDownloadSignature(
  storageName: string,
  expSeconds: number,
  sig: string,
): boolean {
  if (!Number.isInteger(expSeconds) || expSeconds <= 0) return false;
  if (expSeconds < Math.floor(Date.now() / 1000)) return false;
  const expected = hmac(env.jwtSecret, `${storageName}:${expSeconds}`);
  return safeEqual(expected, sig);
}

export async function resolveDownloadFile(
  storageName: string,
): Promise<{ row: FileRow; path: string }> {
  if (!STORAGE_NAME_RE.test(storageName) || storageName.includes("..")) {
    throw new ApiError(404, "NOT_FOUND", "File not found");
  }
  const row = await getFileRow(storageName);
  if (!row) throw new ApiError(404, "NOT_FOUND", "File not found");

  const dir = await storageDir();
  const filePath = resolve(dir, row.storageName);
  const info = await stat(filePath).catch(() => null);
  if (!info || !info.isFile()) {
    throw new ApiError(404, "NOT_FOUND", "File not found");
  }
  return { row, path: filePath };
}

async function getFileRow(storageName: string) {
  return prisma.fileAsset.findUnique({
    where: { storageName },
    include: { uploader: { select: { username: true } } },
  });
}

export async function listFiles(input: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<FileListResult> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const where =
    typeof input.search === "string" && input.search.length > 0
      ? { originalName: { contains: input.search, mode: "insensitive" as const } }
      : {};

  const [total, rows] = await Promise.all([
    prisma.fileAsset.count({ where }),
    prisma.fileAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { uploader: { select: { username: true } } },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);
  return {
    items: rows.map((r) => toDto(r, r.uploader?.username ?? null)),
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function deleteFileAsset(id: number): Promise<void> {
  const row = await prisma.fileAsset.findUnique({ where: { id } });
  if (!row) throw new ApiError(404, "NOT_FOUND", "File not found");
  await prisma.fileAsset.delete({ where: { id } });
  const dir = await storageDir();
  await unlink(resolve(dir, row.storageName)).catch(() => undefined);
}

export async function incrementDownloadCount(id: number): Promise<void> {
  await prisma.fileAsset
    .update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    })
    .catch(() => undefined);
}

function toDto(
  row: FileRow,
  fallbackUploader: string | null,
): FileDto {
  if (!row) {
    throw new Error("Missing file row");
  }
  return {
    id: row.id,
    originalName: row.originalName,
    storageName: row.storageName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    downloadCount: row.downloadCount,
    uploaderUsername: row.uploader?.username ?? fallbackUploader,
    createdAt: row.createdAt.toISOString(),
    url: signDownloadUrl(row.storageName).url,
  };
}