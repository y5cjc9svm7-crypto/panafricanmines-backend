/**
 * Shared test environment bootstrap.
 *
 * By default this spins up a throwaway, in-process PostgreSQL instance using
 * `embedded-postgres`, so `npm test` works with zero external setup.
 *
 * If you would rather run the suite against an existing database (e.g. in CI
 * with a Postgres service container), set TEST_DATABASE_URL and the embedded
 * server is skipped:
 *
 *   TEST_DATABASE_URL=postgres://user:pass@localhost:5432/pam_test npm test
 *
 * The target database is migrated and seeded fresh; do NOT point it at data you
 * care about.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EMBEDDED_PORT = Number(process.env.TEST_PG_PORT || 55433);

let embedded = null;

/**
 * Prepare process.env so that the backend's config.js (which reads env at
 * import time) picks up the test database and deterministic seed settings.
 * Must run BEFORE any backend module is imported.
 */
export async function prepareEnv() {
  if (!process.env.TEST_DATABASE_URL) {
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    const dir = mkdtempSync(join(tmpdir(), 'pam-pgtest-'));
    embedded = new EmbeddedPostgres({
      databaseDir: dir,
      user: 'pam',
      password: 'pam',
      port: EMBEDDED_PORT,
      persistent: false,
      // Allows the cluster to run when the test process is root (CI/containers).
      createPostgresUser: true,
    });
    await embedded.initialise();
    await embedded.start();
    await embedded.createDatabase('panafricanmines_test');
    process.env.DATABASE_URL = `postgres://pam:pam@localhost:${EMBEDDED_PORT}/panafricanmines_test`;
    process.env.PGSSLMODE = 'disable';
  } else {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }

  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
  process.env.SEED_SAMPLE_LISTINGS = 'true';
  process.env.SEED_OPERATOR_EMAIL = 'ops@test.local';
  process.env.SEED_OPERATOR_PASSWORD = 'opsPassw0rd!';
  process.env.SMTP_HOST = '';
  process.env.CORS_ORIGIN = '*';
  process.env.RUN_MIGRATIONS_ON_BOOT = 'false';
  process.env.LOG_LEVEL = 'silent';
}

/**
 * Migrate + seed the database and start the HTTP app on an ephemeral port.
 * Returns { baseUrl, teardown }.
 */
export async function startServer() {
  const { seed } = await import('../src/db/seed.js');
  await seed();

  const { createApp } = await import('../src/app.js');
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  async function teardown() {
    await new Promise((resolve) => server.close(resolve));
    const { pool } = await import('../src/db/pool.js');
    await pool.end().catch(() => {});
    if (embedded) await embedded.stop().catch(() => {});
  }

  return { baseUrl, teardown };
}
