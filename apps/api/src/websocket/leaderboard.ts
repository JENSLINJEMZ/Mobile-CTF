import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, type Server } from 'socket.io';

import { setLeaderboardSolvedHandler } from '../services/events';
import { logger } from '../utils/logger';
import { authByHandshake } from './auth';
import { attachTerminalNamespace } from './terminal';

const ROOM = 'leaderboard';

let socket: Server | null = null;

export function attachSocket(
  server: HttpServer,
  options?: Partial<import('socket.io').ServerOptions>,
): Server {
  socket = new SocketIOServer(server, {
    cors: { origin: '*', credentials: true },
    ...options,
  });

  const leaderboardNamespace = socket.of('/leaderboard');
  leaderboardNamespace.use(authByHandshake);
  leaderboardNamespace.on('connection', (clientSocket) => {
    clientSocket.join(ROOM);
    logger.info(
      { sid: clientSocket.id, user: clientSocket.data.user?.id },
      'leaderboard socket connected',
    );
  });

  setLeaderboardSolvedHandler((event) => {
    leaderboardNamespace.to(ROOM).emit('leaderboard:update', event);
  });

  attachTerminalNamespace(socket);

  return socket;
}

export async function closeSocket(): Promise<void> {
  if (!socket) return;
  await new Promise<void>((resolve) => socket?.close(() => resolve()));
  socket = null;
}