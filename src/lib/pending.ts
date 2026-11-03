import 'server-only';
import { and, eq } from 'drizzle-orm';
import { after } from 'next/server';

import { db, posts } from '@/db';
import { notifyMatches } from '@/lib/notify';

/**
 * Needs sent in through the front-page form without an account start as
 * 'pending'. Once the person proves they own the e-mail (by signing in), they go
 * live and trigger match e-mails like any other new post.
 */
export async function activatePendingPosts(userId: string) {
  const activated = await db
    .update(posts)
    .set({ status: 'active' })
    .where(and(eq(posts.user_id, userId), eq(posts.status, 'pending')))
    .returning();
  for (const post of activated) after(() => notifyMatches(post));
  return activated;
}
