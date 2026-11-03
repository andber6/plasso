import 'server-only';

import { db, profiles, type PostRow } from '@/db';
import { sendEmail, siteUrl } from '@/lib/email';
import { spaceTypeLabel } from '@/lib/market/catalog';
import { formatNumber, formatSize } from '@/lib/market/format';
import { matchesFor, scoreMatch, targetFromPost } from '@/lib/market/match';
import { oppositePosts } from '@/lib/queries';

/**
 * Server-side matching: tell the owner of every listing that fits the new post
 * (≥ 70 %) and give the author a summary. Blocked users (either way) are skipped
 * because oppositePosts already excludes them.
 */
export async function notifyMatches(post: PostRow) {
  const others = await oppositePosts(post.kind, post.user_id);
  const strong = others
    .map((other) => ({ other, result: scoreMatch(post, targetFromPost(other), other.kind === 'offer') }))
    .filter((m) => m.result.score >= 70);
  const people = await db.select().from(profiles);
  const byId = new Map(people.map((p) => [p.user_id, p]));

  for (const { other, result } of strong) {
    const owner = byId.get(other.user_id);
    if (!owner?.email) continue;
    const what = post.kind === 'need' ? 'En ny leietaker passer lokalet ditt' : 'Et nytt lokale passer leieønsket ditt';
    await sendEmail(
      owner.email,
      `${what}: ${result.score} % samsvar`,
      [
        `Hei ${owner.name.split(' ')[0] || 'der'},`,
        `${what} «${other.title}».`,
        `${post.title}\n${spaceTypeLabel(post.space_type)} · ${post.district ? `${post.district}, ` : ''}${post.city} · ${formatSize(post)} m² · ${formatNumber(post.price)} kr/mnd`,
        result.reasons.map((r) => `${r.ok ? '✓' : '✗'} ${r.text}`).join('\n'),
      ].join('\n\n'),
      { button: { label: 'Se annonsen', url: siteUrl(`/annonse/${post.id}`) } },
    );
  }

  const author = byId.get(post.user_id);
  const mine = matchesFor(post, others, 70);
  if (author?.email && mine.length) {
    await sendEmail(
      author.email,
      `${mine.length} ${mine.length === 1 ? 'match' : 'matcher'} på «${post.title}»`,
      [`Hei ${author.name.split(' ')[0] || 'der'},`, mine.slice(0, 5).map((m) => `${m.result.score} % · ${m.post.title}`).join('\n')].join('\n\n'),
      { button: { label: 'Se alle matcher', url: siteUrl('/matcher') } },
    );
  }
}
