import { Router } from 'express';
import { ping as dbPing } from '../db/index.js';
{{#REDIS}}import { ping as cachePing } from '../cache/index.js';
{{/REDIS}}
export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   servers:
 *     - url: /
 *       description: Server root (health lives outside the {{API_BASE}} base)
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     description: Process is alive. Does not check downstream dependencies. No auth required.
 *     security: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 */
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * @openapi
 * /health/ready:
 *   servers:
 *     - url: /
 *       description: Server root (health lives outside the {{API_BASE}} base)
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe
 *     description: Checks DB{{#REDIS}} + Redis{{/REDIS}} connectivity. Returns 503 if any dependency is down. No auth required.
 *     security: []
 *     responses:
 *       200:
 *         description: Ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ready }
 *                 db: { type: string, example: ok }
{{#REDIS}} *                 redis: { type: string, example: ok }
{{/REDIS}} *       503:
 *         description: Dependency unavailable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: degraded }
 *                 db: { type: string, example: down }
{{#REDIS}} *                 redis: { type: string, example: ok }
{{/REDIS}} */
healthRouter.get('/health/ready', (_req, res, next) => {
  (async (): Promise<void> => {
    const [dbOk{{#REDIS}}, redisOk{{/REDIS}}] = await Promise.all([dbPing(){{#REDIS}}, cachePing(){{/REDIS}}]);
    const ready = dbOk{{#REDIS}} && redisOk{{/REDIS}};
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'degraded',
      db: dbOk ? 'ok' : 'down',
{{#REDIS}}      redis: redisOk ? 'ok' : 'down',
{{/REDIS}}    });
  })().catch(next);
});
