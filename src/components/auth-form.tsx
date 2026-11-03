'use client';

import { useState } from 'react';

import { signIn, signUp, type FormState } from '@/app/actions';
import { useActionForm } from '@/hooks/use-action-form';
import { cn } from '@/lib/cn';
import { ROLES } from '@/lib/market/catalog';

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input className="field" {...props} />
    </label>
  );
}

export function AuthForm({ next, initial }: { next: string; initial: 'ny' | 'inn' }) {
  const [tab, setTab] = useState(initial);
  const [upState, upAction, upPending] = useActionForm<FormState>(signUp, undefined);
  const [inState, inAction, inPending] = useActionForm<FormState>(signIn, undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 rounded-full bg-surface-2 p-1 text-[15px] font-semibold">
        {(
          [
            ['ny', 'Ny konto'],
            ['inn', 'Logg inn'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cn('rounded-full py-2.5 transition', tab === k ? 'bg-surface shadow-sm' : 'text-muted')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'ny' ? (
        <form onSubmit={upAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Jeg er</legend>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r, i) => (
                <label key={r.id} className="cursor-pointer">
                  <input type="radio" name="role" value={r.id} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="block rounded-xl border border-border bg-surface py-2.5 text-center text-sm font-medium transition peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent">{r.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Navn" name="name" required autoComplete="name" placeholder="Kari Nordmann" />
          <Field label="Firma" name="company" autoComplete="organization" placeholder="Valgfritt" />
          <Field label="E-post" name="email" type="email" required autoComplete="email" placeholder="kari@firma.no" />
          <Field label="Telefon" name="phone" type="tel" autoComplete="tel" placeholder="Valgfritt, deles bare når du tar kontakt" />
          <Field label="Passord" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Minst 8 tegn" />
          <label className="flex items-start gap-3 rounded-xl bg-surface-2/70 p-3 text-sm">
            <input type="checkbox" name="contact_ok" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
            <span>
              <strong className="font-semibold">Plasso kan kontakte meg</strong>
              <span className="text-muted"> om lokaler eller leietakere som passer det jeg ser etter. Du kan skru det av når som helst.</span>
            </span>
          </label>
          {upState?.error ? <p className="text-sm text-danger">{upState.error}</p> : null}
          <button disabled={upPending} className="h-12 rounded-full bg-accent font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
            {upPending ? 'Oppretter …' : 'Opprett gratis konto'}
          </button>
          <p className="text-center text-xs text-muted">
            Ved å opprette konto godtar du{' '}
            <a href="/personvern" className="underline">
              personvernerklæringen
            </a>
            .
          </p>
        </form>
      ) : (
        <form onSubmit={inAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <Field label="E-post" name="email" type="email" required autoComplete="email" />
          <Field label="Passord" name="password" type="password" required autoComplete="current-password" />
          {inState?.error ? <p className="text-sm text-danger">{inState.error}</p> : null}
          <button disabled={inPending} className="h-12 rounded-full bg-accent font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
            {inPending ? 'Logger inn …' : 'Logg inn'}
          </button>
        </form>
      )}
    </div>
  );
}
