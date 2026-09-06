import type { Socket } from "socket.io";

import type { AuthUser } from "../middleware/auth";
import { verifyAccessToken } from "../utils/jwt";

export function authByHandshake(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  try {
    const token =
      typeof socket.handshake.auth?.token === "string"
        ? socket.handshake.auth.token
        : undefined;
    if (!token) throw new Error("missing token");
    const payload = verifyAccessToken(token);
    socket.data.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    } satisfies AuthUser;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
}
