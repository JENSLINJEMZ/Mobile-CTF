import { createServer } from 'node:http';

import { createApp } from './app';
import { env } from './config/env';
import { shutdownDependencies } from './services/dependencies';
import { closeSocket, attachSocket } from './websocket/leaderboard';
import { logger } from './utils/logger';

const app = createApp();

const server = createServer(app);
attachSocket(server);

server.listen(env.port, env.host, () => {
  logger.info({ port: env.port, host: env.host, env: env.nodeEnv }, 'API listening');
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => {
    await closeSocket();
    await shutdownDependencies();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));