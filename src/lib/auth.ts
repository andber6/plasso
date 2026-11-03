import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { headers } from 'next/headers';
import { cache } from 'react';

import { account, db, session, user, verification } from '@/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema: { user, session, account, verification } }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  session: { expiresIn: 60 * 60 * 24 * 60 },
  plugins: [nextCookies()],
});

/** The signed-in user for this request, or null. Cached per request. */
export const getUser = cache(async () => {
  const s = await auth.api.getSession({ headers: await headers() });
  return s?.user ?? null;
});

/**
 * Admin = listed in ADMIN_EMAILS *and* the address is verified. Sign-up doesn't
 * verify e-mail yet, so without the second check anyone could register an admin
 * address that hasn't signed up. Verify an admin with `bun run admin:verify <email>`.
 */
export function isAdmin(user: { email: string; emailVerified: boolean } | null | undefined): boolean {
  if (!user?.emailVerified) return false;
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(user.email.toLowerCase());
}
