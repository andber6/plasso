import { ArrowLeft, Building2 } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { publishPendingNeed, toggleSave } from '@/app/actions';
import { InquiryForm } from '@/components/inquiry-form';
import { MatchReasons } from '@/components/match-reasons';
import { MatchRing } from '@/components/match-ring';
import { OwnerControls } from '@/components/owner-controls';
import { PostCard } from '@/components/post-card';
import { PostMenu } from '@/components/post-menu';
import { getUser, isAdmin } from '@/lib/auth';
import { photoUrl, spaceTypeLabel } from '@/lib/market/catalog';
import { formatDate, formatLease, formatNumber, formatSize, nextWeekdays, perM2Year } from '@/lib/market/format';
import { bestAgainstMine, matchesFor } from '@/lib/market/match';
import { blockedIds, getPost, myPosts, oppositePosts, savedIds } from '@/lib/queries';
import { track } from '@/lib/track';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = await getPost((await params).id);
  return post ? { title: post.title, description: post.description.slice(0, 160) } : {};
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-surface-2/60 px-4 py-3">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export default async function PostPage({ params }: { params: Params }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  const user = await getUser();
  const mine = post.user_id === user?.id;
  // Admins can open unpublished posts (e.g. unconfirmed leads from /admin) read-only.
  const adminPreview = !mine && post.status !== 'active' && isAdmin(user);
  if (!mine && !adminPreview && post.status !== 'active') notFound();
  if (!mine && !adminPreview && (await blockedIds(user?.id)).includes(post.user_id)) notFound();
  const isOffer = post.kind === 'offer';

  const [own, saved] = await Promise.all([myPosts(user?.id), savedIds(user?.id)]);
  if (!mine && !adminPreview) await track('view', { userId: user?.id, postId: post.id, data: { kind: post.kind, city: post.city, space_type: post.space_type } });

  const best = mine ? null : bestAgainstMine(post, own);
  const ownMatches = mine ? matchesFor(post, await oppositePosts(post.kind, post.user_id)) : [];
  const sqm = perM2Year(post);
  const who = post.company || post.contact_name;

  return (
    <div className="flex flex-col gap-8">
      <Link href={isOffer ? '/' : '/?modus=utleie'} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tilbake
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-6">
          {isOffer ? (
            <div className="relative aspect-[16/10] overflow-hidden rounded-[26px] bg-surface-2">
              <Image src={photoUrl(post.image, post.space_type)} alt={post.title} fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
            </div>
          ) : null}
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
              {isOffer ? 'Til leie' : 'Leieønske'} · {spaceTypeLabel(post.space_type)} · {post.district ? `${post.district}, ` : ''}
              {post.city}
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">{post.title}</h1>
            {post.address ? <p className="mt-1 text-muted">{post.address}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact value={`${formatSize(post)} m²`} label={isOffer ? 'Areal' : 'Trenger'} />
            <Fact value={formatNumber(post.price)} label={isOffer ? 'kr/mnd' : 'maks kr/mnd'} />
            <Fact value={formatDate(post.available_from)} label={isOffer ? 'Ledig fra' : 'Innflytting'} />
            <Fact value={formatLease(post.lease_months)} label="Leietid" />
          </div>
          {isOffer && sqm ? <p className="-mt-3 font-mono text-xs text-muted">Tilsvarer ca. {formatNumber(sqm)} kr per m² per år</p> : null}
          {post.description ? <p className="whitespace-pre-line text-[17px] leading-relaxed">{post.description}</p> : null}
          {post.facilities.length ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold">{isOffer ? 'Fasiliteter' : 'Må ha'}</h2>
              <div className="flex flex-wrap gap-2">
                {post.facilities.map((f) => (
                  <span key={f} className="rounded-full border border-border bg-surface px-3 py-1 text-sm">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">{who}</p>
              <p className="text-sm text-muted">{post.company && post.contact_name ? post.contact_name : isOffer ? 'Utleier' : 'Leietaker'} · kontaktinfo deles når du sender en forespørsel</p>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          {adminPreview ? (
            <div className="flex flex-col gap-3 rounded-[22px] border border-warning/30 bg-warning/10 p-5">
              <h2 className="text-lg font-semibold">{post.status === 'pending' ? 'Ubekreftet leieønske' : 'Ikke publisert'}</h2>
              <p className="text-sm text-muted">
                {post.status === 'pending'
                  ? 'Sendt inn fra forsiden. Personen har ikke bekreftet e-posten ennå, så bare Plasso-teamet ser dette.'
                  : `Status: ${post.status}. Bare du som admin ser denne siden.`}
              </p>
              {post.status === 'pending' ? (
                <form action={publishPendingNeed.bind(null, post.id)}>
                  <button className="h-10 w-full rounded-full bg-accent text-sm font-semibold text-white hover:bg-accent-hover">Publiser leieønsket</button>
                </form>
              ) : null}
            </div>
          ) : mine ? (
            <OwnerControls id={post.id} status={post.status as 'active' | 'paused' | 'rented' | 'hidden' | 'pending'} />
          ) : (
            <>
              {best ? (
                <div className="rounded-[22px] border border-border bg-surface p-5">
                  <div className="flex items-center gap-4">
                    <MatchRing score={best.result.score} size={96} stroke={8} />
                    <div>
                      <p className="text-lg font-semibold">{best.result.label}</p>
                      <p className="text-sm text-muted">
                        Mot ditt {best.against.kind === 'need' ? 'leieønske' : 'lokale'}: {best.against.title}
                      </p>
                    </div>
                  </div>
                  <MatchReasons reasons={best.result.reasons} className="mt-4 border-t border-border pt-4" />
                </div>
              ) : (
                <Link href={`/ny?type=${isOffer ? 'need' : 'offer'}`} className="rounded-[22px] border border-dashed border-accent/30 bg-accent-soft/60 p-5 text-[15px] transition hover:border-accent/60">
                  <strong className="font-semibold">Passer dette for dere?</strong>{' '}
                  <span className="text-muted">{isOffer ? 'Legg ut et leieønske, så viser vi samsvarsprosent og begrunnelse på hvert lokale.' : 'Legg ut lokalet ditt, så ser du hvor godt det passer denne leietakeren.'}</span>
                </Link>
              )}

              <div className="rounded-[22px] border border-border bg-surface p-5">
                <h2 className="mb-4 text-lg font-semibold">{isOffer ? 'Interessert?' : 'Har du et lokale som passer?'}</h2>
                {user ? (
                  <InquiryForm
                    postId={post.id}
                    fromPostId={best?.against.id ?? null}
                    isOffer={isOffer}
                    days={nextWeekdays(6)}
                    defaultMessage={isOffer ? `Hei! Vi er interessert i lokalet «${post.title}». Kan vi avtale en visning?` : `Hei! Jeg har et lokale som kan passe for dere. Vil dere se det?`}
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted">Lag en gratis konto for å be om visning eller ta kontakt. Det tar under ett minutt.</p>
                    <Link href={`/logg-inn?neste=/annonse/${post.id}`} className="flex h-12 items-center justify-center rounded-full bg-accent font-semibold text-white transition hover:bg-accent-hover">
                      {isOffer ? 'Be om visning' : 'Ta kontakt'}
                    </Link>
                  </div>
                )}
                {user ? (
                  <form action={toggleSave.bind(null, post.id)} className="mt-3">
                    <button className="w-full rounded-full border border-border py-2.5 text-sm font-medium transition hover:border-accent/40">{saved.includes(post.id) ? 'Lagret ♥' : 'Lagre annonsen'}</button>
                  </form>
                ) : null}
              </div>
              {user ? <PostMenu postId={post.id} ownerId={post.user_id} ownerName={who} /> : null}
            </>
          )}
        </aside>
      </div>

      {mine ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">
            {ownMatches.length ? `${ownMatches.length} ${isOffer ? (ownMatches.length === 1 ? 'leietaker passer' : 'leietakere passer') : ownMatches.length === 1 ? 'lokale passer' : 'lokaler passer'}` : 'Ingen matcher ennå'}
          </h2>
          {ownMatches.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {ownMatches.map((m, i) => (
                <PostCard key={m.post.id} post={m.post} match={m.result} index={i} />
              ))}
            </div>
          ) : (
            <p className="text-muted">Vi sender deg en e-post så snart noe som passer dukker opp.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
