import { redirect } from 'next/navigation';

import { getUser } from '@/lib/auth';
import { activatePendingPosts } from '@/lib/pending';
import { getProfile } from '@/lib/queries';
import { safeNext } from '@/lib/safe-next';
import { linkAnonEvents } from '@/lib/track';

/**
 * Where a magic link lands after Better Auth has signed the user in: activate
 * any needs they sent in before confirming, then onboarding (first time) or on
 * to where they were going.
 */
export async function GET(request: Request) {
  const next = safeNext(new URL(request.url).searchParams.get('neste'));
  const user = await getUser();
  if (!user) redirect('/logg-inn?feil=lenke');
  await linkAnonEvents(user.id);
  await activatePendingPosts(user.id);
  if (!(await getProfile(user.id))) redirect(`/velkommen?neste=${encodeURIComponent(next)}`);
  redirect(next);
}
