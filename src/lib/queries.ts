import 'server-only';
import { and, desc, eq, inArray, ne, notInArray, or } from 'drizzle-orm';

import { blocks, db, inquiries, posts, profiles, savedPosts, type PostRow } from '@/db';

/** Users hidden from `userId` in either direction: ones they blocked and ones who blocked them. */
export async function blockedIds(userId: string | undefined): Promise<string[]> {
  if (!userId) return [];
  const rows = await db
    .select()
    .from(blocks)
    .where(or(eq(blocks.user_id, userId), eq(blocks.blocked_user_id, userId)));
  return rows.map((r) => (r.user_id === userId ? r.blocked_user_id : r.user_id));
}

/** Active posts of one kind, newest first, minus anything from blocked users. */
export async function activePosts(kind: 'offer' | 'need', userId?: string): Promise<PostRow[]> {
  const blocked = await blockedIds(userId);
  const where = [eq(posts.status, 'active'), eq(posts.kind, kind)];
  if (blocked.length) where.push(notInArray(posts.user_id, blocked));
  return db.select().from(posts).where(and(...where)).orderBy(desc(posts.created_at));
}

/** All active posts of the kind opposite to `kind`, from other users who aren't blocked either way. */
export async function oppositePosts(kind: string, userId: string): Promise<PostRow[]> {
  const blocked = await blockedIds(userId);
  const where = [eq(posts.status, 'active'), ne(posts.kind, kind), ne(posts.user_id, userId)];
  if (blocked.length) where.push(notInArray(posts.user_id, blocked));
  return db.select().from(posts).where(and(...where));
}

export async function myPosts(userId: string | undefined): Promise<PostRow[]> {
  if (!userId) return [];
  return db.select().from(posts).where(eq(posts.user_id, userId)).orderBy(desc(posts.created_at));
}

export async function getPost(id: string): Promise<PostRow | null> {
  const [row] = await db.select().from(posts).where(eq(posts.id, id));
  return row ?? null;
}

export async function getProfile(userId: string | undefined) {
  if (!userId) return null;
  const [row] = await db.select().from(profiles).where(eq(profiles.user_id, userId));
  return row ?? null;
}

export async function savedIds(userId: string | undefined): Promise<string[]> {
  if (!userId) return [];
  const rows = await db.select({ id: savedPosts.post_id }).from(savedPosts).where(eq(savedPosts.user_id, userId));
  return rows.map((r) => r.id);
}

export async function savedPostsFor(userId: string): Promise<PostRow[]> {
  const ids = await savedIds(userId);
  if (!ids.length) return [];
  return db.select().from(posts).where(and(inArray(posts.id, ids), eq(posts.status, 'active')));
}

export async function inquiriesFor(userId: string) {
  const blocked = await blockedIds(userId);
  const rows = await db
    .select()
    .from(inquiries)
    .where(or(eq(inquiries.to_user_id, userId), eq(inquiries.from_user_id, userId)))
    .orderBy(desc(inquiries.created_at));
  const visible = rows.filter((r) => !blocked.includes(r.from_user_id) && !blocked.includes(r.to_user_id));
  const postIds = [...new Set(visible.map((r) => r.post_id))];
  const userIds = [...new Set(visible.flatMap((r) => [r.from_user_id, r.to_user_id]))];
  const postRows = postIds.length ? await db.select().from(posts).where(inArray(posts.id, postIds)) : [];
  const profileRows = userIds.length ? await db.select().from(profiles).where(inArray(profiles.user_id, userIds)) : [];
  return visible.map((r) => {
    const otherId = r.to_user_id === userId ? r.from_user_id : r.to_user_id;
    const other = profileRows.find((p) => p.user_id === otherId);
    const post = postRows.find((p) => p.id === r.post_id);
    return {
      ...r,
      direction: r.to_user_id === userId ? ('received' as const) : ('sent' as const),
      post_title: post?.title ?? 'Slettet annonse',
      other_name: other?.name ?? 'Ukjent',
      other_company: other?.company ?? '',
      other_email: other?.email ?? '',
      other_phone: other?.phone ?? '',
    };
  });
}

export type InquiryView = Awaited<ReturnType<typeof inquiriesFor>>[number];
