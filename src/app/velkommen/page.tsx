import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { OnboardingForm } from '@/components/onboarding-form';
import { getUser } from '@/lib/auth';
import { getProfile } from '@/lib/queries';
import { safeNext } from '@/lib/safe-next';

export const metadata: Metadata = { title: 'Velkommen' };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ neste?: string }> }) {
  const next = safeNext((await searchParams).neste);
  const user = await getUser();
  if (!user) redirect(`/logg-inn?neste=${encodeURIComponent(next)}`);
  if (await getProfile(user.id)) redirect(next);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Nesten ferdig</h1>
        <p className="mt-1 text-muted">Fortell oss litt om deg, så kan utleiere og leietakere se hvem de snakker med.</p>
      </div>
      <OnboardingForm next={next} defaultName={user.name} />
    </div>
  );
}
