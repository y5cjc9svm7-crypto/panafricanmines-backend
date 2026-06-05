import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { pool } from './db/pool.js';
import config from './config.js';
import logger from './lib/logger.js';

async function main() {
  // Apply any pending migrations on boot (safe + idempotent).
  if ((process.env.RUN_MIGRATIONS_ON_BOOT || 'true') === 'true') {
    await migrate();
  }

  // Optionally seed reference data + bootstrap operator on boot (idempotent).
  // Handy for container deployments; off by default so it never runs unexpectedly.
  if ((process.env.SEED_ON_BOOT || 'false') === 'true') {
    await seed();
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`PanAfricanMines API listening on :${config.port} (${config.env})`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    // Force-exit if connections hang.
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
