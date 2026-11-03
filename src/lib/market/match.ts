import type { PostRow as Post } from '@/db/schema';
import { spaceTypeLabel } from './catalog';
import { formatDate, formatNumber, parseDate } from './format';

// Ported from the Newly app (features/market/utils/match.ts). Weights:
// city 25 · type 20 · size 20 · price 20 · date 10 · facilities 5 = 100.
// Facilities are new: the original captured them but never scored them.

const DAY = 24 * 60 * 60 * 1000;

export interface Filters {
  city: string | null;
  spaceType: string | null;
  sizeRange: [number, number] | null;
  maxPrice: number | null;
}

/** What a post is compared against: the user's own opposite post, or the filters. */
export interface MatchTarget {
  city: string | null;
  spaceType: string | null;
  sizeMin: number | null;
  sizeMax: number | null;
  price: number | null;
  availableFrom: string | null;
  facilities: string[];
}

export interface MatchReason {
  ok: boolean;
  text: string;
}

export interface MatchResult {
  score: number;
  label: string;
  reasons: MatchReason[];
}

export function targetFromPost(post: Post): MatchTarget {
  return {
    city: post.city,
    spaceType: post.space_type,
    sizeMin: post.size_min,
    sizeMax: post.size_max,
    price: post.price,
    availableFrom: post.available_from,
    facilities: post.facilities,
  };
}

export function targetFromFilters(filters: Filters): MatchTarget {
  return {
    city: filters.city,
    spaceType: filters.spaceType,
    sizeMin: filters.sizeRange?.[0] ?? null,
    sizeMax: filters.sizeRange?.[1] ?? null,
    price: filters.maxPrice,
    availableFrom: null,
    facilities: [],
  };
}

export function hasFilters(f: Filters): boolean {
  return Boolean(f.city || f.spaceType || f.sizeRange || f.maxPrice);
}

export function matchLabel(score: number): string {
  if (score >= 85) return 'Svært godt samsvar';
  if (score >= 70) return 'Godt samsvar';
  if (score >= 50) return 'Delvis samsvar';
  return 'Svakt samsvar';
}

/**
 * Rule-based match between a listing and what someone is looking for. Each rule that the
 * target leaves open counts as met, so the score always reads "how well does this fit
 * what you asked for". `post` is the thing being judged; `target` is the wish.
 * When the post is a need and the target an offer, sizes, prices and facilities are
 * compared the other way round (does my space fit their range, is my rent within budget).
 */
export function scoreMatch(post: Post, target: MatchTarget, targetIsOffer = false): MatchResult {
  const reasons: MatchReason[] = [];
  let score = 0;

  if (!target.city || target.city === post.city) {
    score += 25;
    if (target.city) reasons.push({ ok: true, text: `Riktig område: ${post.district ? `${post.district}, ` : ''}${post.city}` });
  } else {
    reasons.push({ ok: false, text: `Annet område: ${post.city}, ikke ${target.city}` });
  }

  if (!target.spaceType || target.spaceType === post.space_type) {
    score += 20;
    if (target.spaceType) reasons.push({ ok: true, text: `Riktig type: ${spaceTypeLabel(post.space_type)}` });
  } else {
    reasons.push({ ok: false, text: `${spaceTypeLabel(post.space_type)}, ikke ${spaceTypeLabel(target.spaceType).toLowerCase()}` });
  }

  score += sizeRule(post, target, targetIsOffer, reasons);
  score += priceRule(post, target, targetIsOffer, reasons);
  score += dateRule(post, target, targetIsOffer, reasons);
  score += facilityRule(post, target, targetIsOffer, reasons);

  return { score, label: matchLabel(score), reasons };
}

function sizeRule(post: Post, target: MatchTarget, targetIsOffer: boolean, reasons: MatchReason[]): number {
  if (target.sizeMin == null || target.sizeMax == null) return 20;
  const wantMin = targetIsOffer ? post.size_min : target.sizeMin;
  const wantMax = targetIsOffer ? post.size_max : target.sizeMax;
  const haveMin = targetIsOffer ? target.sizeMin : post.size_min;
  const haveMax = targetIsOffer ? target.sizeMax : post.size_max;
  const range = wantMax >= 100000 ? `over ${formatNumber(wantMin)} m²` : `${formatNumber(wantMin)}–${formatNumber(wantMax)} m²`;
  const have = haveMax > haveMin ? `${formatNumber(haveMin)}–${formatNumber(haveMax)} m²` : `${formatNumber(haveMin)} m²`;
  if (haveMax >= wantMin && haveMin <= wantMax) {
    reasons.push({ ok: true, text: `Areal passer: ${have} innenfor ${range}` });
    return 20;
  }
  const gap = haveMax < wantMin ? (wantMin - haveMax) / Math.max(wantMin, 1) : (haveMin - wantMax) / Math.max(wantMax, 1);
  if (gap <= 0.15) {
    reasons.push({ ok: false, text: `Areal nesten: ${have} mot ønsket ${range}` });
    return 10;
  }
  reasons.push({ ok: false, text: `Areal passer ikke: ${have} mot ${range}` });
  return 0;
}

function priceRule(post: Post, target: MatchTarget, targetIsOffer: boolean, reasons: MatchReason[]): number {
  if (target.price == null) return 20;
  const rent = targetIsOffer ? target.price : post.price;
  const budget = targetIsOffer ? post.price : target.price;
  if (budget <= 0) return 20;
  if (rent <= budget) {
    reasons.push({ ok: true, text: `Innenfor budsjett: ${formatNumber(rent)} av maks ${formatNumber(budget)} kr/mnd` });
    return 20;
  }
  if (rent <= budget * 1.1) {
    reasons.push({ ok: false, text: `Litt over budsjett: ${formatNumber(rent)} mot ${formatNumber(budget)} kr/mnd` });
    return 10;
  }
  reasons.push({ ok: false, text: `Over budsjett: ${formatNumber(rent)} mot ${formatNumber(budget)} kr/mnd` });
  return 0;
}

function dateRule(post: Post, target: MatchTarget, targetIsOffer: boolean, reasons: MatchReason[]): number {
  if (!target.availableFrom) return 10;
  const available = parseDate(targetIsOffer ? target.availableFrom : post.available_from);
  const wanted = parseDate(targetIsOffer ? post.available_from : target.availableFrom);
  if (!available || !wanted) return 10;
  const lateBy = (available.getTime() - wanted.getTime()) / DAY;
  const iso = targetIsOffer ? target.availableFrom : post.available_from;
  if (lateBy <= 31) {
    reasons.push({ ok: true, text: `Ledig i tide: fra ${formatDate(iso)}` });
    return 10;
  }
  if (lateBy <= 62) {
    reasons.push({ ok: false, text: `Ledig litt senere: fra ${formatDate(iso)}` });
    return 5;
  }
  reasons.push({ ok: false, text: `Ledig for sent: fra ${formatDate(iso)}` });
  return 0;
}

function facilityRule(post: Post, target: MatchTarget, targetIsOffer: boolean, reasons: MatchReason[]): number {
  // The need's facilities are must-haves; the offer's are what the space has.
  const mustHave = targetIsOffer ? post.facilities : target.facilities;
  const has = targetIsOffer ? target.facilities : post.facilities;
  if (mustHave.length === 0) return 5;
  const missing = mustHave.filter((f) => !has.includes(f));
  const present = mustHave.filter((f) => has.includes(f));
  if (present.length) reasons.push({ ok: true, text: `Har: ${present.join(', ')}` });
  if (missing.length) reasons.push({ ok: false, text: `Mangler: ${missing.join(', ')}` });
  return Math.round((5 * present.length) / mustHave.length);
}

/** Best match for `post` among the user's own opposite-kind posts. */
export function bestAgainstMine(post: Post, mine: Post[]): { against: Post; result: MatchResult } | null {
  let best: { against: Post; result: MatchResult } | null = null;
  for (const m of mine) {
    if (m.kind === post.kind || m.status !== 'active') continue;
    const result = scoreMatch(post, targetFromPost(m), m.kind === 'offer');
    if (!best || result.score > best.result.score) best = { against: m, result };
  }
  return best;
}

/** For one of my posts: the opposite-kind listings ranked by score. */
export function matchesFor(mine: Post, posts: Post[], minScore = 50): { post: Post; result: MatchResult }[] {
  return posts
    .filter((p) => p.kind !== mine.kind && p.user_id !== mine.user_id && p.status === 'active')
    .map((post) => ({ post, result: scoreMatch(post, targetFromPost(mine), mine.kind === 'offer') }))
    .filter((m) => m.result.score >= minScore)
    .sort((a, b) => b.result.score - a.result.score);
}
