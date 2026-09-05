import { Router } from 'express';

import { Role } from '@ctf/shared';

import {
  createChallengeSchema,
  createHintSchema,
  updateChallengeSchema,
  updateHintSchema,
} from '@ctf/shared';

import { asyncHandler } from '../middleware/errors';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createChallenge,
  createHint,
  deleteChallenge,
  deleteHint,
  updateChallenge,
  updateHint,
} from '../services/challenges';

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