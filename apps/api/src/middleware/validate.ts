import type { ZodType } from 'zod';

import type { Request, RequestHandler } from 'express';

export function validateBody<T extends ZodType>(schema: T): RequestHandler {
  return (req: Request, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(parsed.error);
      return;
    }
    req.body = parsed.data;
    next();
  };
}