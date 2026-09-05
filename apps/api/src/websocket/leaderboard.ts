import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, type Server, type Socket } from 'socket.io';

import type { AuthUser } from '../middleware/auth';
import { setLeaderboardSolvedHandler } from '../services/events';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';

const ROOM = 'leaderboard';

let socket: Server | null = null;

function authByHandshake(socket: Socket, next: (err?: Error) => void): void {
  try {
    const token =
      typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : undefined;
    if (!token) throw new Error('missing token');
    const payload = verifyAccessToken(token);
    socket.data.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    } satisfies AuthUser;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
}

export function attachSocket(server: HttpServer, options?: Partial<import('socket.io').ServerOptions>): Server {
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

  return socket;
}

export async function closeSocket(): Promise<void> {
  if (!socket) return;
  await new Promise<void>((resolve) => socket?.close(() => resolve()));
  socket = null;
}