'use client';

import { ImagePlus } from 'lucide-react';
import { useState } from 'react';

import { createPost, type FormState } from '@/app/actions';
import { useActionForm } from '@/hooks/use-action-form';
import { cn } from '@/lib/cn';
import { CITIES, DEFAULT_PHOTO, FACILITIES, LEASE_OPTIONS, PHOTO_KEYS, SPACE_TYPES, spaceTypeLabel } from '@/lib/market/catalog';
import { formatLease } from '@/lib/market/format';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Radio/checkbox chips: native inputs, so the form posts without client state. */
function Chips({ name, options, type = 'radio', defaultValue, onChange }: { name: string; options: { value: string; label: string }[]; type?: 'radio' | 'checkbox'; defaultValue?: string; onChange?: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type={type} name={name} value={o.value} defaultChecked={o.value === defaultValue} onChange={() => onChange?.(o.value)} className="peer sr-only" />
          <span className="block rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

function Input({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input className="field" {...props} />
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function NewPostForm({ initialKind, months }: { initialKind: 'need' | 'offer'; months: { iso: string; label: string }[] }) {
  const [kind, setKind] = useState(initialKind);
  const [spaceType, setSpaceType] = useState('kontor');
  const [city, setCity] = useState('Oslo');
  const [district, setDistrict] = useState('');
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, action, pending] = useActionForm<FormState>(createPost, undefined);
  const isOffer = kind === 'offer';
  const chosen = photoKey ?? DEFAULT_PHOTO[spaceType];
  const autoTitle = isOffer
    ? `${spaceTypeLabel(spaceType)}${district ? ` på ${district}` : ` i ${city}`}`
    : `Søker ${spaceTypeLabel(spaceType).toLowerCase()} i ${district || city}`;

  return (
    <form onSubmit={action} className="flex flex-col gap-7">
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-2 rounded-full border border-border bg-surface-2/70 p-1">
        {(
          [
            ['need', 'Jeg vil leie'],
            ['offer', 'Jeg vil leie ut'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={cn('rounded-full py-2.5 text-[15px] font-semibold transition', kind === k ? 'bg-accent text-white shadow-sm' : 'text-foreground')}>
            {label}
          </button>
        ))}
      </div>

      <Section title="Type lokale">
        <Chips name="space_type" defaultValue="kontor" onChange={setSpaceType} options={SPACE_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
      </Section>

      <Section title="Sted">
        <Chips name="city" defaultValue="Oslo" onChange={setCity} options={CITIES.map((c) => ({ value: c, label: c }))} />
        <Input label="Bydel eller område" name="district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={isOffer ? 'Grünerløkka' : 'Sentrum, Bjørvika eller Lysaker'} />
        {isOffer ? <Input label="Adresse" name="address" placeholder="Thorvald Meyers gate 12" hint="Vises på annonsen. Kan stå tom." /> : null}
      </Section>

      <Section title={isOffer ? 'Størrelse og pris' : 'Behov og budsjett'}>
        {isOffer ? (
          <Input label="Areal (m²)" name="size_min" inputMode="numeric" required placeholder="180" />
        ) : (
          <div className="flex gap-3">
            <Input label="Fra m²" name="size_min" inputMode="numeric" required placeholder="150" />
            <Input label="Til m²" name="size_max" inputMode="numeric" placeholder="220" />
          </div>
        )}
        <Input label={isOffer ? 'Månedsleie (kr)' : 'Maks månedsleie (kr)'} name="price" inputMode="numeric" required placeholder={isOffer ? '28 000' : '30 000'} />
      </Section>

      <Section title={isOffer ? 'Ledig fra' : 'Ønsket innflytting'}>
        <Chips name="available_from" defaultValue={months[1]?.iso} options={months.map((m) => ({ value: m.iso, label: m.label }))} />
      </Section>

      <Section title="Leietid">
        <Chips name="lease_months" defaultValue="36" options={LEASE_OPTIONS.map((m) => ({ value: String(m), label: formatLease(m) }))} />
      </Section>

      <Section title={isOffer ? 'Fasiliteter' : 'Må ha'}>
        <Chips name="facilities" type="checkbox" options={FACILITIES.map((f) => ({ value: f, label: f }))} />
      </Section>

      {isOffer ? (
        <Section title="Bilde">
          <input type="hidden" name="photo_key" value={chosen} />
          <div className="flex flex-wrap gap-2">
            <label className={cn('flex h-16 w-24 cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border-2 border-dashed text-xs text-muted transition hover:border-accent', preview ? 'border-accent' : 'border-border')}>
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5" />
                  Last opp
                </>
              )}
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPreview(f ? URL.createObjectURL(f) : null);
                }}
              />
            </label>
            {PHOTO_KEYS.map((key) => (
              <button key={key} type="button" onClick={() => setPhotoKey(key)} aria-label={`Velg bilde ${key}`} className={cn('overflow-hidden rounded-lg border-2 transition', !preview && chosen === key ? 'border-accent' : 'border-transparent opacity-80 hover:opacity-100')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/photos/${key}.jpg`} alt="" className="h-16 w-24 object-cover" />
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Last opp eget bilde (JPG, PNG eller WebP, maks 4 MB), eller velg et eksempelbilde.</p>
        </Section>
      ) : null}

      <Section title="Om annonsen">
        <Input label="Tittel" name="title" placeholder={autoTitle} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Beskrivelse</span>
          <textarea name="description" rows={4} className="field resize-y" placeholder={isOffer ? 'Lyst og åpent, nær T-bane, egen inngang …' : 'Vi er 14 ansatte og vokser. Trenger møterom og god kollektivdekning …'} />
        </label>
      </Section>

      <p className="text-sm text-muted">Annonsen er gratis og synlig for alle. Du kan pause eller slette den når som helst.</p>
      {state?.error ? <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p> : null}
      <button disabled={pending} className="h-13 rounded-full bg-accent py-3.5 text-[16px] font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
        {pending ? 'Publiserer …' : 'Publiser og finn matcher'}
      </button>
    </form>
  );
}
