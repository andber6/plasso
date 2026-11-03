import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// ── Better Auth ─────────────────────────────────────────────────────────────
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Plasso marketplace (ported from the Newly api-service) ──────────────────
// A post is either an offer (utleieannonse: a landlord's space) or a need
// (leieønske: a tenant's request). Matching compares the two kinds.

export const profiles = pgTable('profiles', {
  user_id: text('user_id').primaryKey(),
  name: text('name').notNull(),
  company: text('company').notNull().default(''),
  email: text('email').notNull(),
  phone: text('phone').notNull().default(''),
  /** 'leietaker' | 'utleier' | 'megler' — who they say they are. */
  role: text('role').notNull().default('leietaker'),
  /** Opt-in: the Plasso team may contact them about premises that fit. */
  contact_ok: boolean('contact_ok').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id').notNull(),
    kind: text('kind').notNull(),
    space_type: text('space_type').notNull(),
    city: text('city').notNull(),
    district: text('district').notNull().default(''),
    address: text('address').notNull().default(''),
    size_min: integer('size_min').notNull(),
    size_max: integer('size_max').notNull(),
    /** kr per month: rent for an offer, max budget for a need. */
    price: integer('price').notNull(),
    available_from: text('available_from').notNull(),
    lease_months: integer('lease_months').notNull().default(36),
    facilities: jsonb('facilities').$type<string[]>().notNull().default([]),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    /** A bundled photo key ('office-1') or an uploaded image URL. */
    image: text('image'),
    company: text('company').notNull().default(''),
    contact_name: text('contact_name').notNull().default(''),
    /** active | paused | rented | hidden (removed by an admin) | pending (sent in without an account, e-mail not confirmed yet) */
    status: text('status').notNull().default('active'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('posts_kind_idx').on(t.kind, t.status), index('posts_user_idx').on(t.user_id)],
);

export const inquiries = pgTable(
  'inquiries',
  {
    id: text('id').primaryKey(),
    post_id: text('post_id').notNull(),
    to_user_id: text('to_user_id').notNull(),
    from_user_id: text('from_user_id').notNull(),
    from_post_id: text('from_post_id'),
    kind: text('kind').notNull(),
    message: text('message').notNull().default(''),
    preferred_date: text('preferred_date'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('inquiries_to_idx').on(t.to_user_id), index('inquiries_from_idx').on(t.from_user_id)],
);

export const savedPosts = pgTable(
  'saved_posts',
  {
    user_id: text('user_id').notNull(),
    post_id: text('post_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('saved_posts_pk').on(t.user_id, t.post_id)],
);

export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  post_id: text('post_id').notNull(),
  reason: text('reason').notNull(),
  resolved: boolean('resolved').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const blocks = pgTable(
  'blocks',
  {
    user_id: text('user_id').notNull(),
    blocked_user_id: text('blocked_user_id').notNull(),
  },
  (t) => [uniqueIndex('blocks_pk').on(t.user_id, t.blocked_user_id)],
);

// ── Demand insight (the creators' view) ─────────────────────────────────────
// Every search, view, save, inquiry and post is an event. Anonymous visitors
// carry an anon_id cookie; it is linked to the user when they sign in.
export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    anon_id: text('anon_id'),
    user_id: text('user_id'),
    /** search | view | save | inquiry | post | signup */
    type: text('type').notNull(),
    post_id: text('post_id'),
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('events_type_idx').on(t.type, t.created_at), index('events_user_idx').on(t.user_id), index('events_anon_idx').on(t.anon_id)],
);

// Outbox for every e-mail the app sends. Until an e-mail provider is connected
// this is the only delivery: the admin can read it under /admin/epost.
export const emails = pgTable('emails', {
  id: text('id').primaryKey(),
  to: text('to').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  sent: boolean('sent').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PostRow = typeof posts.$inferSelect;
export type ProfileRow = typeof profiles.$inferSelect;
