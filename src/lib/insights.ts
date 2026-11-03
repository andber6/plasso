import 'server-only';
import { desc, eq, gte } from 'drizzle-orm';

import { db, events, inquiries, posts, profiles, reports, savedPosts, user, type PostRow } from '@/db';
import { SIZE_RANGES, spaceTypeLabel } from '@/lib/market/catalog';
import { matchesFor } from '@/lib/market/match';

const DAY = 86400000;

function countBy<T>(rows: T[], key: (r: T) => string | null | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function top(m: Map<string, number>, n = 8): { key: string; value: number }[] {
  return [...m.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

/**
 * Everything the creators' demand dashboard shows, computed from the event log
 * and the marketplace tables. Fine for thousands of rows; move the aggregations
 * into SQL when the event table grows past that.
 */
export async function demandInsights(days = 30) {
  const since = new Date(Date.now() - days * DAY);
  const [ev, allPosts, profs, users, inq, saves, openReports] = await Promise.all([
    db.select().from(events).where(gte(events.created_at, since)),
    db.select().from(posts),
    db.select().from(profiles),
    db.select({ id: user.id, created: user.createdAt }).from(user),
    db.select().from(inquiries),
    db.select().from(savedPosts),
    db.select().from(reports).where(eq(reports.resolved, false)).orderBy(desc(reports.created_at)),
  ]);

  const active = allPosts.filter((p) => p.status === 'active');
  const offers = active.filter((p) => p.kind === 'offer');
  const needs = active.filter((p) => p.kind === 'need');
  const searches = ev.filter((e) => e.type === 'search');
  const views = ev.filter((e) => e.type === 'view');
  const visitors = new Set(ev.map((e) => e.user_id ?? e.anon_id).filter(Boolean)).size;
  const tenantSearches = searches.filter((s) => s.data.mode !== 'utleie');

  // Demand vs supply per city and per type: what people look for vs what exists.
  const searchCity = countBy(tenantSearches, (s) => s.data.city as string);
  const needCity = countBy(needs, (p) => p.city);
  const offerCity = countBy(offers, (p) => p.city);
  const cities = [...new Set([...searchCity.keys(), ...needCity.keys(), ...offerCity.keys()])]
    .map((city) => ({ city, searches: searchCity.get(city) ?? 0, needs: needCity.get(city) ?? 0, offers: offerCity.get(city) ?? 0 }))
    .map((r) => ({ ...r, pressure: (r.searches + r.needs * 5) / Math.max(1, r.offers) }))
    .sort((a, b) => b.searches + b.needs * 5 - (a.searches + a.needs * 5));

  const searchType = countBy(tenantSearches, (s) => s.data.space_type as string);
  const needType = countBy(needs, (p) => p.space_type);
  const offerType = countBy(offers, (p) => p.space_type);
  const types = [...new Set([...searchType.keys(), ...needType.keys(), ...offerType.keys()])]
    .map((t) => ({ type: spaceTypeLabel(t), searches: searchType.get(t) ?? 0, needs: needType.get(t) ?? 0, offers: offerType.get(t) ?? 0 }))
    .sort((a, b) => b.searches + b.needs * 5 - (a.searches + a.needs * 5));

  const sizeLabel = (id: string) => SIZE_RANGES.find((s) => s.id === id)?.label ?? id;
  const sizes = top(countBy(tenantSearches, (s) => s.data.size as string)).map((r) => ({ ...r, key: sizeLabel(r.key) }));
  const budgets = top(countBy(tenantSearches, (s) => (s.data.max_price ? `Maks ${Number(s.data.max_price) / 1000}k kr/mnd` : null)));
  const queries = top(countBy(searches, (s) => (s.data.q as string) || null), 10);

  // Listings people engage with.
  const viewCount = countBy(views, (v) => v.post_id);
  const saveCount = countBy(saves, (s) => s.post_id);
  const inqCount = countBy(inq, (i) => i.post_id);
  const postById = new Map(allPosts.map((p) => [p.id, p]));
  const hottest = [...new Set([...viewCount.keys(), ...saveCount.keys(), ...inqCount.keys()])]
    .map((id) => ({ post: postById.get(id), views: viewCount.get(id) ?? 0, saves: saveCount.get(id) ?? 0, inquiries: inqCount.get(id) ?? 0 }))
    .filter((r): r is { post: PostRow; views: number; saves: number; inquiries: number } => Boolean(r.post))
    .sort((a, b) => b.inquiries * 10 + b.saves * 3 + b.views - (a.inquiries * 10 + a.saves * 3 + a.views))
    .slice(0, 8);

  // Unmet demand: needs where nothing on Plasso reaches 70 %. Each one is a
  // tenant actively looking that we could help find space elsewhere.
  const unmet = needs
    .map((need) => ({ need, best: matchesFor(need, offers, 0)[0]?.result.score ?? 0, owner: profs.find((p) => p.user_id === need.user_id) }))
    .filter((r) => r.best < 70)
    .sort((a, b) => a.best - b.best);

  // Leads: every profile with what they did and what they want.
  const evByUser = new Map<string, typeof ev>();
  for (const e of ev) if (e.user_id) evByUser.set(e.user_id, [...(evByUser.get(e.user_id) ?? []), e]);
  const leads = profs
    .map((p) => {
      const mine = allPosts.filter((x) => x.user_id === p.user_id);
      const e = evByUser.get(p.user_id) ?? [];
      const s = e.filter((x) => x.type === 'search');
      const wantsCity = top(countBy([...s.map((x) => x.data.city as string), ...mine.filter((m) => m.kind === 'need').map((m) => m.city)], (x) => x), 1)[0]?.key;
      const wantsType = top(countBy([...s.map((x) => x.data.space_type as string), ...mine.filter((m) => m.kind === 'need').map((m) => m.space_type)], (x) => x), 1)[0]?.key;
      const sent = inq.filter((i) => i.from_user_id === p.user_id).length;
      const lastActive = e.reduce<Date | null>((d, x) => (!d || x.created_at > d ? x.created_at : d), null) ?? p.created_at;
      const activeNeeds = mine.filter((m) => m.kind === 'need' && m.status === 'active');
      const activeOffers = mine.filter((m) => m.kind === 'offer' && m.status === 'active');
      const score = activeNeeds.length * 30 + activeOffers.length * 5 + sent * 15 + s.length * 2 + e.filter((x) => x.type === 'view').length + e.filter((x) => x.type === 'save').length * 3;
      return { profile: p, needs: activeNeeds, offers: activeOffers, searches: s.length, views: e.filter((x) => x.type === 'view').length, sent, wantsCity, wantsType: wantsType ? spaceTypeLabel(wantsType) : null, lastActive, score };
    })
    .sort((a, b) => b.score - a.score);

  const recentSignups = users.filter((u) => u.created >= since).length;

  return {
    days,
    kpis: {
      visitors,
      searches: searches.length,
      signups: recentSignups,
      needs: needs.length,
      offers: offers.length,
      inquiries: inq.filter((i) => i.created_at >= since).length,
    },
    cities,
    types,
    sizes,
    budgets,
    queries,
    hottest,
    unmet,
    leads,
    openReports: openReports.map((r) => ({ ...r, post: postById.get(r.post_id) })),
    hasSeed: allPosts.some((p) => p.id.startsWith('seed-')),
  };
}

export type Insights = Awaited<ReturnType<typeof demandInsights>>;
