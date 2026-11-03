import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { MatchRing } from '@/components/match-ring';
import { PostCard } from '@/components/post-card';
import { getUser } from '@/lib/auth';
import { matchesFor } from '@/lib/market/match';
import { getPost, oppositePosts } from '@/lib/queries';

/** The signature moment from the Newly design: the best score draws in, then the top matches rise. */
export default async function MatchRevealPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) redirect('/logg-inn');
  const post = await getPost((await params).id);
  if (!post || post.user_id !== user.id) notFound();

  const matches = matchesFor(post, await oppositePosts(post.kind, user.id));
  const top = matches[0]?.result.score ?? 0;
  const n = matches.length;
  const headline = top >= 80 ? 'Sterk match funnet' : top > 0 ? 'Vi fant matcher' : 'Annonsen er publisert';
  const sub = n
    ? `${n} ${post.kind === 'need' ? (n === 1 ? 'lokale passer' : 'lokaler passer') : n === 1 ? 'leietaker passer' : 'leietakere passer'} med minst 50 % samsvar.`
    : 'Ingen passer godt ennå. Vi sender deg en e-post så snart noe dukker opp.';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-4">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative">
          <MatchRing score={top} size={176} stroke={12} delay={250} label={false} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold tabular-nums">{top}%</span>
            <span className="text-sm text-muted">beste samsvar</span>
          </div>
        </div>
        <div className="rise" style={{ animationDelay: '900ms' }}>
          <h1 className="text-3xl font-bold sm:text-4xl">{headline}</h1>
          <p className="mt-2 text-muted">{sub}</p>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {matches.slice(0, 4).map((m, i) => (
          <div key={m.post.id} className="rise" style={{ animationDelay: `${1100 + i * 120}ms` }}>
            <PostCard post={m.post} match={m.result} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/matcher" className="flex h-12 items-center justify-center rounded-full bg-accent px-8 font-semibold text-white hover:bg-accent-hover">
          Se alle matcher
        </Link>
        <Link href={`/annonse/${post.id}`} className="flex h-12 items-center justify-center rounded-full px-8 font-semibold text-muted hover:text-foreground">
          Se annonsen din
        </Link>
      </div>
    </div>
  );
}
