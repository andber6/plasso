import { Mail, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PostCard } from '@/components/post-card';
import { getUser } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { formatDate, formatRelative } from '@/lib/market/format';
import { inquiriesFor, myPosts, savedPostsFor } from '@/lib/queries';

export const metadata: Metadata = { title: 'Mine annonser' };

const STATUS_LABEL: Record<string, string> = { active: 'Aktiv', paused: 'Pauset', rented: 'Utleid', hidden: 'Skjult av Plasso' };

export default async function MinePage() {
  const user = await getUser();
  if (!user) redirect('/logg-inn?neste=/mine');
  const [mine, inquiries, saved] = await Promise.all([myPosts(user.id), inquiriesFor(user.id), savedPostsFor(user.id)]);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-3xl font-bold sm:text-4xl">Mine annonser</h1>
          <Link href="/ny" className="text-sm font-semibold text-accent hover:underline">
            + Ny annonse
          </Link>
        </div>
        {mine.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((p, i) => (
              <div key={p.id} className={cn('relative', p.status !== 'active' && 'opacity-60')}>
                <span className="absolute -top-2.5 right-4 z-10 rounded-full bg-foreground px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-white">{STATUS_LABEL[p.status]}</span>
                <PostCard post={p} index={i} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">Du har ingen annonser ennå.</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Forespørsler</h2>
        {inquiries.length ? (
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {inquiries.map((q) => (
              <li key={q.id} className="flex flex-col gap-2 p-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={cn('rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider', q.direction === 'received' ? 'bg-accent text-white' : 'bg-surface-2 text-muted')}>
                    {q.direction === 'received' ? 'Mottatt' : 'Sendt'}
                  </span>
                  <span className="font-semibold">{q.kind === 'viewing' ? 'Visning' : 'Kontakt'}</span>
                  <span className="text-muted">
                    · <Link href={`/annonse/${q.post_id}`} className="hover:underline">{q.post_title}</Link>
                  </span>
                  <span className="ml-auto text-muted">{formatRelative(q.created_at)}</span>
                </div>
                <p className="font-semibold">
                  {q.direction === 'received' ? 'Fra' : 'Til'} {q.other_name}
                  {q.other_company ? <span className="font-normal text-muted"> · {q.other_company}</span> : null}
                </p>
                {q.message ? <p className="whitespace-pre-line text-[15px] text-muted">{q.message}</p> : null}
                {q.preferred_date ? <p className="text-sm">Ønsket visning: {formatDate(q.preferred_date)}</p> : null}
                <div className="flex flex-wrap gap-4 text-sm">
                  {q.other_email ? (
                    <a href={`mailto:${q.other_email}`} className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
                      <Mail className="h-4 w-4" /> {q.other_email}
                    </a>
                  ) : null}
                  {q.other_phone ? (
                    <a href={`tel:${q.other_phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
                      <Phone className="h-4 w-4" /> {q.other_phone}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Ingen forespørsler ennå.</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Lagrede</h2>
        {saved.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((p, i) => (
              <PostCard key={p.id} post={p} saved index={i} />
            ))}
          </div>
        ) : (
          <p className="text-muted">Trykk på hjertet på en annonse for å lagre den her.</p>
        )}
      </section>
    </div>
  );
}
