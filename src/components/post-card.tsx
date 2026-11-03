import { ArrowRight, CalendarDays, Heart, Target } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { toggleSave } from '@/app/actions';
import type { PostRow } from '@/db/schema';
import { cn } from '@/lib/cn';
import { photoUrl, spaceTypeLabel } from '@/lib/market/catalog';
import { formatDate, formatNumber, formatSize, perM2Year } from '@/lib/market/format';
import type { MatchResult } from '@/lib/market/match';

export function MatchBadge({ match, className }: { match: MatchResult; className?: string }) {
  const strong = match.score >= 70;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold shadow-sm',
        strong ? 'bg-accent text-white' : match.score >= 50 ? 'bg-surface text-foreground' : 'bg-surface/90 text-muted',
        className,
      )}>
      <Target className="h-3.5 w-3.5" strokeWidth={2.4} />
      {match.label} {match.score} %
    </span>
  );
}

function SaveButton({ postId, saved }: { postId: string; saved: boolean }) {
  return (
    <form action={toggleSave.bind(null, postId)} className="absolute right-3 top-3 z-10">
      <button
        aria-label={saved ? 'Fjern fra lagrede' : 'Lagre annonse'}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-sm backdrop-blur transition hover:scale-105">
        <Heart className={cn('h-[18px] w-[18px]', saved && 'fill-danger text-danger')} />
      </button>
    </form>
  );
}

/** Photo-led listing card (an offer), as in the Fjord og betong mockup. */
export function OfferCard({ post, match, saved, index = 0 }: { post: PostRow; match?: MatchResult | null; saved?: boolean; index?: number }) {
  const sqm = perM2Year(post);
  return (
    <div className="rise relative" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      {saved !== undefined ? <SaveButton postId={post.id} saved={saved} /> : null}
      <Link href={`/annonse/${post.id}`} className="group block overflow-hidden rounded-[22px] border border-border bg-surface shadow-[0_1px_2px_rgba(14,42,71,0.04)] transition hover:shadow-[0_18px_40px_-20px_rgba(14,42,71,0.35)]">
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
          <Image src={photoUrl(post.image, post.space_type)} alt={post.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
          {match ? <MatchBadge match={match} className="absolute left-3 top-3" /> : null}
        </div>
        <div className="px-5 pb-5 pt-4">
          <p className="truncate text-[14px] text-muted">
            {post.address ? `${post.address}, ` : post.district ? `${post.district}, ` : ''}
            {post.city}
          </p>
          <div className="mt-1 flex items-end gap-3.5">
            <p className={cn('whitespace-nowrap font-bold leading-none tracking-tight tabular-nums', post.size_max > post.size_min ? 'text-[24px]' : 'text-[30px]')}>
              {formatSize(post)}
              <span className="ml-1 text-lg font-semibold">m²</span>
            </p>
            <span className="mb-1 h-6 w-px bg-border" />
            <p className={cn('whitespace-nowrap font-bold leading-none tracking-tight tabular-nums', post.size_max > post.size_min ? 'text-[24px]' : 'text-[30px]')}>
              {formatNumber(post.price)}
              <span className="ml-1.5 text-[15px] font-medium text-muted">kr/mnd</span>
            </p>
            <span className={cn('mb-0.5 ml-auto h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 transition group-hover:bg-accent group-hover:text-white', post.size_max > post.size_min ? 'hidden' : 'flex')}>
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Ledig fra {formatDate(post.available_from).toLowerCase() === 'nå' ? 'nå' : formatDate(post.available_from)}
            </span>
            <span>{spaceTypeLabel(post.space_type)}</span>
            {sqm ? <span className="font-mono text-[12px]">≈ {formatNumber(sqm)} kr/m²/år</span> : null}
          </div>
        </div>
      </Link>
    </div>
  );
}

/** A tenant's need (leieønske): no photo, the numbers and the company lead. */
export function NeedCard({ post, match, saved, index = 0 }: { post: PostRow; match?: MatchResult | null; saved?: boolean; index?: number }) {
  return (
    <div className="rise relative" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      {saved !== undefined ? <SaveButton postId={post.id} saved={saved} /> : null}
      <Link href={`/annonse/${post.id}`} className="group flex h-full flex-col rounded-[22px] border border-border bg-surface p-5 transition hover:shadow-[0_18px_40px_-20px_rgba(14,42,71,0.35)]">
        <div className="flex items-center gap-2 pr-10">
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-accent">Leieønske</span>
          {match ? <MatchBadge match={match} className="py-1 shadow-none" /> : null}
        </div>
        <h3 className="mt-3 text-lg font-semibold leading-snug">{post.title}</h3>
        <p className="mt-1 text-[14px] text-muted">
          {post.company || post.contact_name} · {spaceTypeLabel(post.space_type)} i {post.district || post.city}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
          <div>
            <p className="text-xl font-bold tabular-nums">{formatSize(post)}</p>
            <p className="text-xs text-muted">m²</p>
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums">{formatNumber(post.price / 1000)}k</p>
            <p className="text-xs text-muted">maks kr/mnd</p>
          </div>
          <div>
            <p className="text-xl font-bold">{formatDate(post.available_from)}</p>
            <p className="text-xs text-muted">innflytting</p>
          </div>
        </div>
        {post.facilities.length ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {post.facilities.map((f) => (
              <span key={f} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
                {f}
              </span>
            ))}
          </div>
        ) : null}
      </Link>
    </div>
  );
}

export function PostCard(props: { post: PostRow; match?: MatchResult | null; saved?: boolean; index?: number }) {
  return props.post.kind === 'offer' ? <OfferCard {...props} /> : <NeedCard {...props} />;
}
