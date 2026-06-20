import 'dotenv/config';
import { config } from './config.js';
import { logger } from './logger.js';
import { createApp } from './app.js';
import * as db from './db/index.js';
{{#REDIS}}import * as cache from './cache/index.js';
{{/REDIS}}
async function main(): Promise<void> {
  await db.connect();
{{#REDIS}}  await cache.connect();
{{/REDIS}}
  const app = createApp({ db: db.db(){{#REDIS}}, cache: cache.cache{{/REDIS}} });
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, `${config.service} listening`);
  });

  // Graceful shutdown — drain in-flight requests, close DB{{#REDIS}} + Redis{{/REDIS}}.
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      logger.info({ signal }, 'Shutting down');
      server.close(() => {
        void (async (): Promise<void> => {
          try {
            await db.disconnect();
{{#REDIS}}            await cache.disconnect();
{{/REDIS}}          } catch (err) {
            logger.error({ err }, 'Error during shutdown');
          }
          process.exit(0);
        })();
      });
      // Force-exit if shutdown hangs past 10s
      setTimeout(() => process.exit(1), 10_000).unref();
    });
  }
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Fatal error during startup');
  process.exit(1);
});
