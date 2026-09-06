import multer from "multer";
import type { RequestHandler } from "express";

import { env } from "../config/env";
import { ApiError } from "./errors";

// In-memory upload receiver; validation happens in services/fileAssets.ts
// (MIME whitelist + byte limit) so the disk is never polluted by rejected
// uploads and randomized names are assigned after validation.
export const uploadFiles = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.fileMaxBytes,
    files: 1,
    fields: 5,
  },
});

export function uploadSingle(
  field: string,
): RequestHandler {
  const inner = uploadFiles.single(field);
  return (req, res, next) => {
    inner(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          next(
            new ApiError(
              413,
              "VALIDATION_ERROR",
              `File too large (max ${Math.floor(env.fileMaxBytes / (1024 * 1024))} MiB)`,
            ),
          );
          return;
        }
        next(new ApiError(400, "VALIDATION_ERROR", `Upload error: ${err.code}`));
        return;
      }
      next(err);
    });
  };
}