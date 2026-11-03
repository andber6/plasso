import 'server-only';

import { db, emails } from '@/db';
import { SITE_URL } from '@/lib/site-url';

/**
 * Queue an e-mail. Every message lands in the `emails` outbox (readable under
 * /admin/epost). Real delivery is wired in once an e-mail provider is connected.
 */
export async function sendEmail(to: string, subject: string, body: string) {
  await db.insert(emails).values({ id: crypto.randomUUID(), to, subject, body });
  console.log(`[email] → ${to}: ${subject}`);
}

export function siteUrl(path = ''): string {
  return `${SITE_URL}${path}`;
}
