import { Router } from 'express';

import { Role } from '@ctf/shared';

import {
  createAnnouncementSchema,
  createChallengeSchema,
  createEventChallengeSchema,
  createEventSchema,
  createHintSchema,
  updateAnnouncementSchema,
  updateChallengeSchema,
  updateEventChallengeSchema,
  updateEventSchema,
  updateHintSchema,
} from '@ctf/shared';

import { asyncHandler } from '../middleware/errors';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from '../services/announcements';
import {
  createChallenge,
  createHint,
  deleteChallenge,
  deleteHint,
  updateChallenge,
  updateHint,
} from '../services/challenges';
import {
  addEventChallenge,
  createEvent,
  deleteEvent,
  listEvents,
  removeEventChallenge,
  updateEvent,
  updateEventChallenge,
} from '../services/events';

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireRole(Role.MODERATOR, Role.ADMIN));

adminRouter.post(
  '/challenges',
  validateBody(createChallengeSchema),
  asyncHandler(async (req, res) => {
    const data = await createChallenge(req.body, req.user!.id);
    res.status(201).json({ success: true, data });
  }),
);

adminRouter.put(
  '/challenges/:id(\\d+)',
  validateBody(updateChallengeSchema),
  asyncHandler(async (req, res) => {
    const data = await updateChallenge(Number(req.params.id), req.body, req.user!.id);
    res.json({ success: true, data });
  }),
);

adminRouter.delete(
  '/challenges/:id(\\d+)',
  asyncHandler(async (req, res) => {
    await deleteChallenge(Number(req.params.id));
    res.json({ success: true, data: { deleted: true } });
  }),
);

adminRouter.post(
  '/challenges/:id(\\d+)/hints',
  validateBody(createHintSchema),
  asyncHandler(async (req, res) => {
    const data = await createHint(Number(req.params.id), req.body);
    res.status(201).json({ success: true, data });
  }),
);

adminRouter.put(
  '/hints/:id(\\d+)',
  validateBody(updateHintSchema),
  asyncHandler(async (req, res) => {
    const data = await updateHint(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }),
);

adminRouter.delete(
  '/hints/:id(\\d+)',
  asyncHandler(async (req, res) => {
    await deleteHint(Number(req.params.id));
    res.json({ success: true, data: { deleted: true } });
  }),
);

// --- Events -------------------------------------------------------------

adminRouter.get(
  '/events',
  asyncHandler(async (req, res) => {
    const data = await listEvents('all', req.user!.id);
    res.json({ success: true, data });
  }),
);

adminRouter.post(
  '/events',
  validateBody(createEventSchema),
  asyncHandler(async (req, res) => {
    const data = await createEvent(req.body, req.user!.id);
    res.status(201).json({ success: true, data });
  }),
);

adminRouter.patch(
  '/events/:id(\\d+)',
  validateBody(updateEventSchema),
  asyncHandler(async (req, res) => {
    const data = await updateEvent(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }),
);

adminRouter.delete(
  '/events/:id(\\d+)',
  asyncHandler(async (req, res) => {
    await deleteEvent(Number(req.params.id));
    res.json({ success: true, data: { deleted: true } });
  }),
);

adminRouter.post(
  '/events/:id(\\d+)/challenges',
  validateBody(createEventChallengeSchema),
  asyncHandler(async (req, res) => {
    const data = await addEventChallenge(Number(req.params.id), req.body);
    res.status(201).json({ success: true, data });
  }),
);

adminRouter.patch(
  '/event-challenges/:id(\\d+)',
  validateBody(updateEventChallengeSchema),
  asyncHandler(async (req, res) => {
    const data = await updateEventChallenge(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }),
);

adminRouter.delete(
  '/event-challenges/:id(\\d+)',
  asyncHandler(async (req, res) => {
    await removeEventChallenge(Number(req.params.id));
    res.json({ success: true, data: { deleted: true } });
  }),
);

// --- Announcements ------------------------------------------------------

adminRouter.post(
  '/announcements',
  validateBody(createAnnouncementSchema),
  asyncHandler(async (req, res) => {
    const data = await createAnnouncement(req.body, req.user!.id);
    res.status(201).json({ success: true, data });
  }),
);

adminRouter.patch(
  '/announcements/:id(\\d+)',
  validateBody(updateAnnouncementSchema),
  asyncHandler(async (req, res) => {
    const data = await updateAnnouncement(Number(req.params.id), req.body);
    res.json({ success: true, data });
  }),
);

adminRouter.delete(
  '/announcements/:id(\\d+)',
  asyncHandler(async (req, res) => {
    await deleteAnnouncement(Number(req.params.id));
    res.json({ success: true, data: { deleted: true } });
  }),
);