import { Router } from 'express';

import {
  acceptTeamInviteSchema,
  createTeamInviteSchema,
  createTeamSchema,
  joinTeamSchema,
  updateTeamMemberRoleSchema,
} from '@ctf/shared';

import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errors';
import { optionalAuth } from '../middleware/optionalAuth';
import { validateBody } from '../middleware/validate';
import {
  acceptTeamInvite,
  createTeam,
  deleteTeam,
  getMyTeam,
  getTeam,
  inviteTeamMember,
  joinTeamByCode,
  listTeams,
  removeTeamMember,
  setTeamMemberRole,
} from '../services/teams';

export const teamsRouter = Router();

teamsRouter.use(optionalAuth);

teamsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await listTeams(
      typeof req.query.search === 'string' && req.query.search.trim().length > 0
        ? req.query.search.trim()
        : undefined,
    );
    res.json({ success: true, data });
  }),
);

teamsRouter.get(
  '/mine',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await getMyTeam(req.user!.id);
    res.json({ success: true, data });
  }),
);

teamsRouter.get(
  '/:id(\\d+)',
  asyncHandler(async (req, res) => {
    const data = await getTeam(Number(req.params.id), req.user?.id);
    res.json({ success: true, data });
  }),
);

teamsRouter.post(
  '/',
  authenticate,
  validateBody(createTeamSchema),
  asyncHandler(async (req, res) => {
    const data = await createTeam(req.user!.id, req.body);
    res.status(201).json({ success: true, data });
  }),
);

teamsRouter.post(
  '/join',
  authenticate,
  validateBody(joinTeamSchema),
  asyncHandler(async (req, res) => {
    const data = await joinTeamByCode(req.user!.id, req.body.joinCode);
    res.json({ success: true, data });
  }),
);

teamsRouter.post(
  '/invites/accept',
  authenticate,
  validateBody(acceptTeamInviteSchema),
  asyncHandler(async (req, res) => {
    const data = await acceptTeamInvite(req.user!.id, req.body.inviteCode);
    res.json({ success: true, data });
  }),
);

teamsRouter.post(
  '/:id(\\d+)/invites',
  authenticate,
  validateBody(createTeamInviteSchema),
  asyncHandler(async (req, res) => {
    const data = await inviteTeamMember(req.user!.id, Number(req.params.id), req.body.username);
    res.status(201).json({ success: true, data });
  }),
);

teamsRouter.patch(
  '/:id(\\d+)/members/:userId(\\d+)',
  authenticate,
  validateBody(updateTeamMemberRoleSchema),
  asyncHandler(async (req, res) => {
    const data = await setTeamMemberRole(
      req.user!.id,
      Number(req.params.id),
      Number(req.params.userId),
      req.body.role,
    );
    res.json({ success: true, data });
  }),
);

teamsRouter.delete(
  '/:id(\\d+)/members/:userId(\\d+)',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await removeTeamMember(
      req.user!.id,
      Number(req.params.id),
      Number(req.params.userId),
    );
    res.json({ success: true, data });
  }),
);

teamsRouter.delete(
  '/:id(\\d+)',
  authenticate,
  asyncHandler(async (req, res) => {
    await deleteTeam(req.user!.id, Number(req.params.id));
    res.json({ success: true, data: { deleted: true } });
  }),
);