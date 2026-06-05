import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
import logger from '../lib/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
      logger.info(`Applying migration: ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ err }, `Migration failed: ${file}`);
        throw err;
      }
    }
    logger.info('Migrations up to date.');
  } finally {
    client.release();
  }
}

// Allow running directly:  npm run migrate
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'Migration error');
      process.exit(1);
    });
}
