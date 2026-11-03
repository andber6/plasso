import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { FilterBar } from '@/components/filter-bar';
import { NeedLeadForm } from '@/components/need-lead-form';
import { PostCard } from '@/components/post-card';
import { getUser } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { SIZE_RANGES, spaceTypeLabel } from '@/lib/market/catalog';
import { nextMonthStarts } from '@/lib/market/format';
import { bestAgainstMine, hasFilters, type Filters } from '@/lib/market/match';
import { activePosts, myPosts, savedIds } from '@/lib/queries';
import { track } from '@/lib/track';

type SP = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

export default async function ExplorePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const mode = one(sp.modus) === 'utleie' ? 'utleie' : 'leie';
  const kind = mode === 'leie' ? 'offer' : 'need';
  const size = SIZE_RANGES.find((s) => s.id === one(sp.areal));
  const filters: Filters = {
    city: one(sp.by) || null,
    spaceType: one(sp.type) || null,
    sizeRange: size?.range ?? null,
    maxPrice: Number(one(sp.maks)) || null,
  };
  const q = one(sp.q).trim().toLowerCase();

  const user = await getUser();
  const [posts, mine, saved] = await Promise.all([activePosts(kind, user?.id), myPosts(user?.id), savedIds(user?.id)]);

  const filtered = hasFilters(filters);
  if (filtered || q) {
    await track('search', {
      userId: user?.id,
      data: { mode, city: filters.city, space_type: filters.spaceType, size: size?.id ?? null, max_price: filters.maxPrice, q: q || null },
    });
  }

  const visible = posts.filter((p) => {
    if (p.user_id === user?.id) return false;
    if (filters.city && p.city !== filters.city) return false;
    if (filters.spaceType && p.space_type !== filters.spaceType) return false;
    if (filters.sizeRange && (p.size_max < filters.sizeRange[0] || p.size_min > filters.sizeRange[1])) return false;
    // Tenants filter by max rent; landlords by a tenant budget of at least X.
    if (filters.maxPrice && kind === 'offer' && p.price > filters.maxPrice) return false;
    if (filters.maxPrice && kind === 'need' && p.price < filters.maxPrice) return false;
    if (!q) return true;
    const hay = `${p.title} ${p.city} ${p.district} ${p.address} ${p.company} ${spaceTypeLabel(p.space_type)} ${p.facilities.join(' ')}`.toLowerCase();
    return hay.includes(q);
  });

  // Scores only mean something against the user's own posted need/offer; the
  // filters already exclude anything that would score below 100.
  const items = visible.map((post) => ({ post, match: bestAgainstMine(post, mine)?.result ?? null }));
  if (items.some((i) => i.match)) items.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));

  // First-time visitors get the pitch and the no-signup need form above the feed.
  const intro = !user && mode === 'leie' && !filtered && !q;
  const hasOwnNeed = mine.some((p) => p.kind === (kind === 'offer' ? 'need' : 'offer') && p.status === 'active');
  const where = filters.city ? ` i ${filters.city}` : '';
  const toggleHref = (m: 'leie' | 'utleie') => {
    const next = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === 'string' && k !== 'modus' ? [[k, v]] : [])));
    if (m === 'utleie') next.set('modus', 'utleie');
    const s = next.toString();
    return s ? `/?${s}` : '/';
  };

  return (
    <div className="flex flex-col gap-6">
      {intro ? (
        <section className="grid gap-8 pb-6 pt-2 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-12">
          <div className="flex flex-col gap-5 sm:gap-6 lg:pt-6">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Markedsplass for næringslokaler</p>
            <h1 className="text-[36px] font-bold leading-[1.02] sm:text-6xl">
              Lokalet som passer,
              <br />
              <span className="text-accent">funnet for deg.</span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-muted">
              Fortell oss hva dere trenger. Plasso matcher dere med lokaler og utleiere, og forklarer nøyaktig hvorfor de passer. Gratis og uforpliktende.
            </p>
            <ol className="hidden flex-col gap-3 text-[15px] sm:flex">
              {[
                ['Si hva dere trenger', 'Type, by, størrelse, budsjett og når dere vil flytte inn.'],
                ['Se hva som passer', 'Hvert lokale får en samsvarsprosent med begrunnelse.'],
                ['Få beskjed om nye', 'Vi sier fra når et lokale som passer dukker opp.'],
              ].map(([t, b], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-xs font-semibold text-accent">{i + 1}</span>
                  <span>
                    <strong className="font-semibold">{t}.</strong> <span className="text-muted">{b}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Link href="/ny?type=offer" className="group inline-flex w-fit items-center gap-1.5 text-[15px] font-semibold text-accent">
              Leier du ut? Legg ut lokalet gratis
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div id="behov" className="relative rounded-[26px] border border-border bg-surface p-5 shadow-[0_30px_80px_-40px_rgba(14,42,71,0.45)] sm:p-7">
            <h2 className="text-xl font-bold">Fortell oss hva dere trenger</h2>
            <p className="mb-5 mt-1 text-sm text-muted">Tar under ett minutt. Ingen konto nødvendig.</p>
            <NeedLeadForm months={nextMonthStarts(8)} />
          </div>
        </section>
      ) : null}

      <section className="flex items-end justify-between gap-6 pt-2">
        <div>
          <p className="text-[15px] font-medium text-accent">
            {items.length} {kind === 'offer' ? (items.length === 1 ? 'ledig lokale' : 'ledige lokaler') : items.length === 1 ? 'leieønske' : 'leieønsker'}
            {where}
          </p>
          {intro ? (
            <h2 className="mt-1 text-[28px] font-bold leading-[1.05] sm:text-4xl">Ledige lokaler nå</h2>
          ) : (
            <h1 className="mt-1 text-[34px] font-bold leading-[1.05] sm:text-5xl">{mode === 'leie' ? 'Finn ditt neste lokale' : 'Finn din neste leietaker'}</h1>
          )}
        </div>
        <svg viewBox="0 0 64 64" className="hidden h-16 w-16 shrink-0 sm:block" aria-hidden>
          <rect x="4" y="40" width="14" height="20" fill="var(--surface-2)" />
          <rect x="24" y="10" width="16" height="50" fill="var(--accent)" />
          <rect x="46" y="26" width="12" height="34" fill="var(--surface-2)" />
        </svg>
      </section>

      <div className="grid grid-cols-2 rounded-full border border-border bg-surface-2/70 p-1">
        {(['leie', 'utleie'] as const).map((m) => (
          <Link
            key={m}
            href={toggleHref(m)}
            scroll={false}
            className={cn('rounded-full py-2.5 text-center text-[15px] font-semibold transition', mode === m ? 'bg-accent text-white shadow-sm' : 'text-foreground hover:bg-surface/60')}>
            {m === 'leie' ? 'Jeg vil leie' : 'Jeg vil leie ut'}
          </Link>
        ))}
      </div>

      <Suspense>
        <FilterBar />
      </Suspense>

      {!hasOwnNeed && !intro ? (
        <Link
          href={!user && kind === 'offer' ? '/#behov' : `/ny?type=${kind === 'offer' ? 'need' : 'offer'}`}
          className="group flex items-center gap-4 rounded-2xl border border-accent/20 bg-accent-soft px-5 py-4 transition hover:border-accent/40">
          <Sparkles className="h-5 w-5 shrink-0 text-accent" />
          <p className="text-[15px]">
            <strong className="font-semibold">{kind === 'offer' ? 'La lokalene finne deg.' : 'La leietakerne finne deg.'}</strong>{' '}
            <span className="text-muted">
              {kind === 'offer'
                ? 'Legg ut et gratis leieønske, så får hvert lokale en samsvarsprosent og du får beskjed når noe nytt passer.'
                : 'Legg ut lokalet gratis, så ser du hvilke leietakere som passer og får varsel om nye.'}
            </span>
          </p>
          <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-accent transition group-hover:translate-x-0.5" />
        </Link>
      ) : null}

      {items.length ? (
        <div className={'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'}>
          {items.map(({ post, match }, i) => (
            <PostCard key={post.id} post={post} match={match} saved={user ? saved.includes(post.id) : undefined} index={i} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="text-lg font-semibold">Ingen treff ennå</p>
          <p className="mx-auto mt-1 max-w-md text-muted">
            {kind === 'offer'
              ? 'Legg ut et leieønske med det dere trenger. Da sier vi fra så snart et lokale som passer dukker opp.'
              : 'Ingen leieønsker passer filtrene. Legg ut lokalet ditt, så varsler vi deg når en leietaker passer.'}
          </p>
        </div>
      )}
    </div>
  );
}
