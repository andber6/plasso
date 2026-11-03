import { getUser, isAdmin } from '@/lib/auth';
import { demandInsights } from '@/lib/insights';
import { spaceTypeLabel } from '@/lib/market/catalog';

function csv(v: unknown): string {
  let s = String(v ?? '');
  // Stop spreadsheet apps from running user-supplied values as formulas.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Opted-in leads only (contact_ok), for follow-up outside the app. */
export async function GET() {
  const u = await getUser();
  if (!isAdmin(u)) return new Response('Not found', { status: 404 });
  const d = await demandInsights(90);
  const header = ['navn', 'firma', 'e-post', 'telefon', 'rolle', 'leieønske', 'by', 'type', 'm2_min', 'm2_maks', 'maks_kr_mnd', 'innflytting', 'søk_90d', 'forespørsler', 'sist_aktiv'];
  const rows = d.leads
    .filter((l) => l.profile.contact_ok)
    .map((l) => {
      const n = l.needs[0];
      return [
        l.profile.name, l.profile.company, l.profile.email, l.profile.phone, l.profile.role,
        n?.title ?? '', n?.city ?? l.wantsCity ?? '', n ? spaceTypeLabel(n.space_type) : (l.wantsType ?? ''),
        n?.size_min ?? '', n?.size_max ?? '', n?.price ?? '', n?.available_from ?? '',
        l.searches, l.sent, l.lastActive.toISOString().slice(0, 10),
      ];
    });
  const body = '﻿' + [header, ...rows].map((r) => r.map(csv).join(',')).join('\n');
  return new Response(body, {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="plasso-leads-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
