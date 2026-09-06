import { Router } from "express";

import { notificationListQuerySchema } from "@ctf/shared";

import { asyncHandler } from "../middleware/errors";
import { authenticate } from "../middleware/auth";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from "../services/notifications";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, unreadOnly } = notificationListQuerySchema.parse(
      req.query,
    );
    const data = await listNotifications(req.user!.id, { page, limit, unreadOnly });
    res.json({ success: true, data });
  }),
);

notificationsRouter.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const data = await unreadNotificationCount(req.user!.id);
    res.json({ success: true, data: { count: data } });
  }),
);

notificationsRouter.post(
  "/:id(\\d+)/read",
  asyncHandler(async (req, res) => {
    const data = await markNotificationRead(
      req.user!.id,
      Number(req.params.id),
    );
    res.json({ success: true, data });
  }),
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    const data = await markAllNotificationsRead(req.user!.id);
    res.json({ success: true, data: { count: data } });
  }),
);