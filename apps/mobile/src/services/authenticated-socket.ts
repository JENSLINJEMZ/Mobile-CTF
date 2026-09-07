import { io, type Socket } from "socket.io-client";

import { getStoredTokens } from "./token-storage";

export type AuthenticatedSocket = Socket;

/**
 * Single factory for token-authenticated Socket.IO clients. Terminal,
 * leaderboard, and notifications all connect the same way: read the stored
 * access token, open a websocket to an API sub-path, pass the token as the
 * socket auth handshake. Each caller supplies its own event handlers.
 */
export async function connectAuthenticatedSocket(
  endpoint: string,
  register: (socket: AuthenticatedSocket) => void,
): Promise<AuthenticatedSocket> {
  const { accessToken } = await getStoredTokens();
  if (!accessToken) throw new Error("Not signed in");

  const socket = io(endpoint, {
    transports: ["websocket"],
    auth: { token: accessToken },
  });
  register(socket);
  return socket;
}