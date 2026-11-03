import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { NewPostForm } from '@/components/new-post-form';
import { getUser } from '@/lib/auth';
import { nextMonthStarts } from '@/lib/market/format';

export const metadata: Metadata = { title: 'Ny annonse' };

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const kind = type === 'offer' ? 'offer' : 'need';
  if (!(await getUser())) redirect(`/logg-inn?neste=${encodeURIComponent(`/ny?type=${kind}`)}`);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Ny annonse</h1>
        <p className="mt-1 text-muted">Et par minutter, så viser vi hvem som passer.</p>
      </div>
      <NewPostForm initialKind={kind} months={nextMonthStarts(8)} />
    </div>
  );
}
