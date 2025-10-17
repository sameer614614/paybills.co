import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  const normalizeOrigin = (origin: string) => origin.trim().replace(/\/$/, '');

  const allowedOrigins = env.CLIENT_ORIGIN.split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    throw new Error('CLIENT_ORIGIN must include at least one allowed origin');
  }

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        const normalizedOrigin = normalizeOrigin(origin);

        if (allowedOrigins.includes(normalizedOrigin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', routes);
  app.use(errorHandler);

  return app;
}
