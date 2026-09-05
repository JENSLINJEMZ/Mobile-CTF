import type {
  ForgotPasswordResponse,
  LogoutResponse,
  ResetPasswordResponse,
} from '@ctf/shared';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from '@ctf/shared';
import { Router } from 'express';

import { env } from '../config/env';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errors';
import { createRateLimiter } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validate';
import { authService } from '../services/auth';

export const authRouter = Router();

const loginLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: env.rateLimitLogin,
  keyPrefix: 'login',
});

authRouter.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  }),
);

authRouter.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  }),
);

authRouter.post(
  '/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body.refreshToken);
    res.json({ success: true, data: result });
  }),
);

authRouter.post(
  '/logout',
  validateBody(logoutSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.logout(req.body.refreshToken);
    res.json({ success: true, data: result });
  }),
);

authRouter.post(
  '/logout-all',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await authService.logoutAll(req.user!.id);
    res.json({ success: true, data: result satisfies LogoutResponse });
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await authService.me(req.user!.id);
    res.json({ success: true, data: result });
  }),
);

authRouter.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email);
    res.json({ success: true, data: result satisfies ForgotPasswordResponse });
  }),
);

authRouter.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ success: true, data: result satisfies ResetPasswordResponse });
  }),
);