import { Router } from 'express';

import { asyncHandler } from '../middleware/errors';
import { optionalAuth } from '../middleware/optionalAuth';
import { listAnnouncements } from '../services/announcements';

export const announcementsRouter = Router();

announcementsRouter.use(optionalAuth);

announcementsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit);
    const data = await listAnnouncements(
      Number.isInteger(limit) && limit >= 1 ? limit : 10,
    );
    res.json({ success: true, data });
  }),
);