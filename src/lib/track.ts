import 'server-only';
import { cookies } from 'next/headers';
import { and, eq, isNull } from 'drizzle-orm';

import { db, events } from '@/db';

export type EventType = 'search' | 'view' | 'save' | 'inquiry' | 'post' | 'signup';

/** Record one demand signal. Never throws: tracking must not break a page. */
export async function track(type: EventType, input: { userId?: string | null; postId?: string | null; data?: Record<string, unknown> } = {}) {
  try {
    const anon = (await cookies()).get('pl_anon')?.value ?? null;
    await db.insert(events).values({
      id: crypto.randomUUID(),
      anon_id: anon,
      user_id: input.userId ?? null,
      type,
      post_id: input.postId ?? null,
      data: input.data ?? {},
    });
  } catch (err) {
    console.error('[track]', err);
  }
}

/** After sign-in: attach what this browser did anonymously to the user. */
export async function linkAnonEvents(userId: string) {
  const anon = (await cookies()).get('pl_anon')?.value;
  if (!anon) return;
  await db.update(events).set({ user_id: userId }).where(and(eq(events.anon_id, anon), isNull(events.user_id)));
}
