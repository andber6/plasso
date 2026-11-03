import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AuthForm } from '@/components/auth-form';
import { getUser } from '@/lib/auth';
import { safeNext } from '@/lib/safe-next';

export const metadata: Metadata = { title: 'Logg inn' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ neste?: string; inn?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.neste);
  if (await getUser()) redirect(next);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Velkommen til Plasso</h1>
        <p className="mt-1 text-muted">Gratis for både leietakere og utleiere. Riktig lokale. Riktig match.</p>
      </div>
      <AuthForm next={next} initial={sp.inn ? 'inn' : 'ny'} />
    </div>
  );
}
