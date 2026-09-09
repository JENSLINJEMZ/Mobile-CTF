export type TerminalSessionStatus =
  | "CREATING"
  | "RUNNING"
  | "CLOSED"
  | "EXPIRED"
  | "FAILED"
  | "CRASHED";

export interface TerminalSessionDto {
  id: string;
  status: TerminalSessionStatus;
  ttlSeconds: number;
  createdAt: string;
  expiresAt: string;
  closedAt: string | null;
  /** Why the session was torn down by the destructive-command guard, if any. */
  crashReason: string | null;
}

export interface CreateTerminalSessionResponse {
  session: TerminalSessionDto;
}

export interface ReassembleTerminalSessionResponse {
  session: TerminalSessionDto;
}

export interface ListTerminalSessionsResponse {
  sessions: TerminalSessionDto[];
}

export interface TerminalInputEvent {
  type: "input";
  data: string;
}

export interface TerminalOutputEvent {
  sessionId: string;
  data: string;
}

export interface TerminalExitEvent {
  sessionId: string;
  code: number | null;
}

export interface TerminalCrashEvent {
  sessionId: string;
  /** Human-readable reason surfaced by the destructive-command guard. */
  reason: string;
}
