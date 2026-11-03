import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { after } from 'next/server';

import { db, events, posts, profiles } from '@/db';
import { notifyMatches } from '@/lib/notify';

/**
 * Needs sent in through the front-page form belong to a stand-alone lead profile
 * (user_id "lead:<uuid>"), never to an account, so typing someone else's e-mail
 * can't attach anything to their account. The confirmation e-mail carries a
 * one-time secret for that one need; only that link publishes it, and only for
 * the person who signed in with the same e-mail.
 */
export const LEAD_PREFIX = 'lead:';

export function newLeadSecret() {
  const secret = randomBytes(24).toString('base64url');
  return { secret, hash: hashSecret(secret) };
}

function hashSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

function sameHash(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Called from the magic-link landing with `bekreft=<postId>.<secret>`. Moves the
 * lead's need (and its profile and anonymous history) into the signed-in account
 * and publishes it. Returns the post id on success.
 */
export async function confirmLead(user: { id: string; email: string }, param: string): Promise<string | null> {
  const [postId, secret] = param.split('.');
  if (!postId || !secret) return null;
  const [post] = await db.select().from(posts).where(and(eq(posts.id, postId), eq(posts.status, 'pending')));
  if (!post?.confirm_token || !post.user_id.startsWith(LEAD_PREFIX) || !sameHash(post.confirm_token, hashSecret(secret))) return null;

  const leadId = post.user_id;
  const [lead] = await db.select().from(profiles).where(eq(profiles.user_id, leadId));
  // The link was mailed to the lead's address; the account must be that address too.
  if (!lead || lead.email.toLowerCase() !== user.email.toLowerCase()) return null;

  const [existing] = await db.select().from(profiles).where(eq(profiles.user_id, user.id));
  if (existing) {
    // Keep the account's profile; a fresh "yes, contact me" from the form still counts.
    if (lead.contact_ok && !existing.contact_ok) await db.update(profiles).set({ contact_ok: true }).where(eq(profiles.user_id, user.id));
    await db.delete(profiles).where(eq(profiles.user_id, leadId));
  } else {
    await db.update(profiles).set({ user_id: user.id, email: user.email }).where(eq(profiles.user_id, leadId));
  }
  await db.update(events).set({ user_id: user.id }).where(eq(events.user_id, leadId));
  const [live] = await db
    .update(posts)
    .set({ user_id: user.id, status: 'active', confirm_token: null })
    .where(and(eq(posts.id, post.id), eq(posts.status, 'pending')))
    .returning();
  if (!live) return null;
  after(() => notifyMatches(live));
  return live.id;
}

/** Admin publishes a pending lead without e-mail confirmation (e.g. while e-mail is off). */
export async function publishLead(postId: string) {
  const [live] = await db
    .update(posts)
    .set({ status: 'active', confirm_token: null })
    .where(and(eq(posts.id, postId), eq(posts.status, 'pending')))
    .returning();
  if (live) after(() => notifyMatches(live));
  return live ?? null;
}
