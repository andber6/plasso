/**
 * Demo data. Offers/needs o1–o9 and n1–n5 are ported from the Newly project's
 * 0002_seed_listings.sql; the rest extend coverage across cities. Search and view
 * events are synthetic so the demand dashboard has something to show.
 * All seed rows use ids starting with "seed-" and can be removed with --reset.
 *
 *   bun run db:seed          # insert (idempotent)
 *   bun run db:seed --reset  # remove seed rows first
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { like, sql } from 'drizzle-orm';
import postgres from 'postgres';

import { events, posts, profiles } from '../src/db/schema';

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client);

type P = [id: string, user: string, kind: 'offer' | 'need', type: string, city: string, district: string, address: string, min: number, max: number, price: number, from: string, lease: number, facilities: string[], title: string, description: string, image: string | null];

const POSTS: P[] = [
  ['seed-o1', 'seed-landlord-1', 'offer', 'kontor', 'Oslo', 'Bjørvika', 'Dronning Eufemias gate 16', 180, 180, 28000, '2027-01-01', 36, ['parkering', 'møterom', 'resepsjon', 'heis', 'sykkelparkering'], 'Lyst kontor med fjordutsikt i Bjørvika', 'Åpent kontorlandskap med tre møterom, kantine i bygget og utsikt mot Operaen. Gangavstand til Oslo S.', 'office-1'],
  ['seed-o2', 'seed-landlord-1', 'offer', 'kontor', 'Oslo', 'Grünerløkka', 'Thorvald Meyers gate 40', 95, 95, 19500, '2026-12-01', 24, ['møterom', 'kjøkken', 'fiber'], 'Kontor i bakgård på Grünerløkka', 'Tidligere trykkeri med høyt under taket og store vinduer. Passer for 8–12 arbeidsplasser.', 'office-2'],
  ['seed-o3', 'seed-landlord-2', 'offer', 'lager', 'Oslo', 'Alnabru', 'Strømsveien 266', 600, 600, 52000, '2027-02-01', 60, ['lasterampe', 'parkering', 'høy takhøyde', 'port'], 'Lager med to lasteramper på Alnabru', 'Isolert lager med 7 meter takhøyde, to porter og kontor på mesanin. Rask adkomst til E6.', 'warehouse-1'],
  ['seed-o4', 'seed-landlord-2', 'offer', 'butikk', 'Bergen', 'Sentrum', 'Strandgaten 18', 140, 140, 36000, '2026-11-15', 36, ['butikkvindu', 'lager', 'heis'], 'Gatebutikk i Strandgaten', 'Hjørnelokale med store vindusflater mot gågaten. Eget lager i kjeller.', 'retail-1'],
  ['seed-o5', 'seed-landlord-3', 'offer', 'kontor', 'Trondheim', 'Brattøra', 'Fosenkaia 4', 220, 260, 41000, '2027-03-01', 60, ['parkering', 'møterom', 'kantine', 'heis', 'sykkelparkering'], 'Moderne kontor på Brattøra', 'Nytt næringsbygg med BREEAM Very Good. Kan deles fra 220 m².', 'office-3'],
  ['seed-o6', 'seed-landlord-3', 'offer', 'kontorhotell', 'Oslo', 'Majorstuen', 'Kirkeveien 64', 20, 40, 9000, '2026-11-01', 6, ['møterom', 'resepsjon', 'kjøkken', 'fiber'], 'Fleksible kontorplasser på Majorstuen', 'Egne cellekontor i delt fellesskap. Alt inkludert, kort bindingstid.', 'coworking-1'],
  ['seed-o7', 'seed-landlord-1', 'offer', 'verksted', 'Stavanger', 'Forus', 'Luramyrveien 25', 350, 350, 32000, '2027-01-15', 36, ['port', 'lasterampe', 'parkering', 'høy takhøyde'], 'Verkstedhall med kontor på Forus', 'Hall med traverskran og to kjøreporter. Kontor og garderober i andre etasje.', 'workshop-1'],
  ['seed-o8', 'seed-landlord-2', 'offer', 'servering', 'Oslo', 'Frogner', 'Bygdøy allé 9', 160, 160, 45000, '2027-04-01', 60, ['kjøkken', 'uteservering', 'butikkvindu'], 'Restaurantlokale med uteservering', 'Ferdig innredet storkjøkken, 60 sitteplasser og bevilling kan overtas.', 'restaurant-1'],
  ['seed-o9', 'seed-landlord-3', 'offer', 'kontor', 'Bergen', 'Marineholmen', 'Thormøhlens gate 51', 150, 200, 30000, '2027-01-01', 36, ['parkering', 'møterom', 'heis', 'kantine'], 'Kontor ved Marineholmen forskningspark', 'Effektivt kontor nær universitetet. Ombygging etter leietakers ønske.', 'office-4'],
  ['seed-o10', 'seed-landlord-4', 'offer', 'kontor', 'Oslo', 'Skøyen', 'Karenslyst allé 9', 310, 310, 54000, '2027-02-01', 60, ['parkering', 'møterom', 'kantine', 'heis', 'fiber'], 'Helt etasje på Skøyen', 'Egen etasje med 30 arbeidsplasser, fire møterom og takterrasse. Fem minutter til toget.', 'office-3'],
  ['seed-o11', 'seed-landlord-4', 'offer', 'kontor', 'Oslo', 'Sentrum', 'Akersgata 18', 240, 240, 36000, '2027-02-15', 36, ['møterom', 'heis', 'resepsjon'], 'Klassisk byggård i Kvadraturen', 'Høye vinduer, eikeparkett og møterom med utsikt mot Akershus festning.', 'office-4'],
  ['seed-o12', 'seed-landlord-5', 'offer', 'lager', 'Drammen', 'Lierstranda', 'Lierstranda 90', 900, 900, 68000, '2027-01-01', 60, ['lasterampe', 'port', 'høy takhøyde', 'parkering'], 'Logistikklager ved E18', 'Tre porter med ramper, 9 meter fri høyde og stort uteareal for semitrailere.', 'warehouse-1'],
  ['seed-o13', 'seed-landlord-5', 'offer', 'kontorhotell', 'Bergen', 'Bryggen', 'Bryggen 15', 10, 30, 7500, '2026-12-01', 6, ['møterom', 'kjøkken', 'fiber', 'resepsjon'], 'Kontorplass på Bryggen', 'Faste plasser og cellekontor i fellesskap med 40 andre selskaper. Kaffe og møterom inkludert.', 'coworking-1'],
  ['seed-o14', 'seed-landlord-4', 'offer', 'butikk', 'Oslo', 'Grünerløkka', 'Markveien 35', 85, 85, 24000, '2027-01-01', 36, ['butikkvindu', 'lager'], 'Butikklokale i Markveien', 'Gateplan med store vinduer i populær handlegate. Lite lager bak.', 'retail-1'],
  ['seed-o15', 'seed-landlord-6', 'offer', 'kontor', 'Kristiansand', 'Kvadraturen', 'Markens gate 20', 130, 130, 17000, '2026-12-15', 36, ['møterom', 'heis', 'fiber'], 'Sentralt kontor i Markens gate', 'Lyse lokaler i tredje etasje med plass til 12. Felles møterom i bygget.', 'office-2'],
  ['seed-o16', 'seed-landlord-6', 'offer', 'verksted', 'Trondheim', 'Heimdal', 'Industriveien 12', 420, 420, 29000, '2027-03-01', 60, ['port', 'høy takhøyde', 'parkering'], 'Verksted med høy port på Heimdal', 'Romslig hall med 5 meter port, kontor og pauserom.', 'workshop-1'],
  ['seed-o17', 'seed-landlord-2', 'offer', 'kontor', 'Stavanger', 'Sentrum', 'Klubbgata 5', 200, 200, 31000, '2027-01-01', 36, ['møterom', 'heis', 'kantine', 'sykkelparkering'], 'Kontor midt i Stavanger sentrum', 'Moderne lokaler med kantine i bygget og kort vei til Breiavatnet.', 'office-1'],
  ['seed-o18', 'seed-landlord-5', 'offer', 'servering', 'Bergen', 'Sentrum', 'Vågsallmenningen 12', 120, 120, 39000, '2027-02-01', 60, ['kjøkken', 'uteservering'], 'Kafé med uteservering ved Torget', 'Kafélokale med ventilert kjøkken og 30 plasser ute om sommeren.', 'restaurant-1'],

  ['seed-n1', 'seed-tenant-1', 'need', 'kontor', 'Oslo', '', '', 150, 220, 30000, '2027-01-01', 36, ['parkering', 'møterom'], 'Teknologiselskap søker kontor i Oslo', 'Vi er 18 ansatte og vokser. Ønsker kontor sentralt med god kollektivdekning.', null],
  ['seed-n2', 'seed-tenant-2', 'need', 'lager', 'Oslo', '', '', 400, 700, 55000, '2027-02-01', 60, ['lasterampe', 'port'], 'Nettbutikk trenger lager nær E6', 'Vi trenger lager med lasterampe og plass til 300 pallplasser.', null],
  ['seed-n3', 'seed-tenant-3', 'need', 'butikk', 'Bergen', '', '', 100, 160, 38000, '2026-12-01', 36, ['butikkvindu'], 'Kaffebar søker gatelokale i Bergen sentrum', 'Lokale med god synlighet og mulighet for sitteplasser.', null],
  ['seed-n4', 'seed-tenant-1', 'need', 'kontorhotell', 'Oslo', '', '', 15, 40, 10000, '2026-11-01', 12, ['møterom', 'fiber'], 'Konsulentteam søker fleksible plasser', 'Tre konsulenter trenger egne kontorplasser med møterom.', null],
  ['seed-n5', 'seed-tenant-2', 'need', 'kontor', 'Trondheim', '', '', 200, 280, 45000, '2027-03-01', 60, ['parkering', 'kantine'], 'Ingeniørfirma flytter til Trondheim', 'Vi etablerer avdeling med 25 ansatte og ønsker moderne lokaler.', null],
  ['seed-n6', 'seed-tenant-4', 'need', 'kontor', 'Oslo', 'Skøyen', '', 280, 350, 60000, '2027-02-01', 60, ['parkering', 'kantine', 'møterom'], 'Regnskapsbyrå søker 30 plasser vest i Oslo', 'Vi er 28 og vil samle to kontorer. Nær tog er viktig.', null],
  ['seed-n7', 'seed-tenant-5', 'need', 'lager', 'Drammen', '', '', 700, 1200, 80000, '2027-03-01', 60, ['lasterampe', 'port', 'høy takhøyde'], 'Grossist trenger lager i Drammensregionen', 'Behov for 800–1000 m² lager med ramper, gjerne med litt kontor.', null],
  ['seed-n8', 'seed-tenant-6', 'need', 'servering', 'Oslo', 'Grünerløkka', '', 100, 180, 40000, '2027-04-01', 60, ['kjøkken', 'uteservering'], 'Restaurantgruppe søker lokale på Løkka', 'Vi åpner vårt tredje sted og ser etter lokale med kjøkken og uteservering.', null],
  ['seed-n9', 'seed-tenant-7', 'need', 'kontor', 'Stavanger', '', '', 120, 200, 28000, '2027-01-01', 36, ['møterom', 'sykkelparkering'], 'Energiselskap søker kontor i Stavanger', 'Oppstartsselskap med 12 ansatte. Ønsker sentrum eller Forus.', null],
  ['seed-n10', 'seed-tenant-8', 'need', 'verksted', 'Bergen', '', '', 250, 400, 30000, '2027-02-01', 36, ['port', 'parkering'], 'Bilpleie søker verksted i Bergen', 'Trenger hall med port og plass til fire biler inne.', null],
  ['seed-n11', 'seed-tenant-3', 'need', 'kontorhotell', 'Bergen', '', '', 10, 25, 8000, '2026-12-01', 6, ['fiber'], 'Frilanser-kollektiv søker plasser', 'Fem designere søker faste plasser i et fellesskap.', null],
];

const PROFILES: [string, string, string, string, string, string][] = [
  ['seed-landlord-1', 'Kari Nilsen', 'Fjordgården Eiendom', 'kari@fjordgarden.no', '+47 922 11 340', 'utleier'],
  ['seed-landlord-2', 'Ola Haugen', 'Groruddalen Næring', 'ola@grorudnaering.no', '+47 913 55 802', 'utleier'],
  ['seed-landlord-3', 'Per Aune', 'Nidaros Eiendom', 'per@nidaroseiendom.no', '+47 948 20 117', 'utleier'],
  ['seed-landlord-4', 'Hanne Strand', 'Vestkanten Næringsmegling', 'hanne@vestkanten.no', '+47 915 30 221', 'megler'],
  ['seed-landlord-5', 'Erik Moe', 'Lierstranda Eiendom', 'erik@lierstranda.no', '+47 902 77 410', 'utleier'],
  ['seed-landlord-6', 'Silje Ås', 'Sørlandsbygg AS', 'silje@sorlandsbygg.no', '+47 946 10 885', 'utleier'],
  ['seed-tenant-1', 'Martin Lie', 'Nordlys Tech AS', 'martin@nordlystech.no', '+47 901 44 210', 'leietaker'],
  ['seed-tenant-2', 'Sara Dahl', 'Hylle & Co', 'sara@hylle.no', '+47 977 03 556', 'leietaker'],
  ['seed-tenant-3', 'Jonas Vik', 'Bryggerist Kaffe', 'jonas@bryggerist.no', '+47 934 61 908', 'leietaker'],
  ['seed-tenant-4', 'Ingrid Holm', 'Holm & Berg Regnskap', 'ingrid@holmberg.no', '+47 928 40 112', 'leietaker'],
  ['seed-tenant-5', 'Anders Bakke', 'Bakke Engros', 'anders@bakkeengros.no', '+47 951 22 309', 'leietaker'],
  ['seed-tenant-6', 'Maria Solberg', 'Gatekjøkken Gruppen', 'maria@gatekjokken.no', '+47 993 18 740', 'leietaker'],
  ['seed-tenant-7', 'Thomas Eide', 'Vindkraft Vest AS', 'thomas@vindkraftvest.no', '+47 907 65 233', 'leietaker'],
  ['seed-tenant-8', 'Lene Fjeld', 'Blank Bilpleie', 'lene@blankbil.no', '+47 940 81 556', 'leietaker'],
];

// Weighted random choice for synthetic search behaviour.
function pick<T>(items: [T, number][], r: number): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [v, w] of items) if ((x -= w) < 0) return v;
  return items[0][0];
}
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

async function main() {
  if (process.argv.includes('--reset')) {
    await db.delete(events).where(like(events.id, 'seed-%'));
    await db.delete(posts).where(like(posts.id, 'seed-%'));
    await db.delete(profiles).where(like(profiles.user_id, 'seed-%'));
    console.log('Removed seed rows.');
  }

  const now = Date.now();
  await db
    .insert(profiles)
    .values(PROFILES.map(([user_id, name, company, email, phone, role]) => ({ user_id, name, company, email, phone, role, contact_ok: role === 'leietaker' })))
    .onConflictDoNothing();
  await db
    .insert(posts)
    .values(
      POSTS.map(([id, user_id, kind, space_type, city, district, address, size_min, size_max, price, available_from, lease_months, facilities, title, description, image], i) => ({
        id, user_id, kind, space_type, city, district, address, size_min, size_max, price, available_from, lease_months, facilities, title, description, image,
        company: PROFILES.find((p) => p[0] === user_id)?.[2] ?? '',
        contact_name: PROFILES.find((p) => p[0] === user_id)?.[1] ?? '',
        created_at: new Date(now - (i + 1) * 9 * 3600 * 1000),
      })),
    )
    .onConflictDoNothing();

  // ~30 days of synthetic searches and views from 60 anonymous visitors.
  const r = rng(42);
  const cities: [string | null, number][] = [['Oslo', 46], ['Bergen', 16], ['Trondheim', 9], ['Stavanger', 8], ['Drammen', 4], ['Kristiansand', 3], [null, 14]];
  const types: [string | null, number][] = [['kontor', 44], ['lager', 14], ['kontorhotell', 12], ['butikk', 10], ['servering', 6], ['verksted', 4], [null, 10]];
  const sizes: [string | null, number][] = [['0-100', 18], ['100-300', 34], ['300-600', 14], ['600-', 6], [null, 28]];
  const prices: [number | null, number][] = [[15000, 10], [30000, 22], [50000, 16], [100000, 6], [null, 46]];
  const offerIds = POSTS.filter((p) => p[2] === 'offer').map((p) => p[0]);
  const rows: (typeof events.$inferInsert)[] = [];
  for (let i = 0; i < 420; i++) {
    const anon = `seed-anon-${Math.floor(r() * 60)}`;
    const at = new Date(now - Math.pow(r(), 1.6) * 30 * 86400 * 1000);
    if (r() < 0.62) {
      const data: Record<string, unknown> = { mode: r() < 0.85 ? 'leie' : 'utleie' };
      const c = pick(cities, r()); if (c) data.city = c;
      const t = pick(types, r()); if (t) data.space_type = t;
      const s = pick(sizes, r()); if (s) data.size = s;
      const p = pick(prices, r()); if (p) data.max_price = p;
      if (Object.keys(data).length > 1) rows.push({ id: `seed-ev-${i}`, anon_id: anon, type: 'search', data, created_at: at });
    } else {
      rows.push({ id: `seed-ev-${i}`, anon_id: anon, type: 'view', post_id: offerIds[Math.floor(Math.pow(r(), 1.8) * offerIds.length)], created_at: at });
    }
  }
  await db.insert(events).values(rows).onConflictDoNothing();

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(posts);
  console.log(`Seeded. ${n} posts, ${rows.length} demand events.`);
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
