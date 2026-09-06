import { Router } from "express";

import { optionalAuth } from "../middleware/optionalAuth";
import { asyncHandler } from "../middleware/errors";
import { getAchievements } from "../services/achievements";

export const achievementsRouter = Router();
achievementsRouter.use(optionalAuth);

achievementsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getAchievements(req.user?.id);
    res.json({ success: true, data });
  }),
);
