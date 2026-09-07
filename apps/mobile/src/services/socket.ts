import type { LeaderboardSocketEvent } from "@ctf/shared";
import type { Socket } from "socket.io-client";

import { API_URL } from "./http";
import { connectAuthenticatedSocket } from "./authenticated-socket";

export function leaderboardEndpoint(): string {
  return `${API_URL}/leaderboard`;
}

const updateHandlers = new Set<(event: LeaderboardSocketEvent) => void>();

let socket: Socket | null = null;

async function openSocket(): Promise<void> {
  if (socket?.connected) return;
  socket?.disconnect();
  socket = await connectAuthenticatedSocket(leaderboardEndpoint(), (s) => {
    s.on("leaderboard:update", (event: LeaderboardSocketEvent) => {
      for (const handler of updateHandlers) handler(event);
    });
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