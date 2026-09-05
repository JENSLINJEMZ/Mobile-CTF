export type TerminalSessionStatus = 'CREATING' | 'RUNNING' | 'CLOSED' | 'EXPIRED' | 'FAILED';

export interface TerminalSessionDto {
  id: string;
  status: TerminalSessionStatus;
  ttlSeconds: number;
  createdAt: string;
  expiresAt: string;
  closedAt: string | null;
}

export interface CreateTerminalSessionResponse {
  session: TerminalSessionDto;
}

export interface ListTerminalSessionsResponse {
  sessions: TerminalSessionDto[];
}

export interface TerminalInputEvent {
  type: 'input';
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