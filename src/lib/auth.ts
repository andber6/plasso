import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { magicLink } from 'better-auth/plugins';
import { headers } from 'next/headers';
import { cache } from 'react';

import { account, db, session, user, verification } from '@/db';
import { sendEmail } from '@/lib/email';
import { SITE_URL, TRUSTED_ORIGINS } from '@/lib/site-url';

export const auth = betterAuth({
  baseURL: SITE_URL,
  trustedOrigins: TRUSTED_ORIGINS,
  database: drizzleAdapter(db, { provider: 'pg', schema: { user, session, account, verification } }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  session: { expiresIn: 60 * 60 * 24 * 60 },
  plugins: [
    // Passwordless sign-in. Clicking the link also marks the e-mail as verified.
    magicLink({
      expiresIn: 60 * 60,
      storeToken: 'hashed',
      async sendMagicLink({ email, url, metadata }) {
        const lead = metadata?.purpose === 'lead';
        await sendEmail(
          email,
          lead ? 'Bekreft leieønsket ditt på Plasso' : 'Logg inn på Plasso',
          lead
            ? `Takk for at du fortalte oss hva dere trenger.\n\nKlikk på knappen for å bekrefte e-posten din. Da blir leieønsket synlig for utleiere, og du ser lokalene som passer. Lenken virker i én time.`
            : `Klikk på knappen for å logge inn. Lenken virker i én time og kan bare brukes én gang.\n\nHar du ikke bedt om dette, kan du se bort fra e-posten.`,
          {
            button: { label: lead ? 'Bekreft og se matchene' : 'Logg inn', url },
            outboxBody: lead ? 'Bekreftelseslenke for leieønske (skjult)' : 'Innloggingslenke (skjult)',
          },
        );
      },
    }),
    nextCookies(),
  ],
});

/** The signed-in user for this request, or null. Cached per request. */
export const getUser = cache(async () => {
  const s = await auth.api.getSession({ headers: await headers() });
  return s?.user ?? null;
});

/**
 * Admin = listed in ADMIN_EMAILS *and* the address is verified. Signing in with a
 * magic link verifies it; password accounts can be verified with
 * `bun run admin:verify <email>`. Without this check anyone could register an
 * admin address that hasn't signed up yet.
 */
export function isAdmin(user: { email: string; emailVerified: boolean } | null | undefined): boolean {
  if (!user?.emailVerified) return false;
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(user.email.toLowerCase());
}
