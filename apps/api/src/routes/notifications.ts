import { Router } from "express";

import {
  notificationListQuerySchema,
  registerPushTokenSchema,
  unregisterPushTokenSchema,
} from "@ctf/shared";

import { asyncHandler } from "../middleware/errors";
import { authenticate } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from "../services/notifications";
import {
  listPushTokens,
  registerPushToken,
  unregisterPushToken,
} from "../services/push";

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

notificationsRouter.post(
  "/push-token",
  validateBody(registerPushTokenSchema),
  asyncHandler(async (req, res) => {
    const data = await registerPushToken(
      req.user!.id,
      req.body.token,
      req.body.platform,
    );
    res.status(201).json({ success: true, data });
  }),
);

notificationsRouter.get(
  "/push-tokens",
  asyncHandler(async (req, res) => {
    const data = await listPushTokens(req.user!.id);
    res.json({ success: true, data: { items: data } });
  }),
);

notificationsRouter.delete(
  "/push-token",
  validateBody(unregisterPushTokenSchema),
  asyncHandler(async (req, res) => {
    await unregisterPushToken(req.user!.id, req.body.token);
    res.json({ success: true, data: { unregistered: true } });
  }),
);