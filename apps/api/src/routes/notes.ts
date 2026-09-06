import { Router } from "express";

import { noteSyncSchema, noteUpsertSchema } from "@ctf/shared";

import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errors";
import { validateBody } from "../middleware/validate";
import {
  deleteNote,
  listNotes,
  syncNotes,
  upsertNote,
} from "../services/notes";

export const notesRouter = Router();
notesRouter.use(authenticate);

notesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await listNotes(req.user!.id);
    res.json({ success: true, data });
  }),
);

notesRouter.post(
  "/sync",
  validateBody(noteSyncSchema),
  asyncHandler(async (req, res) => {
    const data = await syncNotes(req.user!.id, req.body.items);
    res.json({ success: true, data });
  }),
);

notesRouter.post(
  "/:clientKey",
  validateBody(noteUpsertSchema),
  asyncHandler(async (req, res) => {
    const data = await upsertNote(req.user!.id, req.body);
    res.json({ success: true, data });
  }),
);

notesRouter.delete(
  "/:clientKey",
  asyncHandler(async (req, res) => {
    await deleteNote(req.user!.id, req.params.clientKey!);
    res.json({ success: true, data: { deleted: true } });
  }),
);
