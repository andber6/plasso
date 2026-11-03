'use client';

import { completeProfile, type FormState } from '@/app/actions';
import { useActionForm } from '@/hooks/use-action-form';
import { ROLES } from '@/lib/market/catalog';

export function OnboardingForm({ next, defaultName }: { next: string; defaultName: string }) {
  const [state, onSubmit, pending] = useActionForm<FormState>(completeProfile, undefined);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Navn</span>
        <input name="name" required defaultValue={defaultName} autoComplete="name" placeholder="Kari Nordmann" className="field" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Firma</span>
        <input name="company" autoComplete="organization" placeholder="Valgfritt" className="field" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Telefon</span>
        <input name="phone" type="tel" autoComplete="tel" placeholder="Valgfritt, deles bare når du tar kontakt" className="field" />
      </label>
      <label className="flex items-start gap-3 rounded-xl bg-surface-2/70 p-3 text-sm">
        <input type="checkbox" name="contact_ok" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
        <span>
          <strong className="font-semibold">Plasso kan kontakte meg</strong>
          <span className="text-muted"> om lokaler eller leietakere som passer det jeg ser etter. Du kan skru det av når som helst.</span>
        </span>
      </label>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button disabled={pending} className="h-12 rounded-full bg-accent font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
        {pending ? 'Lagrer …' : 'Fortsett'}
      </button>
    </form>
  );
}
