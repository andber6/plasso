import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PostCard } from '@/components/post-card';
import { getUser } from '@/lib/auth';
import { matchesFor } from '@/lib/market/match';
import { activePosts, myPosts } from '@/lib/queries';

export const metadata: Metadata = { title: 'Matcher' };

export default async function MatchesPage() {
  const user = await getUser();
  if (!user) redirect('/logg-inn?neste=/matcher');
  const [mine, offers, needs] = await Promise.all([myPosts(user.id), activePosts('offer', user.id), activePosts('need', user.id)]);
  const groups = mine.filter((m) => m.status === 'active').map((m) => ({ mine: m, matches: matchesFor(m, m.kind === 'need' ? offers : needs) }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Matcher</h1>
        <p className="mt-1 text-muted">Annonser som passer det du har lagt ut, med minst 50 % samsvar. Sterke matcher får du også på e-post.</p>
      </div>
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-lg font-semibold">Ingen aktive annonser</p>
          <p className="mx-auto mt-1 max-w-md text-muted">Legg ut et leieønske eller et lokale, så finner Plasso hvem som passer.</p>
          <Link href="/ny" className="mt-5 inline-flex h-11 items-center rounded-full bg-accent px-6 font-semibold text-white hover:bg-accent-hover">
            Legg ut annonse
          </Link>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.mine.id} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
              <h2 className="text-xl font-semibold">
                <span className="mr-2 font-mono text-xs uppercase tracking-wider text-accent">{g.mine.kind === 'need' ? 'Ditt leieønske' : 'Ditt lokale'}</span>
                <Link href={`/annonse/${g.mine.id}`} className="hover:underline">
                  {g.mine.title}
                </Link>
              </h2>
              <span className="text-sm text-muted">{g.matches.length} treff</span>
            </div>
            {g.matches.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {g.matches.map((m, i) => (
                  <PostCard key={m.post.id} post={m.post} match={m.result} index={i} />
                ))}
              </div>
            ) : (
              <p className="text-muted">Ingen treff ennå. Vi sier fra når noe passer.</p>
            )}
          </section>
        ))
      )}
    </div>
  );
}
