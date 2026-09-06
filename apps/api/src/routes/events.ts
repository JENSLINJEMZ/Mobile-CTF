import type { EventLeaderboardScope } from "@ctf/shared";
import { EVENT, LEADERBOARD } from "@ctf/shared";
import { Router } from "express";

import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errors";
import { optionalAuth } from "../middleware/optionalAuth";
import {
  getEventDetail,
  getEventLeaderboard,
  joinEvent,
  leaveEvent,
  listEventChallenges,
  listEvents,
  type EventListScope,
} from "../services/events";

export const eventsRouter = Router();

eventsRouter.use(optionalAuth);

function parseScope(value: unknown): EventListScope {
  return value === "upcoming" ||
    value === "running" ||
    value === "ended" ||
    value === "all"
    ? value
    : "all";
}

eventsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await listEvents(parseScope(req.query.scope), req.user?.id);
    res.json({ success: true, data });
  }),
);

eventsRouter.get(
  "/:id(\\d+)",
  asyncHandler(async (req, res) => {
    const data = await getEventDetail(Number(req.params.id), req.user?.id);
    res.json({ success: true, data });
  }),
);

eventsRouter.post(
  "/:id(\\d+)/join",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await joinEvent(req.user!.id, Number(req.params.id));
    res.json({ success: true, data: { event: data } });
  }),
);

eventsRouter.post(
  "/:id(\\d+)/leave",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await leaveEvent(req.user!.id, Number(req.params.id));
    res.json({ success: true, data: { event: data } });
  }),
);

eventsRouter.get(
  "/:id(\\d+)/leaderboard",
  authenticate,
  asyncHandler(async (req, res) => {
    const scope: EventLeaderboardScope =
      req.query.scope === "teams" ? "teams" : "participants";
    const limit = Number(req.query.limit);
    const data = await getEventLeaderboard(
      Number(req.params.id),
      scope,
      req.user!.id,
      Number.isInteger(limit) &&
        limit >= 1 &&
        limit <= EVENT.LEADERBOARD_MAX_LIMIT
        ? limit
        : LEADERBOARD.DEFAULT_LIMIT,
    );
    res.json({ success: true, data });
  }),
);

eventsRouter.get(
  "/:id(\\d+)/challenges",
  asyncHandler(async (req, res) => {
    const data = await listEventChallenges(Number(req.params.id), req.user?.id);
    res.json({ success: true, data });
  }),
);
