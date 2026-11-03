'use client';

import { Building2, Coins, MapPin, Ruler, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { cn } from '@/lib/cn';
import { CITIES, PRICE_LIMITS, SIZE_RANGES, SPACE_TYPES } from '@/lib/market/catalog';
import { formatNumber } from '@/lib/market/format';

type Key = 'by' | 'areal' | 'maks' | 'type' | 'q';

function Cell({ icon: Icon, label, name, value, options, onChange }: { icon: typeof MapPin; label: string; name: Key; value: string; options: { value: string; label: string }[]; onChange: (k: Key, v: string) => void }) {
  return (
    <label className="relative flex min-w-0 flex-1 basis-[45%] flex-col gap-1 px-4 py-3 sm:basis-0">
      <span className="flex items-center gap-1.5 text-[13px] text-muted">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className={cn('w-full cursor-pointer appearance-none truncate bg-transparent pr-5 text-[15px] font-semibold outline-none', !value && 'text-faint')}>
        <option value="">Alle</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute bottom-3.5 right-4 text-muted">▾</span>
    </label>
  );
}

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const mode = params.get('modus') === 'utleie' ? 'utleie' : 'leie';

  const set = (key: Key, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const any = ['by', 'areal', 'maks', 'type', 'q'].some((k) => params.get(k));

  return (
    <div className={cn('flex flex-col gap-3 transition-opacity', pending && 'opacity-70')}>
      <div className="flex flex-wrap divide-border rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(14,42,71,0.04)] sm:flex-nowrap sm:divide-x">
        <Cell icon={MapPin} label="Område/by" name="by" value={params.get('by') ?? ''} onChange={set} options={CITIES.map((c) => ({ value: c, label: c }))} />
        <Cell icon={Ruler} label="Areal i m²" name="areal" value={params.get('areal') ?? ''} onChange={set} options={SIZE_RANGES.map((s) => ({ value: s.id, label: s.label }))} />
        <Cell
          icon={Coins}
          label={mode === 'leie' ? 'Makspris' : 'Budsjett minst'}
          name="maks"
          value={params.get('maks') ?? ''}
          onChange={set}
          options={PRICE_LIMITS.map((p) => ({ value: String(p), label: `${formatNumber(p)} kr/mnd` }))}
        />
        <Cell icon={Building2} label="Lokaletype" name="type" value={params.get('type') ?? ''} onChange={set} options={SPACE_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          set('q', String(new FormData(e.currentTarget).get('q') ?? '').trim());
        }}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input name="q" defaultValue={params.get('q') ?? ''} placeholder="Søk i bydel, firma, fasiliteter …" className="field pl-10" />
        </div>
        {any ? (
          <button
            type="button"
            onClick={() => start(() => router.replace(mode === 'utleie' ? `${pathname}?modus=utleie` : pathname, { scroll: false }))}
            className="inline-flex h-[46px] items-center gap-1 rounded-xl px-3 text-sm font-medium text-muted hover:text-foreground">
            <X className="h-4 w-4" />
            Nullstill
          </button>
        ) : null}
      </form>
    </div>
  );
}
