import { Router } from "express";

import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errors";
import {
  addBookmark,
  listBookmarks,
  removeBookmark,
} from "../services/bookmarks";
import { evaluateAndGrantAchievements } from "../services/achievements";

export const bookmarksRouter = Router();
bookmarksRouter.use(authenticate);

bookmarksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await listBookmarks(req.user!.id);
    res.json({ success: true, data });
  }),
);

bookmarksRouter.post(
  "/:challengeId(\\d+)",
  asyncHandler(async (req, res) => {
    const data = await addBookmark(
      req.user!.id,
      Number(req.params.challengeId),
    );
    await evaluateAndGrantAchievements(req.user!.id);
    res.json({ success: true, data });
  }),
);

bookmarksRouter.delete(
  "/:challengeId(\\d+)",
  asyncHandler(async (req, res) => {
    await removeBookmark(req.user!.id, Number(req.params.challengeId));
    res.json({ success: true, data: { deleted: true } });
  }),
);
