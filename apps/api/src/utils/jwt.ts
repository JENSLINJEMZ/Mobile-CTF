import type { Role } from "@ctf/shared";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { ApiError } from "../middleware/errors";

export interface AccessTokenPayload {
  sub: number;
  email: string;
  username: string;
  role: Role;
  type: "access";
}

export function signAccessToken(user: {
  id: number;
  email: string;
  username: string;
  role: Role;
}): { accessToken: string; expiresIn: number } {
  const accessToken = jwt.sign(
    {
      type: "access",
      email: user.email,
      username: user.username,
      role: user.role,
    } satisfies Omit<AccessTokenPayload, "sub">,
    env.jwtSecret,
    {
      algorithm: "HS256",
      subject: String(user.id),
      expiresIn: env.accessTtlSeconds,
    },
  );
  return { accessToken, expiresIn: env.accessTtlSeconds };
}

function toApiError(err: unknown): ApiError {
  if (err instanceof jwt.TokenExpiredError) {
    return new ApiError(401, "UNAUTHORIZED", "Token has expired");
  }
  return new ApiError(401, "UNAUTHORIZED", "Invalid or malformed token");
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    if (typeof decoded === "string" || decoded.type !== "access") {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid token type");
    }
    return {
      sub: Number(decoded.sub),
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
      type: "access",
    } as AccessTokenPayload;
  } catch (err) {
    throw toApiError(err);
  }
}
