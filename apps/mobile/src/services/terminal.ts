import type {
  CreateTerminalSessionResponse,
  ListTerminalSessionsResponse,
  TerminalSessionDto,
} from '@ctf/shared';

import { api } from './http';

export async function createTerminalSession(): Promise<TerminalSessionDto> {
  const response = await api.post<CreateTerminalSessionResponse>(
    '/terminal/sessions',
    undefined,
    { auth: true },
  );
  return response.session;
}

export async function listTerminalSessions(): Promise<TerminalSessionDto[]> {
  const response = await api.get<ListTerminalSessionsResponse>('/terminal/sessions', {
    auth: true,
  });
  return response.sessions;
}

export async function getTerminalSession(id: string): Promise<TerminalSessionDto> {
  const response = await api.get<{ session: TerminalSessionDto }>(
    `/terminal/sessions/${id}`,
    { auth: true },
  );
  return response.session;
}

export async function closeTerminalSession(id: string): Promise<TerminalSessionDto> {
  const response = await api.del<{ session: TerminalSessionDto }>(
    `/terminal/sessions/${id}`,
    { auth: true },
  );
  return response.session;
}