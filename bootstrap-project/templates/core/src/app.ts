import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import type { Db } from 'mongodb';
import type { Redis } from 'ioredis';

import { logger } from './logger.js';
import { openapiSpec } from './openapi.js';

import { requestId } from './middleware/request-id.js';
import { apiVersion } from './middleware/api-version.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';

import { router as rootRouter } from './routes/index.js';

export interface AppDeps {
  db: Db;
  cache: Redis;
}

/**
 * Builds the Express app WITHOUT calling listen(). Kept separate from index.ts
 * so supertest can import this directly for integration tests.
 */
export function createApp(deps: AppDeps): Application {
  const app = express();

  // Trust X-Forwarded-* headers when behind nginx
  app.set('trust proxy', true);

  // Expose deps on app.locals so handlers/middleware can reach them without globals
  app.locals.db = deps.db;
  app.locals.cache = deps.cache;

  // Security + parsing
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Observability
  app.use(requestId);
  app.use((req, _res, next) => {
    logger.info({ requestId: req.requestId, method: req.method, url: req.url }, 'request');
    next();
  });

  // API version header — applies to everything under root for now
  app.use(apiVersion);

  // OpenAPI spec + Swagger UI
  app.get('/api-docs.json', (_req, res) => {
    res.json(openapiSpec);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

  // Routes (health at /, future {{API_BASE}} routers mounted here)
  app.use('/', rootRouter);

  // 404 + error handler — must be LAST
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
