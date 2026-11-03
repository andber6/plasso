import { redirect } from 'next/navigation';

import { getUser } from '@/lib/auth';
import { confirmLead } from '@/lib/leads';
import { getProfile } from '@/lib/queries';
import { safeNext } from '@/lib/safe-next';
import { linkAnonEvents } from '@/lib/track';

/**
 * Where a magic link lands after Better Auth has signed the user in. A lead
 * confirmation link also carries `bekreft=<postId>.<secret>`, which publishes
 * that one need. Then onboarding (first time) or on to where they were going.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const next = safeNext(params.get('neste'));
  const user = await getUser();
  if (!user) redirect('/logg-inn?feil=lenke');
  await linkAnonEvents(user.id);
  const confirm = params.get('bekreft');
  if (confirm) await confirmLead(user, confirm);
  if (!(await getProfile(user.id))) redirect(`/velkommen?neste=${encodeURIComponent(next)}`);
  redirect(next);
}
