import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth-form';
import { MagicLinkForm } from '@/components/magic-link-form';
import { getUser } from '@/lib/auth';
import { emailEnabled } from '@/lib/email';
import { safeNext } from '@/lib/safe-next';

export const metadata: Metadata = { title: 'Logg inn' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ neste?: string; inn?: string; passord?: string; feil?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.neste);
  if (await getUser()) redirect(next);
  // With e-mail delivery on, sign-in is passwordless; the password form stays
  // available for accounts created before that.
  const magic = emailEnabled() && !sp.passord;
  const withParams = (extra: string) => `/logg-inn?neste=${encodeURIComponent(next)}${extra}`;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Velkommen til Plasso</h1>
        <p className="mt-1 text-muted">Gratis for både leietakere og utleiere. Riktig lokale. Riktig match.</p>
      </div>
      {sp.feil ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">Lenken er utløpt eller allerede brukt. Be om en ny under.</p> : null}
      {magic ? <MagicLinkForm next={next} /> : <AuthForm next={next} initial={sp.inn || sp.passord ? 'inn' : 'ny'} />}
      {emailEnabled() ? (
        <Link href={magic ? withParams('&passord=1') : withParams('')} className="text-center text-sm text-muted underline-offset-2 hover:text-foreground hover:underline">
          {magic ? 'Har du passord? Logg inn med passord' : 'Logg inn med e-postlenke i stedet'}
        </Link>
      ) : null}
    </div>
  );
}
