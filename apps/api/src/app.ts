import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errors';
import { requestLogger } from './middleware/requestLogger';
import { apiRouter } from './routes';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}