import type { LeaderboardSocketEvent } from "@ctf/shared";

type LeaderboardSolvedHandler = (event: LeaderboardSocketEvent) => void;

let leaderboardSolvedHandler: LeaderboardSolvedHandler | null = null;

export function setLeaderboardSolvedHandler(
  handler: LeaderboardSolvedHandler,
): void {
  leaderboardSolvedHandler = handler;
}

export function emitLeaderboardSolved(event: LeaderboardSocketEvent): void {
  leaderboardSolvedHandler?.(event);
}
