'use server';

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';
import { and, eq, gte, ne, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';

import { blocks, db, emails, events, inquiries, posts, profiles, reports, savedPosts, user } from '@/db';
import { auth, getUser, isAdmin } from '@/lib/auth';
import { emailEnabled, sendEmail, siteUrl } from '@/lib/email';
import { CITIES, DEFAULT_PHOTO, FACILITIES, LEASE_OPTIONS, PHOTO_KEYS, SPACE_TYPES, spaceTypeLabel } from '@/lib/market/catalog';
import { matchesFor } from '@/lib/market/match';
import { activePosts, blockedIds, getPost, getProfile } from '@/lib/queries';
import { safeNext } from '@/lib/safe-next';
import { notifyMatches } from '@/lib/notify';
import { LEAD_PREFIX, newLeadSecret, publishLead } from '@/lib/leads';
import { linkAnonEvents, track } from '@/lib/track';

export type FormState = { error?: string; ok?: boolean } | undefined;

function str(v: FormDataEntryValue | null, max = 2000): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
function int(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

async function requireUser() {
  const u = await getUser();
  if (!u) redirect('/logg-inn');
  return u;
}

/** Magic-link users have no profile until onboarding; send them there first. */
async function requireProfile(userId: string, next: string) {
  const profile = await getProfile(userId);
  if (!profile) redirect(`/velkommen?neste=${encodeURIComponent(next)}`);
  return profile;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_IDS = ['leietaker', 'utleier', 'megler'];

/** At most `max` e-mails with this subject to one address per `minutes` (stops link spam). */
async function tooManyEmails(to: string, subject: string, max: number, minutes: number) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(emails)
    .where(and(eq(emails.to, to), eq(emails.subject, subject), gte(emails.created_at, new Date(Date.now() - minutes * 60000))));
  return n >= max;
}

// ── Account ────────────────────────────────────────────────────────────────

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const name = str(form.get('name'), 120);
  const email = str(form.get('email'), 200).toLowerCase();
  const password = str(form.get('password'), 200);
  if (!name || !email) return { error: 'Fyll inn navn og e-post.' };
  if (password.length < 8) return { error: 'Passordet må ha minst 8 tegn.' };
  let userId: string;
  try {
    const res = await auth.api.signUpEmail({ body: { name, email, password }, headers: await headers() });
    userId = res.user.id;
  } catch {
    return { error: 'Kunne ikke opprette konto. Er e-posten allerede i bruk?' };
  }
  const role = str(form.get('role'), 20);
  await db.insert(profiles).values({
    user_id: userId,
    name,
    email,
    company: str(form.get('company'), 160),
    phone: str(form.get('phone'), 40),
    role: ROLE_IDS.includes(role) ? role : 'leietaker',
    contact_ok: form.get('contact_ok') === 'on',
  });
  await linkAnonEvents(userId);
  await track('signup', { userId, data: { role } });
  redirect(safeNext(form.get('next')));
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form.get('email'), 200).toLowerCase();
  const password = str(form.get('password'), 200);
  let userId: string;
  try {
    const res = await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
    userId = res.user.id;
  } catch {
    return { error: 'Feil e-post eller passord.' };
  }
  await linkAnonEvents(userId);
  redirect(safeNext(form.get('next')));
}

/** Passwordless sign-in / sign-up: e-mail a one-time link. */
export async function requestMagicLink(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form.get('email'), 200).toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: 'Skriv inn en gyldig e-postadresse.' };
  if (await tooManyEmails(email, 'Logg inn på Plasso', 3, 15)) return { error: 'Vi har nettopp sendt deg flere lenker. Sjekk innboksen (og søppelpost), eller vent litt.' };
  const next = safeNext(form.get('next'));
  try {
    await auth.api.signInMagicLink({
      body: { email, callbackURL: `/auth/ferdig?neste=${encodeURIComponent(next)}`, errorCallbackURL: '/logg-inn?feil=lenke' },
      headers: await headers(),
    });
  } catch {
    return { error: 'Kunne ikke sende lenken. Prøv igjen om litt.' };
  }
  return { ok: true };
}

/** First sign-in via magic link: collect the profile the password sign-up used to ask for. */
export async function completeProfile(_: FormState, form: FormData): Promise<FormState> {
  const u = await requireUser();
  const name = str(form.get('name'), 120);
  if (!name) return { error: 'Skriv inn navnet ditt.' };
  const role = str(form.get('role'), 20);
  await db
    .insert(profiles)
    .values({
      user_id: u.id,
      name,
      email: u.email,
      company: str(form.get('company'), 160),
      phone: str(form.get('phone'), 40),
      role: ROLE_IDS.includes(role) ? role : 'leietaker',
      contact_ok: form.get('contact_ok') === 'on',
    })
    .onConflictDoNothing();
  if (u.name !== name) await db.update(user).set({ name }).where(eq(user.id, u.id));
  await track('signup', { userId: u.id, data: { role, via: 'magic-link' } });
  revalidatePath('/', 'layout');
  redirect(safeNext(form.get('next')));
}

export type LeadState = { error?: string; ok?: boolean; emailSent?: boolean; matches?: number } | undefined;

/**
 * The front-page "tell us what you need" form: no account needed. The need is
 * stored as 'pending' on a stand-alone lead profile (never on an account, so a
 * typed-in e-mail can't touch someone else's account) until the confirmation
 * link in the e-mail is clicked; see lib/leads.ts. The lead is visible in
 * /admin immediately either way.
 */
export async function submitNeedLead(_: LeadState, form: FormData): Promise<LeadState> {
  if (str(form.get('website'))) return { ok: true, emailSent: false, matches: 0 }; // honeypot for bots
  const name = str(form.get('name'), 120);
  const email = str(form.get('email'), 200).toLowerCase();
  if (!name) return { error: 'Skriv inn navnet ditt.' };
  if (!EMAIL_RE.test(email)) return { error: 'Skriv inn en gyldig e-postadresse.' };
  const spaceType = SPACE_TYPES.some((t) => t.id === form.get('space_type')) ? str(form.get('space_type')) : 'kontor';
  const city = CITIES.includes(str(form.get('city'))) ? str(form.get('city')) : 'Oslo';
  const min = int(form.get('size_min'));
  const max = int(form.get('size_max')) || min;
  const price = int(form.get('price'));
  if (min <= 0) return { error: 'Hvor mange m² trenger dere?' };
  if (price <= 0) return { error: 'Hva kan dere maks betale i måneden?' };
  const available = /^\d{4}-\d{2}-\d{2}$/.test(str(form.get('available_from'))) ? str(form.get('available_from')) : '';

  const [{ n: pendingToday }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(posts)
    .innerJoin(profiles, eq(profiles.user_id, posts.user_id))
    .where(and(eq(profiles.email, email), eq(posts.status, 'pending'), gte(posts.created_at, new Date(Date.now() - 86400000))));
  if (pendingToday >= 3) return { error: 'Vi har allerede fått flere leieønsker fra denne e-posten i dag. Sjekk innboksen din.' };

  const userId = `${LEAD_PREFIX}${crypto.randomUUID()}`;
  const company = str(form.get('company'), 160);
  await db
    .insert(profiles)
    .values({ user_id: userId, name, email, company, phone: str(form.get('phone'), 40), role: 'leietaker', contact_ok: form.get('contact_ok') === 'on' });
  const { secret, hash } = newLeadSecret();
  const [row] = await db
    .insert(posts)
    .values({
      id: crypto.randomUUID(),
      user_id: userId,
      kind: 'need',
      space_type: spaceType,
      city,
      size_min: Math.min(min, max),
      size_max: Math.max(min, max),
      price,
      available_from: available,
      title: `${company || name} søker ${spaceTypeLabel(spaceType).toLowerCase()} i ${city}`,
      description: str(form.get('description'), 3000),
      company,
      contact_name: name,
      status: 'pending',
      confirm_token: hash,
    })
    .returning();

  await linkAnonEvents(userId);
  await track('post', { userId, postId: row.id, data: { kind: 'need', via: 'skjema', space_type: spaceType, city, size_min: row.size_min, size_max: row.size_max, price } });
  const matches = matchesFor(row, await activePosts('offer')).length;

  let emailSent = false;
  if (emailEnabled()) {
    try {
      await auth.api.signInMagicLink({
        body: {
          email,
          name,
          callbackURL: `/auth/ferdig?bekreft=${row.id}.${secret}&neste=${encodeURIComponent(`/ny/match/${row.id}`)}`,
          errorCallbackURL: '/logg-inn?feil=lenke',
          metadata: { purpose: 'lead' },
        },
        headers: await headers(),
      });
      emailSent = true;
    } catch (err) {
      console.error('[lead] could not send confirmation', err);
    }
  }
  revalidatePath('/admin');
  return { ok: true, emailSent, matches };
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect('/');
}

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const u = await requireUser();
  const role = str(form.get('role'), 20);
  const values = {
    name: str(form.get('name'), 120) || u.name,
    company: str(form.get('company'), 160),
    phone: str(form.get('phone'), 40),
    role: ['leietaker', 'utleier', 'megler'].includes(role) ? role : 'leietaker',
    contact_ok: form.get('contact_ok') === 'on',
  };
  await db
    .insert(profiles)
    .values({ user_id: u.id, email: u.email, ...values })
    .onConflictDoUpdate({ target: profiles.user_id, set: values });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteAccount() {
  const u = await requireUser();
  await db.delete(posts).where(eq(posts.user_id, u.id));
  await db.delete(inquiries).where(or(eq(inquiries.from_user_id, u.id), eq(inquiries.to_user_id, u.id)));
  await db.delete(savedPosts).where(eq(savedPosts.user_id, u.id));
  await db.delete(blocks).where(eq(blocks.user_id, u.id));
  await db.delete(profiles).where(eq(profiles.user_id, u.id));
  await db.delete(events).where(eq(events.user_id, u.id));
  await db.delete(user).where(eq(user.id, u.id)); // cascades sessions + accounts
  redirect('/');
}

// ── Posts ──────────────────────────────────────────────────────────────────

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
/** Vercel Functions reject request bodies over 4.5 MB, so keep photos under that. */
const MAX_UPLOAD = 4 * 1024 * 1024;

async function storeUpload(file: File): Promise<string> {
  const name = `${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`listings/${name}`, file, { access: 'public', contentType: file.type });
    return blob.url;
  }
  // Local development only: Vercel's filesystem is read-only.
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export async function createPost(_: FormState, form: FormData): Promise<FormState> {
  const u = await requireUser();
  const kind = str(form.get('kind')) === 'offer' ? 'offer' : 'need';
  const profile = await requireProfile(u.id, `/ny?type=${kind}`);
  const isOffer = kind === 'offer';
  const spaceType = SPACE_TYPES.some((t) => t.id === form.get('space_type')) ? str(form.get('space_type')) : 'kontor';
  const city = CITIES.includes(str(form.get('city'))) ? str(form.get('city')) : 'Oslo';
  const district = str(form.get('district'), 80);
  const min = int(form.get('size_min'));
  const max = isOffer ? min : int(form.get('size_max')) || min;
  const price = int(form.get('price'));
  if (min <= 0) return { error: isOffer ? 'Skriv inn hvor stort lokalet er.' : 'Skriv inn hvor mye plass dere trenger.' };
  if (price <= 0) return { error: isOffer ? 'Skriv inn månedsleien.' : 'Skriv inn hva dere maks kan betale i måneden.' };
  const lease = int(form.get('lease_months'));

  let image: string | null = null;
  if (isOffer) {
    const file = form.get('photo');
    if (file instanceof File && file.size > 0) {
      if (!IMAGE_TYPES[file.type]) return { error: 'Bildet må være JPG, PNG eller WebP.' };
      if (file.size > MAX_UPLOAD) return { error: 'Bildet er for stort. Maks 4 MB.' };
      image = await storeUpload(file);
    } else {
      const key = str(form.get('photo_key'), 40);
      image = PHOTO_KEYS.includes(key) ? key : DEFAULT_PHOTO[spaceType];
    }
  }

  const autoTitle = isOffer
    ? `${spaceTypeLabel(spaceType)}${district ? ` på ${district}` : ` i ${city}`}`
    : `Søker ${spaceTypeLabel(spaceType).toLowerCase()} i ${district || city}`;

  const [row] = await db
    .insert(posts)
    .values({
      id: crypto.randomUUID(),
      user_id: u.id,
      kind,
      space_type: spaceType,
      city,
      district,
      address: isOffer ? str(form.get('address'), 160) : '',
      size_min: Math.min(min, max),
      size_max: Math.max(min, max),
      price,
      available_from: str(form.get('available_from'), 10),
      lease_months: LEASE_OPTIONS.includes(lease) ? lease : 36,
      facilities: form.getAll('facilities').map((f) => str(f, 40)).filter((f) => FACILITIES.includes(f)),
      title: str(form.get('title'), 140) || autoTitle,
      description: str(form.get('description'), 3000),
      image,
      company: profile?.company ?? '',
      contact_name: profile?.name ?? u.name,
    })
    .returning();

  await track('post', { userId: u.id, postId: row.id, data: { kind, space_type: spaceType, city, size_min: row.size_min, size_max: row.size_max, price } });
  after(() => notifyMatches(row));
  revalidatePath('/', 'layout');
  redirect(`/ny/match/${row.id}`);
}

function ownPost(id: string, userId: string) {
  return and(eq(posts.id, id), eq(posts.user_id, userId));
}

export async function setPostStatus(id: string, status: 'active' | 'paused' | 'rented') {
  const u = await requireUser();
  if (!['active', 'paused', 'rented'].includes(status)) return;
  // Hidden (by an admin) and pending (awaiting e-mail confirmation) posts can't be
  // changed by their owner: only an admin or the confirmation link moves them.
  await db.update(posts).set({ status }).where(and(ownPost(id, u.id), ne(posts.status, 'hidden'), ne(posts.status, 'pending')));
  revalidatePath('/', 'layout');
}

export async function deletePost(id: string) {
  const u = await requireUser();
  await db.delete(posts).where(ownPost(id, u.id));
  revalidatePath('/', 'layout');
  redirect('/mine');
}

export async function toggleSave(postId: string) {
  const u = await getUser();
  if (!u) redirect(`/logg-inn?neste=/annonse/${postId}`);
  const where = and(eq(savedPosts.user_id, u.id), eq(savedPosts.post_id, postId));
  const [existing] = await db.select().from(savedPosts).where(where);
  if (existing) {
    await db.delete(savedPosts).where(where);
  } else {
    await db.insert(savedPosts).values({ user_id: u.id, post_id: postId });
    await track('save', { userId: u.id, postId });
  }
  revalidatePath('/', 'layout');
}

// ── Contact ────────────────────────────────────────────────────────────────

export async function sendInquiry(_: FormState, form: FormData): Promise<FormState> {
  const u = await requireUser();
  const kind = str(form.get('kind')) === 'viewing' ? 'viewing' : 'contact';
  await requireProfile(u.id, `/annonse/${str(form.get('post_id'), 80)}`);
  const post = await getPost(str(form.get('post_id'), 80));
  if (!post || post.status !== 'active') return { error: 'Annonsen finnes ikke lenger.' };
  if (post.user_id === u.id) return { error: 'Dette er din egen annonse.' };
  if ((await blockedIds(u.id)).includes(post.user_id)) return { error: 'Du kan ikke kontakte denne brukeren.' };
  const message = str(form.get('message'), 2000);
  const preferred = str(form.get('preferred_date'), 10) || null;
  await db.insert(inquiries).values({
    id: crypto.randomUUID(),
    post_id: post.id,
    to_user_id: post.user_id,
    from_user_id: u.id,
    from_post_id: str(form.get('from_post_id'), 80) || null,
    kind,
    message,
    preferred_date: preferred,
  });
  await track('inquiry', { userId: u.id, postId: post.id, data: { kind } });

  const [to, from] = await Promise.all([getProfile(post.user_id), getProfile(u.id)]);
  if (to?.email) {
    await sendEmail(
      to.email,
      kind === 'viewing' ? `Forespørsel om visning: ${post.title}` : `Ny henvendelse: ${post.title}`,
      [
        `${from?.name ?? u.name}${from?.company ? ` (${from.company})` : ''} ${kind === 'viewing' ? 'vil gjerne se lokalet' : 'har tatt kontakt'}.`,
        preferred ? `Ønsket dato: ${preferred}` : '',
        '',
        message,
        '',
        `E-post: ${from?.email ?? u.email}`,
        from?.phone ? `Telefon: ${from.phone}` : '',
      ]
        .filter((l, i, a) => l || a[i - 1])
        .join('\n'),
      { button: { label: 'Se forespørselen', url: siteUrl('/mine') } },
    );
  }
  revalidatePath('/mine');
  return { ok: true };
}

export async function reportPost(postId: string, reason: string) {
  const u = await requireUser();
  await db.insert(reports).values({ id: crypto.randomUUID(), user_id: u.id, post_id: postId, reason: reason.slice(0, 200) || 'Upassende' });
}

export async function blockUser(blockedUserId: string) {
  const u = await requireUser();
  if (blockedUserId === u.id) return;
  await db.insert(blocks).values({ user_id: u.id, blocked_user_id: blockedUserId }).onConflictDoNothing();
  revalidatePath('/', 'layout');
  redirect('/');
}

// ── Admin ──────────────────────────────────────────────────────────────────

/** Publish an unconfirmed lead by hand, e.g. while e-mail delivery is off. */
export async function publishPendingNeed(postId: string) {
  const u = await requireUser();
  if (!isAdmin(u)) return;
  await publishLead(postId);
  revalidatePath('/', 'layout');
}

export async function resolveReport(id: string, removePost: boolean) {
  const u = await requireUser();
  if (!isAdmin(u)) return;
  const [r] = await db.update(reports).set({ resolved: true }).where(eq(reports.id, id)).returning();
  if (removePost && r) await db.update(posts).set({ status: 'hidden' }).where(eq(posts.id, r.post_id));
  revalidatePath('/admin');
}

