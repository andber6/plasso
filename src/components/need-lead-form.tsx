'use client';

import { CheckCircle2, MailCheck } from 'lucide-react';

import { submitNeedLead, type LeadState } from '@/app/actions';
import { useActionForm } from '@/hooks/use-action-form';
import { CITIES, SPACE_TYPES } from '@/lib/market/catalog';

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      <input className="field py-2" {...props} />
    </label>
  );
}

/** "Fortell oss hva dere trenger": a need without creating an account first. */
export function NeedLeadForm({ months }: { months: { iso: string; label: string }[] }) {
  const [state, onSubmit, pending] = useActionForm<LeadState>(submitNeedLead, undefined);

  if (state?.ok) {
    const n = state.matches ?? 0;
    return (
      <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
        {state.emailSent ? <MailCheck className="h-10 w-10 text-accent" /> : <CheckCircle2 className="h-10 w-10 text-success" />}
        <p className="text-xl font-semibold">{state.emailSent ? 'Sjekk e-posten din' : 'Takk! Leieønsket er registrert'}</p>
        {n > 0 ? (
          <p className="text-[15px]">
            <strong>{n} {n === 1 ? 'lokale' : 'lokaler'}</strong> på Plasso kan allerede passe.
          </p>
        ) : null}
        <p className="text-sm text-muted">
          {state.emailSent
            ? 'Klikk på lenken vi sendte deg for å bekrefte. Da ser du matchene med begrunnelse, og vi sier fra når nye lokaler dukker opp.'
            : 'Vi ser på det og sier fra når vi finner lokaler som passer.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* Honeypot: hidden from people, filled in by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-medium">Type lokale</legend>
        <div className="flex flex-wrap gap-1.5">
          {SPACE_TYPES.map((t, i) => (
            <label key={t.id} className="cursor-pointer">
              <input type="radio" name="space_type" value={t.id} defaultChecked={i === 0} className="peer sr-only" />
              <span className="block rounded-full border border-border bg-surface px-3 py-1 text-[13px] transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30">
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[13px] font-medium">By</span>
          <select name="city" defaultValue="Oslo" className="field py-2">
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[13px] font-medium">Innflytting</span>
          <select name="available_from" defaultValue={months[2]?.iso} className="field py-2">
            {months.map((m) => (
              <option key={m.iso} value={m.iso}>
                {m.label}
              </option>
            ))}
            <option value="">Etter avtale</option>
          </select>
        </label>
      </div>

      <div className="flex gap-3">
        <Field label="Fra m²" name="size_min" inputMode="numeric" required placeholder="150" />
        <Field label="Til m²" name="size_max" inputMode="numeric" placeholder="250" />
        <Field label="Maks kr/mnd" name="price" inputMode="numeric" required placeholder="35 000" />
      </div>

      <div className="mt-1 border-t border-border pt-4">
        <p className="mb-3 text-[13px] font-medium text-muted">Hvem skal vi svare?</p>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Field label="Navn" name="name" required autoComplete="name" placeholder="Kari Nordmann" />
            <Field label="Firma" name="company" autoComplete="organization" placeholder="Valgfritt" />
          </div>
          <div className="flex gap-3">
            <Field label="E-post" name="email" type="email" required autoComplete="email" placeholder="kari@firma.no" />
            <Field label="Telefon" name="phone" type="tel" autoComplete="tel" placeholder="Valgfritt" />
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-[13px]">
        <input type="checkbox" name="contact_ok" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]" />
        <span className="text-muted">
          <strong className="font-semibold text-foreground">Plasso kan kontakte meg</strong> om lokaler som passer, også de som ikke ligger ute ennå.
        </span>
      </label>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button disabled={pending} className="h-12 rounded-full bg-accent font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
        {pending ? 'Sender …' : 'Finn lokaler som passer'}
      </button>
      <p className="text-center text-xs text-muted">
        Gratis og uforpliktende. Vi deler aldri kontaktinfoen din uten at du ber om det.{' '}
        <a href="/personvern" className="underline">
          Personvern
        </a>
      </p>
    </form>
  );
}
