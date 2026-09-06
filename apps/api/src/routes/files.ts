import { Router } from "express";
import { createReadStream } from "node:fs";

import { asyncHandler } from "../middleware/errors";
import {
  incrementDownloadCount,
  resolveDownloadFile,
  verifyDownloadSignature,
} from "../services/fileAssets";

export const filesRouter = Router();

// Public downloads via signed URLs; the signature proof-of-possession is what
// authorizes access, so no auth middleware is applied here.
filesRouter.get(
  "/:storageName",
  asyncHandler(async (req, res) => {
    const storageName = String(req.params.storageName ?? "");
    const exp = Number(req.query.exp ?? NaN);
    const sig =
      typeof req.query.sig === "string" ? req.query.sig : "";
    if (!verifyDownloadSignature(storageName, exp, sig)) {
      return res
        .status(403)
        .json({ success: false, error: { message: "Invalid or expired link" } });
    }
    const { row, path } = await resolveDownloadFile(storageName);
    res.setHeader("Content-Type", row.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(row.originalName)}`,
    );
    res.setHeader("Content-Length", String(row.sizeBytes));
    await incrementDownloadCount(row.id);
    createReadStream(path).pipe(res);
  }),
);