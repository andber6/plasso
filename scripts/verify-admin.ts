/**
 * Mark an existing account's e-mail as verified so it can open /admin
 * (it must also be listed in ADMIN_EMAILS).
 *
 *   bun run admin:verify andre@example.com
 */
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { user } from '../src/db/schema';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: bun run admin:verify <email>');
  process.exit(1);
}
const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const rows = await drizzle(client).update(user).set({ emailVerified: true }).where(eq(user.email, email)).returning({ id: user.id });
console.log(rows.length ? `Verified ${email}.` : `No account with ${email}. Sign up first.`);
await client.end();
