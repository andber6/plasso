/**
 * Apply pending database migrations from ./drizzle. Runs as part of every
 * Vercel build (see `vercel-build` in package.json), before `next build`:
 * if a migration fails the build fails and the live deployment stays as it is.
 *
 *   bun run db:migrate            # locally, against .env.local
 *
 * Safety:
 * - A Postgres advisory lock serializes concurrent builds, so two deploys can't
 *   migrate at the same time.
 * - lock_timeout makes a migration fail fast instead of queueing behind live
 *   traffic and blocking the table for everyone.
 * - Uses the direct (unpooled) connection: session-level locks don't work
 *   through a transaction pooler.
 * - Preview builds are skipped unless MIGRATE_PREVIEWS=1, because previews
 *   share the production database unless Neon preview branching is enabled.
 *
 * Rules for writing migrations: see "Database migrations" in AGENTS.md.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const env = process.env.VERCEL_ENV; // production | preview | development | undefined (local / CI)
if (env === 'preview' && process.env.MIGRATE_PREVIEWS !== '1') {
  console.log('[migrate] Preview build: skipped (previews share the production database; set MIGRATE_PREVIEWS=1 once they have their own Neon branch).');
  process.exit(0);
}

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error('[migrate] DATABASE_URL is not set.');
  process.exit(1);
}

const LOCK_KEY = 727_001; // arbitrary, constant: identifies "plasso migrations"
const client = postgres(url, { max: 1, onnotice: () => {} });

try {
  const started = Date.now();
  await client`select pg_advisory_lock(${LOCK_KEY})`;
  await client`set lock_timeout = '10s'`;
  await client`set statement_timeout = '120s'`;
  const before = await applied();
  await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  const after = await applied();
  console.log(`[migrate] ${after - before} new migration(s) applied, ${after} total, in ${Date.now() - started} ms${env ? ` (${env})` : ''}.`);
} catch (err) {
  console.error('[migrate] FAILED, nothing after the failing migration was applied:', err);
  process.exitCode = 1;
} finally {
  await client`select pg_advisory_unlock(${LOCK_KEY})`.catch(() => {});
  await client.end();
}

/** Number of migrations recorded in Drizzle's journal table (0 on a fresh database). */
async function applied(): Promise<number> {
  const [row] = await client`select to_regclass('drizzle.__drizzle_migrations') as t`;
  if (!row.t) return 0;
  const [{ n }] = await client`select count(*)::int as n from drizzle.__drizzle_migrations`;
  return n;
}
