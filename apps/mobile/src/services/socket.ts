import type { LeaderboardSocketEvent } from "@ctf/shared";
import { io, type Socket } from "socket.io-client";

import { API_URL } from "./http";
import { getStoredTokens } from "./token-storage";

export function leaderboardEndpoint(): string {
  return `${API_URL}/leaderboard`;
}

const updateHandlers = new Set<(event: LeaderboardSocketEvent) => void>();

let socket: Socket | null = null;

async function openSocket(): Promise<void> {
  const { accessToken } = await getStoredTokens();
  if (!accessToken) return;
  if (socket?.connected) return;

  socket?.disconnect();
  socket = io(leaderboardEndpoint(), {
    transports: ["websocket"],
    auth: { token: accessToken },
  });
  socket.on("leaderboard:update", (event: LeaderboardSocketEvent) => {
    for (const handler of updateHandlers) {
      handler(event);
    }
  });
}

export async function connectLeaderboardSocket(): Promise<void> {
  await openSocket();
}

export function disconnectLeaderboardSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function subscribeLeaderboardUpdate(
  handler: (event: LeaderboardSocketEvent) => void,
): () => void {
  updateHandlers.add(handler);
  return () => {
    updateHandlers.delete(handler);
  };
}
