import 'server-only';

import { db, emails } from '@/db';

/**
 * Queue an e-mail. Every message lands in the `emails` outbox (readable under
 * /admin/epost). Real delivery is wired in once an e-mail provider is connected.
 */
export async function sendEmail(to: string, subject: string, body: string) {
  await db.insert(emails).values({ id: crypto.randomUUID(), to, subject, body });
  console.log(`[email] → ${to}: ${subject}`);
}

export function siteUrl(path = ''): string {
  return `${process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'}${path}`;
}
