import type { RequestHandler } from 'express';

import { verifyAccessToken } from '../utils/jwt';

export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token) {
    next();
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, username: payload.username, role: payload.role };
  } catch {
    // Ignore malformed/expired tokens on public endpoints; user stays anonymous.
  }
  next();
};