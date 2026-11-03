# Plasso

**Riktig lokale. Riktig match.** A free Norwegian marketplace for næringslokaler (commercial premises).
Tenants post a *leieønske* (what they need), landlords post an *utleieannonse* (what they have), and
Plasso scores every pair 0–100 % with plain-Norwegian reasons.

This is the web version of the prototype originally built in Newly (Expo app + Cloudflare
Workers). The matching engine, data model, seed data, copy and the "Fjord og betong" look
are carried over from it; the rest is rebuilt on Next.js.

The marketplace is free for users. For the Plasso team, every search, view, save, inquiry
and post is logged as a demand signal, and `/admin` turns that into a demand dashboard and a
lead list (contact details only for users who opted in).

## Run locally

```bash
bun install
createdb plasso                 # local Postgres
cp .env.example .env.local      # then fill in, see below
bun run db:migrate
bun run db:seed                 # demo listings + 30 days of synthetic searches
bun run dev                     # http://localhost:3000
```

To get into `/admin`: sign up with an address listed in `ADMIN_EMAILS`, then run
`bun run admin:verify you@example.com`. Admin access needs both; until real e-mail
verification exists, an unverified sign-up with an admin address gets nothing.

`.env.local`:

| Var | |
|---|---|
| `DATABASE_URL` | `postgres://localhost:5432/plasso` locally, Neon in production |
| `BETTER_AUTH_SECRET` | any long random string |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally; optional on Vercel (defaults to the production domain) |
| `ADMIN_EMAILS` | comma-separated; these accounts see **Etterspørsel** (`/admin`) once verified with `bun run admin:verify` |
| `BLOB_READ_WRITE_TOKEN` | optional; without it, photo uploads go to `public/uploads` (dev only) |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional; turn on real e-mail via Resend and passwordless sign-in. `EMAIL_FROM` must be on a domain verified in Resend, e.g. `Plasso <hei@plasso.no>`. `EMAIL_REPLY_TO` is optional |

Remove the demo data with `bun run db:seed --reset`.

## Routes

| Route | |
|---|---|
| `/` | Utforsk: toggle *Jeg vil leie / Jeg vil leie ut*, filters, feed ranked by match against your own posts |
| `/annonse/[id]` | Listing: match ring + reasons, request viewing / contact, save, report, block; owner controls |
| `/ny` → `/ny/match/[id]` | Post a need or an offer (with photo upload), then the match reveal |
| `/matcher` | Every one of your active posts with its matches |
| `/mine` | Your posts, inquiries sent/received (with contact details), saved listings |
| `/logg-inn`, `/profil` | Account (e-mail + password), role, contact opt-in, delete account |
| `/admin` | **Demand dashboard**: demand vs supply per city/type, sizes and budgets searched, unmet demand, leads, popular listings, reports |
| `/admin/epost` | E-mail outbox (match alerts, inquiries) until an e-mail provider is connected |
| `/admin/leads.csv` | Opted-in leads export |

## Where things live

```
src/
├── app/                  routes + actions.ts (all server actions)
├── components/           UI (post cards, match ring, filter bar, forms)
├── db/schema.ts          Drizzle schema (auth, marketplace, events, emails)
├── lib/market/           ported from Newly: catalog, format, match (scoring)
├── lib/insights.ts       demand dashboard aggregations
├── lib/track.ts          demand event logging (anon cookie → user on sign-in)
├── lib/email.ts          e-mail outbox
└── proxy.ts              sets the anonymous visitor cookie
scripts/seed.ts           demo data
```

## Database migrations

Migrations run automatically in every Vercel production build, before the new
code goes live; CI checks that `schema.ts` and `drizzle/` agree and that every
migration applies to an empty database. Workflow and rules (backward-compatible
changes only) are in [AGENTS.md](AGENTS.md#database-migrations).

## Matching

`src/lib/market/match.ts`: city 25 · type 20 · size 20 · price 20 · move-in date 10 ·
facilities 5. The facilities rule is new (the Newly version captured facilities but never
scored them). When a post is published, matching also runs server-side and e-mails
the owners of every listing that scores ≥ 70 %.

## Not done yet

- Connect a domain in Resend to switch on real e-mail and magic-link sign-in (the code is ready)
- Map / geocoding instead of a fixed city list
- Privacy policy needs a proper review before launch (`/personvern` is a draft)
