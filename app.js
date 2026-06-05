import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import config from './config.js';
import logger from './lib/logger.js';
import apiV1 from './routes/index.js';
import health from './routes/health.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // Behind a load balancer / reverse proxy (Heroku, Render, Nginx, etc.)
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(compression());

  // CORS — the site origin(s) listed in CORS_ORIGIN may call the API.
  const allowAll = config.corsOrigin.includes('*');
  app.use(
    cors({
      origin: allowAll ? true : config.corsOrigin,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    })
  );

  // Signature PNGs can be a few hundred KB; allow generous JSON bodies.
  app.use(express.json({ limit: '3mb' }));

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/healthz' },
      redact: ['req.headers.authorization'],
    })
  );

  app.use('/', health);
  app.use('/api/v1', apiV1);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
