import { Download, Mail } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { resolveReport } from '@/app/actions';
import { getUser, isAdmin } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { demandInsights } from '@/lib/insights';
import { ROLES, spaceTypeLabel } from '@/lib/market/catalog';
import { formatNumber, formatRelative, formatSize } from '@/lib/market/format';

export const metadata: Metadata = { title: 'Etterspørsel' };

function Stat({ value, label, hint }: { value: number; label: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-3xl font-bold tabular-nums">{formatNumber(value)}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
      {hint ? <p className="mt-1 font-mono text-[11px] text-faint">{hint}</p> : null}
    </div>
  );
}

function Card({ title, sub, children, className }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-4 rounded-[22px] border border-border bg-surface p-5', className)}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {sub ? <p className="text-sm text-muted">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Single-series ranked bars; the card title names the measure. */
function BarList({ rows, unit }: { rows: { key: string; value: number }[]; unit: string }) {
  if (!rows.length) return <p className="text-sm text-muted">Ingen data ennå.</p>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <li key={r.key} title={`${r.key}: ${r.value} ${unit}`} className="group grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 rounded-md py-0.5 text-sm hover:bg-surface-2/50">
          <span className="truncate">{r.key}</span>
          <span className="h-3.5 rounded-r-[4px] bg-accent/85 transition group-hover:bg-accent" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          <span className="text-right tabular-nums text-muted">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function SupplyTable({ rows, label }: { rows: { name: string; searches: number; needs: number; offers: number }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.searches));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-muted">
            <th className="pb-2 font-medium">{label}</th>
            <th className="pb-2 font-medium">Søk</th>
            <th className="pb-2 text-right font-medium">Leieønsker</th>
            <th className="pb-2 text-right font-medium">Lokaler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const gap = r.searches + r.needs * 5 > 0 && r.offers === 0;
            return (
              <tr key={r.name}>
                <td className="py-2 pr-3 font-medium">{r.name}</td>
                <td className="w-[40%] py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 rounded-r-[4px] bg-accent/85" style={{ width: `${Math.max(2, (r.searches / max) * 100)}%` }} />
                    <span className="tabular-nums text-muted">{r.searches}</span>
                  </div>
                </td>
                <td className="py-2 text-right tabular-nums">{r.needs}</td>
                <td className={cn('py-2 text-right tabular-nums', gap && 'font-semibold text-warning')}>{r.offers}{gap ? ' ⚠︎' : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const roleLabel = (id: string) => ROLES.find((r) => r.id === id)?.label ?? id;

export default async function AdminPage() {
  const u = await getUser();
  if (!isAdmin(u)) notFound();
  const d = await demandInsights(30);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">Kun for Plasso-teamet</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Etterspørsel</h1>
          <p className="mt-1 text-muted">Hva folk leter etter, hvor det mangler lokaler, og hvem som er klare til å flytte. Siste {d.days} dager.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/epost" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-medium hover:border-accent/40">
            <Mail className="h-4 w-4" /> E-postlogg
          </Link>
          <a href="/admin/leads.csv" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-white hover:bg-foreground/90">
            <Download className="h-4 w-4" /> Leads (CSV)
          </a>
        </div>
      </div>

      {d.hasSeed ? (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          Inneholder demodata (annonser og søk med id «seed-»). Fjern med <code className="font-mono">bun run db:seed --reset</code> før lansering.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat value={d.kpis.visitors} label="Besøkende" />
        <Stat value={d.kpis.searches} label="Søk" />
        <Stat value={d.kpis.signups} label="Nye kontoer" />
        <Stat value={d.kpis.needs} label="Aktive leieønsker" />
        <Stat value={d.kpis.offers} label="Aktive lokaler" />
        <Stat value={d.kpis.inquiries} label="Forespørsler" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Etterspørsel mot tilbud per by" sub="Søk fra leietakere, aktive leieønsker og ledige lokaler. ⚠︎ = etterspørsel uten tilbud.">
          <SupplyTable label="By" rows={d.cities.map((c) => ({ name: c.city, ...c }))} />
        </Card>
        <Card title="Etterspørsel mot tilbud per type" sub="Samme tall fordelt på type lokale.">
          <SupplyTable label="Type" rows={d.types.map((t) => ({ name: t.type, ...t }))} />
        </Card>
        <Card title="Størrelse folk søker etter" sub="Antall søk per arealfilter">
          <BarList rows={d.sizes} unit="søk" />
        </Card>
        <Card title="Budsjett folk søker med" sub="Antall søk per makspris">
          <BarList rows={d.budgets} unit="søk" />
        </Card>
      </div>

      <Card title={`Udekket etterspørsel (${d.unmet.length})`} sub="Aktive leieønsker der ingenting på Plasso når 70 % samsvar. Dette er leietakere vi kan hjelpe videre.">
        {d.unmet.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {d.unmet.map(({ need, best, owner }) => (
              <li key={need.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                <Link href={`/annonse/${need.id}`} className="min-w-0 flex-1 font-semibold hover:underline">
                  {need.title}
                </Link>
                <span className="text-muted">
                  {spaceTypeLabel(need.space_type)} · {need.city} · {formatSize(need)} m² · maks {formatNumber(need.price)} kr/mnd
                </span>
                <span className="font-mono text-xs text-muted">beste {best} %</span>
                {owner ? (
                  <span className={cn('text-xs', owner.contact_ok ? 'text-success' : 'text-faint')}>
                    {owner.name}
                    {owner.company ? `, ${owner.company}` : ''} {owner.contact_ok ? `· ${owner.email}` : '· ikke samtykket'}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Alle aktive leieønsker har minst ett godt treff.</p>
        )}
      </Card>

      <Card title={`Leads (${d.leads.length})`} sub="Alle med konto, sortert etter hvor aktive de er. Kontaktinfo vises bare for dem som har sagt ja til å bli kontaktet.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-muted">
                <th className="pb-2 font-medium">Hvem</th>
                <th className="pb-2 font-medium">Rolle</th>
                <th className="pb-2 font-medium">Ser etter</th>
                <th className="pb-2 text-right font-medium">Ønsker</th>
                <th className="pb-2 text-right font-medium">Lokaler</th>
                <th className="pb-2 text-right font-medium">Søk</th>
                <th className="pb-2 text-right font-medium">Visninger</th>
                <th className="pb-2 text-right font-medium">Kontakt</th>
                <th className="pb-2 text-right font-medium">Sist aktiv</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {d.leads.slice(0, 60).map((l) => (
                <tr key={l.profile.user_id} className="align-top">
                  <td className="py-2.5 pr-3">
                    <p className="font-semibold">{l.profile.name}</p>
                    <p className="text-xs text-muted">{l.profile.company}</p>
                    {l.profile.contact_ok ? (
                      <p className="text-xs text-success">
                        {l.profile.email}
                        {l.profile.phone ? ` · ${l.profile.phone}` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-faint">Ikke samtykket</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">{roleLabel(l.profile.role)}</td>
                  <td className="py-2.5 pr-3 text-muted">
                    {l.needs[0] ? `${spaceTypeLabel(l.needs[0].space_type)}, ${l.needs[0].city}, ${formatSize(l.needs[0])} m²` : [l.wantsType, l.wantsCity].filter(Boolean).join(', ') || '–'}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{l.needs.length}</td>
                  <td className="py-2.5 text-right tabular-nums">{l.offers.length}</td>
                  <td className="py-2.5 text-right tabular-nums">{l.searches}</td>
                  <td className="py-2.5 text-right tabular-nums">{l.views}</td>
                  <td className="py-2.5 text-right tabular-nums">{l.sent}</td>
                  <td className="py-2.5 text-right text-muted">{formatRelative(l.lastActive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Mest populære annonser" sub="Visninger, lagringer og forespørsler">
          {d.hottest.length ? (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {d.hottest.map((h) => (
                <li key={h.post.id} className="flex items-center gap-3 py-2.5">
                  <Link href={`/annonse/${h.post.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                    {h.post.title}
                  </Link>
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {h.views} vis · {h.saves} lagret · {h.inquiries} henv.
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Ingen data ennå.</p>
          )}
        </Card>
        <Card title="Fritekstsøk" sub="Hva folk skriver i søkefeltet">
          <BarList rows={d.queries} unit="søk" />
        </Card>
      </div>

      <Card title={`Rapporterte annonser (${d.openReports.length})`}>
        {d.openReports.length ? (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {d.openReports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <Link href={`/annonse/${r.post_id}`} className="min-w-0 flex-1 font-medium hover:underline">
                  {r.post?.title ?? 'Slettet annonse'}
                </Link>
                <span className="text-muted">{r.reason}</span>
                <form action={resolveReport.bind(null, r.id, false)}>
                  <button className="rounded-full border border-border px-3 py-1 hover:border-accent/40">Avvis</button>
                </form>
                <form action={resolveReport.bind(null, r.id, true)}>
                  <button className="rounded-full bg-danger px-3 py-1 text-white">Skjul annonsen</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Ingen åpne rapporter.</p>
        )}
      </Card>
    </div>
  );
}
