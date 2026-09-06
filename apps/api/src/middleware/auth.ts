import type { Permission } from "@ctf/shared";
import type { Role } from "@ctf/shared";
import { roleHasPermission } from "@ctf/shared";
import type { Request, RequestHandler } from "express";

import { ApiError } from "./errors";
import { verifyAccessToken } from "../utils/jwt";

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export function authenticate(
  req: Request,
  _res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : undefined;
  if (!token) {
    next(new ApiError(401, "UNAUTHORIZED", "Missing bearer token"));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;
    if (!user) {
      next(new ApiError(401, "UNAUTHORIZED", "Authentication required"));
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      next(
        new ApiError(
          403,
          "FORBIDDEN",
          `Requires role: ${allowedRoles.join(" | ")}`,
        ),
      );
      return;
    }
    next();
  };
}

export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;
    if (!user) {
      next(new ApiError(401, "UNAUTHORIZED", "Authentication required"));
      return;
    }
    if (!roleHasPermission(user.role, permission)) {
      next(
        new ApiError(
          403,
          "FORBIDDEN",
          `Requires permission: ${permission}`,
        ),
      );
      return;
    }
    next();
  };
}
