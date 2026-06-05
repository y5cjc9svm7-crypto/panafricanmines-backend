import pg from 'pg';
import config from '../config.js';
import logger from '../lib/logger.js';

const { Pool } = pg;

if (!config.db.connectionString) {
  logger.warn('DATABASE_URL is not set — database operations will fail.');
}

export const pool = new Pool({
  connectionString: config.db.connectionString,
  ssl: config.db.ssl,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => logger.error({ err }, 'Unexpected idle PG client error'));

export function query(text, params) {
  return pool.query(text, params);
}

// Run a set of statements inside a single transaction.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
